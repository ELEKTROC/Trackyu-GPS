# =============================================================================
# TRACKYU GPS - SCRIPT DE DEPLOIEMENT PRODUCTION (v5.0)
# =============================================================================
# Usage: .\deploy.ps1 [-frontend] [-backend] [-all] [-nobuild] [-dryrun] [-full] [-force] [-verbose]
#
# Options:
#   -frontend  : Déployer uniquement le frontend
#   -backend   : Déployer uniquement le backend
#   -all       : Déployer frontend + backend (défaut)
#   -nobuild   : Déployer sans rebuilder (utilise le build existant)
#   -dryrun    : Afficher ce qui serait déployé sans exécuter
#   -full      : Inclure les .map ET les dossiers statiques (downloads, icons)
#   -force     : Forcer un déploiement complet (pas de delta)
#   -rebuild   : Forcer la reconstruction de l'image Docker backend
#   -migrate   : Exécuter les migrations SQL en attente après déploiement
#   -verbose   : Afficher les détails des commandes
#
# Architecture (v4.0) :
#   - Docker Compose v2 (plugin `docker compose`, pas `docker-compose` v1)
#   - Auto-sync package.json/package-lock.json vers le serveur
#   - Auto-rebuild image Docker si package.json a changé (nouvelles dépendances)
#   - Support PgBouncer, Redis pub/sub, API v1Router, PM2 cluster
#   - Support migrations SQL via -migrate
#
# Modes de déploiement frontend:
#   DELTA (défaut)  : Compare local vs serveur, n'uploade que les fichiers modifiés
#                     Typiquement 0.5-3 MB au lieu de 83 MB → ~10x plus rapide
#   COMPLET (-force): Archive complète tar.gz, remplace tout le dist
#
# Exclusions par défaut (sans -full):
#   - *.map           (source maps, ~16 MB)
#   - downloads/      (APK files, ~104 MB)
#   - icons restent car légers (~0.2 MB)
#
# Exemples:
#   .\deploy.ps1 -frontend              # Delta frontend (rapide, ~30s)
#   .\deploy.ps1 -frontend -force       # Full frontend (lent, ~3min)
#   .\deploy.ps1 -backend               # Backend uniquement
#   .\deploy.ps1 -backend -migrate      # Backend + migrations SQL
#   .\deploy.ps1 -backend -rebuild      # Backend + rebuild image Docker
#   .\deploy.ps1 -all -nobuild          # Tout redéployer sans build
#   .\deploy.ps1 -frontend -full -force # TOUT inclure (APK, .map, icons)
#   .\deploy.ps1 -dryrun               # Simulation
# =============================================================================

param(
    [switch]$frontend,
    [switch]$backend,
    [switch]$all,
    [switch]$nobuild,
    [switch]$dryrun,
    [switch]$full,
    [switch]$force,
    [switch]$rebuild,
    [switch]$migrate,
    [switch]$verbose,
    [switch]$staging  # Déployer en staging (sync depuis prod après build)
)

# ============= CONFIGURATION =============
$VPS_IP = "148.230.126.62"
$SERVER = "root@$VPS_IP"
$REMOTE_PATH = "/var/www/trackyu-gps"
$REMOTE_PATH_STAGING = "/var/www/trackyu-gps-staging"
$LOCAL_DIST = "c:\Users\ADMIN\Desktop\TRACKING\dist"
$LOCAL_BACKEND = "c:\Users\ADMIN\Desktop\TRACKING\backend\dist"
$LOCAL_BACKEND_ROOT = "c:\Users\ADMIN\Desktop\TRACKING\backend"
$LOCAL_MIGRATIONS = "$LOCAL_BACKEND_ROOT\migrations"
$SCRIPT_START = Get-Date
$MAX_RETRIES = 3
$DELTA_THRESHOLD = 25  # Au-delà, basculer automatiquement en mode complet

# Docker Compose v2 (plugin) — pas docker-compose v1 (bug ContainerConfig)
$DOCKER_COMPOSE = "docker compose"

# Options SSH robustes (timeouts augmentés vs v2)
$SSH_OPTS = @(
    "-o", "ConnectTimeout=30",
    "-o", "ServerAliveInterval=15",
    "-o", "ServerAliveCountMax=10"
)

# Dossiers statiques lourds exclus par défaut (sauf -full)
$STATIC_DIRS = @("downloads")

# ============= FONCTIONS UTILITAIRES =============
function Write-Success { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Info    { param($msg) Write-Host "  [..] $msg" -ForegroundColor Cyan }
function Write-Warn    { param($msg) Write-Host "  [!!] $msg" -ForegroundColor Yellow }
function Write-Err     { param($msg) Write-Host "  [XX] $msg" -ForegroundColor Red }
function Write-Detail  { param($msg) if ($verbose) { Write-Host "       $msg" -ForegroundColor DarkGray } }

function Get-ElapsedTime {
    $elapsed = (Get-Date) - $SCRIPT_START
    return "{0:mm\:ss}" -f $elapsed
}

function Format-Size {
    param([long]$bytes)
    if ($bytes -ge 1MB) { return "$([math]::Round($bytes / 1MB, 1)) MB" }
    if ($bytes -ge 1KB) { return "$([math]::Round($bytes / 1KB, 1)) KB" }
    return "$bytes B"
}

# SSH robuste
function Invoke-SSH {
    param([string]$Command)
    Write-Detail "SSH> $Command"
    $result = & ssh @SSH_OPTS $SERVER $Command 2>&1
    return $result
}

# SCP robuste avec retry et backoff progressif
function Send-FileToServer {
    param(
        [string]$LocalPath,
        [string]$RemotePath,
        [string]$Description,
        [switch]$AlreadyCompressed  # Ne pas utiliser -C pour les .tar.gz
    )

    $sizeLabel = Format-Size (Get-Item $LocalPath).Length
    Write-Info "Upload $Description ($sizeLabel)..."

    $scpArgs = @() + $SSH_OPTS
    # -C = compression SSH : utile pour fichiers texte, inutile pour .tar.gz
    if (-not $AlreadyCompressed) { $scpArgs += "-C" }

    for ($i = 1; $i -le $MAX_RETRIES; $i++) {
        Write-Detail "SCP tentative $i/$MAX_RETRIES"

        & scp @scpArgs $LocalPath "${SERVER}:${RemotePath}" 2>&1 | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Success "Upload OK"
            return $true
        }

        if ($i -lt $MAX_RETRIES) {
            $wait = $i * 5
            Write-Warn "Échec tentative $i - retry dans ${wait}s..."
            Start-Sleep -Seconds $wait
        }
    }

    Write-Err "Upload échoué après $MAX_RETRIES tentatives: $Description"
    return $false
}

# ============= INITIALISATION =============
if (-not $frontend -and -not $backend -and -not $all) { $all = $true }

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Magenta
Write-Host "   TRACKYU GPS - DEPLOIEMENT v5.0" -ForegroundColor Magenta
Write-Host "  ========================================" -ForegroundColor Magenta
Write-Host ""

$modeLabel = if ($force) { "COMPLET" } else { "DELTA" }
$mapLabel = if ($full) { "avec .map + APK" } else { "sans .map / sans APK" }
Write-Info "Mode: $modeLabel | $mapLabel"

if ($dryrun) { Write-Warn "MODE DRY-RUN - Aucune modification ne sera effectuée" }

# Test SSH
Write-Info "Test connexion SSH..."
$sshTest = Invoke-SSH "echo OK"
if ("$sshTest".Trim() -ne "OK") {
    Write-Err "Connexion SSH impossible vers $VPS_IP"
    Write-Err "Détail: $sshTest"
    exit 1
}
Write-Success "SSH OK"

# =============================================================================
# FRONTEND
# =============================================================================
if ($frontend -or $all) {
    Write-Host ""
    Write-Host "  --- FRONTEND ---" -ForegroundColor Yellow

    # --- Build ---
    if (-not $nobuild) {
        Write-Info "Build frontend..."
        Push-Location "c:\Users\ADMIN\Desktop\TRACKING"
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Build frontend échoué"
            Pop-Location
            exit 1
        }
        Pop-Location
        Write-Success "Build OK"
    } else {
        Write-Warn "Build ignoré (-nobuild)"
    }

    # Vérifier que le build existe
    if (-not (Test-Path "$LOCAL_DIST\index.html")) {
        Write-Err "dist/index.html introuvable - lancez d'abord un build"
        exit 1
    }

    # --- Inventaire local ---
    $localAssetFiles = Get-ChildItem -Path "$LOCAL_DIST\assets" -File
    $localRootFiles = Get-ChildItem -Path $LOCAL_DIST -File

    $jsFiles  = @($localAssetFiles | Where-Object { $_.Extension -eq ".js" })
    $cssFiles = @($localAssetFiles | Where-Object { $_.Extension -eq ".css" })
    $mapFiles = @($localAssetFiles | Where-Object { $_.Extension -eq ".map" })

    $jsSize  = Format-Size ($jsFiles  | Measure-Object -Property Length -Sum).Sum
    $mapSize = Format-Size ($mapFiles | Measure-Object -Property Length -Sum).Sum

    Write-Info "Local: $($jsFiles.Count) JS ($jsSize), $($cssFiles.Count) CSS, $($mapFiles.Count) MAP ($mapSize)"
    Write-Info "Root: $($localRootFiles.Count) fichiers ($(($localRootFiles | ForEach-Object {$_.Name}) -join ', '))"

    # Afficher les dossiers statiques
    foreach ($dir in $STATIC_DIRS) {
        $dirPath = Join-Path $LOCAL_DIST $dir
        if (Test-Path $dirPath) {
            $dirSize = Format-Size (Get-ChildItem $dirPath -Recurse -File | Measure-Object -Property Length -Sum).Sum
            $fileCount = (Get-ChildItem $dirPath -Recurse -File).Count
            if ($full) {
                Write-Info "Inclus: $dir/ ($fileCount fichiers, $dirSize)"
            } else {
                Write-Detail "Exclu: $dir/ ($fileCount fichiers, $dirSize) - utilisez -full pour inclure"
            }
        }
    }

    if ($dryrun) {
        Write-Warn "[DRY-RUN] Frontend non déployé"
    } else {
        # --- Décider du mode de déploiement ---
        $useDelta = -not $force

        if ($useDelta) {
            # === ANALYSE DELTA ===
            Write-Info "Analyse delta..."

            # Lister les assets sur le serveur
            $remoteRaw = Invoke-SSH "ls -1 $REMOTE_PATH/dist/assets/ 2>/dev/null"
            $remoteAssets = @()
            if ($remoteRaw) {
                $remoteAssets = @($remoteRaw -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
            }
            Write-Detail "Assets serveur: $($remoteAssets.Count) fichiers"

            # Fichiers locaux à comparer (exclure .map sauf si -full)
            $localAssetsToCompare = $localAssetFiles
            if (-not $full) {
                $localAssetsToCompare = @($localAssetsToCompare | Where-Object { $_.Extension -ne ".map" })
            }
            $localAssetNames = @($localAssetsToCompare | ForEach-Object { $_.Name })

            # Calcul du diff (noms Vite hashés = même nom → même contenu)
            $toUpload = @($localAssetNames | Where-Object { $_ -notin $remoteAssets })
            $toDelete = @($remoteAssets | Where-Object { $_ -notin $localAssetNames })

            # Ne pas supprimer les .map du serveur si on n'envoie pas les .map
            if (-not $full) {
                $toDelete = @($toDelete | Where-Object { -not $_.EndsWith(".map") })
            }

            # Calculer la taille des fichiers à uploader
            $uploadBytes = 0
            foreach ($f in $toUpload) {
                $fPath = Join-Path "$LOCAL_DIST\assets" $f
                if (Test-Path $fPath) { $uploadBytes += (Get-Item $fPath).Length }
            }
            $uploadSize = Format-Size $uploadBytes

            Write-Info "Delta: $($toUpload.Count) nouveaux ($uploadSize), $($toDelete.Count) obsolètes"

            if ($verbose) {
                $toUpload | ForEach-Object { Write-Detail "  + $_" }
                $toDelete | ForEach-Object { Write-Detail "  - $_" }
            }

            # Basculer en full si trop de changements ou premier déploiement
            if ($remoteAssets.Count -eq 0) {
                Write-Warn "Aucun asset sur le serveur - bascule en mode complet"
                $useDelta = $false
            } elseif ($toUpload.Count -gt $DELTA_THRESHOLD) {
                Write-Warn "$($toUpload.Count) fichiers > seuil ($DELTA_THRESHOLD) - bascule en mode complet"
                $useDelta = $false
            }
        }

        if ($useDelta) {
            # =============================================================
            # DELTA DEPLOY
            # =============================================================

            # 1. Upload des nouveaux assets
            if ($toUpload.Count -gt 0) {
                $tempDelta = Join-Path $env:TEMP "trackyu_delta_$PID"
                Remove-Item $tempDelta -Recurse -Force -ErrorAction SilentlyContinue
                New-Item -ItemType Directory -Force -Path $tempDelta | Out-Null

                foreach ($file in $toUpload) {
                    Copy-Item (Join-Path "$LOCAL_DIST\assets" $file) $tempDelta
                }

                $deltaTar = Join-Path $env:TEMP "trackyu-delta.tar.gz"
                Remove-Item $deltaTar -Force -ErrorAction SilentlyContinue

                Push-Location $tempDelta
                & "$env:SystemRoot\System32\tar.exe" -czf $deltaTar * 2>&1 | Out-Null
                Pop-Location

                Remove-Item $tempDelta -Recurse -Force -ErrorAction SilentlyContinue

                if (-not (Test-Path $deltaTar)) {
                    Write-Err "Création archive delta échouée"
                    exit 1
                }

                $deltaTarSize = Format-Size (Get-Item $deltaTar).Length
                Write-Info "Archive delta: $deltaTarSize ($($toUpload.Count) fichiers)"

                $ok = Send-FileToServer -LocalPath $deltaTar -RemotePath "/tmp/delta-dist.tar.gz" -Description "delta assets" -AlreadyCompressed
                if (-not $ok) {
                    Remove-Item $deltaTar -Force -ErrorAction SilentlyContinue
                    exit 1
                }

                # Extraire sur le serveur (dans assets/, sans écraser les fichiers existants)
                $extractResult = Invoke-SSH "cd $REMOTE_PATH/dist/assets && tar -xzf /tmp/delta-dist.tar.gz && rm -f /tmp/delta-dist.tar.gz && echo DELTA_OK"
                if ("$extractResult" -notlike "*DELTA_OK*") {
                    Write-Err "Extraction delta échouée: $extractResult"
                    Remove-Item $deltaTar -Force -ErrorAction SilentlyContinue
                    exit 1
                }

                Remove-Item $deltaTar -Force -ErrorAction SilentlyContinue
                Write-Success "$($toUpload.Count) nouveaux assets uploadés"
            } else {
                Write-Success "Assets à jour - aucun upload nécessaire"
            }

            # 2. Upload fichiers root (index.html en DERNIER = bascule atomique)
            Write-Info "Upload fichiers root..."
            $rootNonIndex = @($localRootFiles | Where-Object { $_.Name -ne "index.html" })
            $rootIndex = @($localRootFiles | Where-Object { $_.Name -eq "index.html" })

            foreach ($f in $rootNonIndex) {
                Send-FileToServer -LocalPath $f.FullName -RemotePath "$REMOTE_PATH/dist/$($f.Name)" -Description $f.Name | Out-Null
            }

            # index.html en dernier (les nouveaux assets sont déjà en place → zéro downtime)
            foreach ($f in $rootIndex) {
                $ok = Send-FileToServer -LocalPath $f.FullName -RemotePath "$REMOTE_PATH/dist/$($f.Name)" -Description "index.html (switch)"
                if (-not $ok) {
                    Write-Err "Upload index.html échoué - CRITIQUE"
                    exit 1
                }
            }

            # 3. Supprimer les anciens assets
            if ($toDelete.Count -gt 0) {
                Write-Info "Nettoyage de $($toDelete.Count) anciens fichiers..."
                $deleteList = ($toDelete | ForEach-Object { "'$REMOTE_PATH/dist/assets/$_'" }) -join " "
                Invoke-SSH "rm -f $deleteList" | Out-Null
                Write-Success "Anciens fichiers supprimés"
            }

            # 4. Permissions
            Invoke-SSH "chmod -R 755 $REMOTE_PATH/dist/" | Out-Null

            # 5. Vérification
            $remoteIndex = Invoke-SSH "test -f $REMOTE_PATH/dist/index.html && echo YES || echo NO"
            if ("$remoteIndex".Trim() -ne "YES") {
                Write-Err "index.html manquant après deploy!"
                exit 1
            }

            $finalCount = Invoke-SSH "ls $REMOTE_PATH/dist/assets/*.js 2>/dev/null | wc -l"
            Write-Success "Frontend déployé (DELTA) - $("$finalCount".Trim()) JS sur serveur [$(Get-ElapsedTime)]"

        } else {
            # =============================================================
            # FULL DEPLOY (-force ou fallback automatique)
            # =============================================================
            Write-Info "Déploiement complet..."

            $tarPath = Join-Path $env:TEMP "trackyu-full-dist.tar.gz"
            Remove-Item $tarPath -Force -ErrorAction SilentlyContinue

            # Construire les exclusions tar
            $tarExcludes = @()
            if (-not $full) {
                $tarExcludes += "--exclude=*.map"
                foreach ($dir in $STATIC_DIRS) {
                    $tarExcludes += "--exclude=$dir"
                }
            }

            Push-Location $LOCAL_DIST
            & "$env:SystemRoot\System32\tar.exe" -czf $tarPath @tarExcludes * 2>&1 | Out-Null
            Pop-Location

            if (-not (Test-Path $tarPath)) {
                Write-Err "Création archive échouée"
                exit 1
            }

            $tarSize = Format-Size (Get-Item $tarPath).Length
            $localTarBytes = (Get-Item $tarPath).Length
            Write-Info "Archive: $tarSize"

            # Upload (sans -C car déjà compressé)
            $ok = Send-FileToServer -LocalPath $tarPath -RemotePath "/tmp/frontend-dist.tar.gz" -Description "archive complète" -AlreadyCompressed
            if (-not $ok) {
                Remove-Item $tarPath -Force -ErrorAction SilentlyContinue
                exit 1
            }

            # Vérifier intégrité (taille)
            $remoteBytes = Invoke-SSH "stat -c%s /tmp/frontend-dist.tar.gz 2>/dev/null || echo 0"
            $remoteBytes = "$remoteBytes".Trim()

            if ([long]$remoteBytes -ne $localTarBytes) {
                Write-Err "Archive corrompue! Local=$localTarBytes bytes, Serveur=$remoteBytes bytes"
                Invoke-SSH "rm -f /tmp/frontend-dist.tar.gz"
                Remove-Item $tarPath -Force -ErrorAction SilentlyContinue
                exit 1
            }
            Write-Success "Archive intègre ($tarSize)"

            # Extraire (nettoyer assets, garder downloads/icons intacts)
            Write-Info "Extraction sur le serveur..."
            Invoke-SSH "rm -rf $REMOTE_PATH/dist/assets/*"
            $extractResult = Invoke-SSH "cd $REMOTE_PATH/dist && tar -xzf /tmp/frontend-dist.tar.gz && rm -f /tmp/frontend-dist.tar.gz && echo FULL_OK"

            if ("$extractResult" -notlike "*FULL_OK*") {
                Write-Err "Extraction échouée: $extractResult"
                Remove-Item $tarPath -Force -ErrorAction SilentlyContinue
                exit 1
            }

            # Permissions
            Invoke-SSH "chmod -R 755 $REMOTE_PATH/dist/ && chown -R root:root $REMOTE_PATH/dist/"

            Remove-Item $tarPath -Force -ErrorAction SilentlyContinue

            # Vérification
            $expectedJsCount = $jsFiles.Count
            $remoteJsCount = Invoke-SSH "ls $REMOTE_PATH/dist/assets/*.js 2>/dev/null | wc -l"
            $remoteJsCount = "$remoteJsCount".Trim()

            if ([int]$remoteJsCount -ne $expectedJsCount) {
                Write-Err "JS manquants! Attendu=$expectedJsCount, Serveur=$remoteJsCount"
                exit 1
            }

            $indexCheck = Invoke-SSH "test -f $REMOTE_PATH/dist/index.html && echo YES || echo NO"
            if ("$indexCheck".Trim() -ne "YES") {
                Write-Err "index.html manquant!"
                exit 1
            }

            Write-Success "Frontend déployé (COMPLET) - $remoteJsCount JS [$(Get-ElapsedTime)]"
        }

        # Sync vers staging si demandé
        if ($staging) {
            Write-Info "Sync prod → staging..."
            $syncResult = Invoke-SSH "rsync -a --delete $REMOTE_PATH/dist/ $REMOTE_PATH_STAGING/dist/ && echo SYNC_OK"
            if ("$syncResult" -notlike "*SYNC_OK*") {
                Write-Err "Sync staging échoué: $syncResult"
            } else {
                Write-Success "Staging synchronisé [$REMOTE_PATH_STAGING]"
            }
        }
    }
}

# =============================================================================
# BACKEND
# =============================================================================
if ($backend -or $all) {
    Write-Host ""
    Write-Host "  --- BACKEND ---" -ForegroundColor Yellow

    # Build
    if (-not $nobuild) {
        Write-Info "Build backend..."
        Push-Location "c:\Users\ADMIN\Desktop\TRACKING\backend"
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Build backend échoué"
            Pop-Location
            exit 1
        }
        Pop-Location
        Write-Success "Build OK"
    } else {
        Write-Warn "Build ignoré (-nobuild)"
    }

    # Vérifier le build
    if (-not (Test-Path "$LOCAL_BACKEND\index.js")) {
        Write-Err "backend/dist/index.js introuvable"
        exit 1
    }

    $backendFileCount = (Get-ChildItem -Path $LOCAL_BACKEND -Recurse -File).Count
    Write-Info "Fichiers: $backendFileCount"

    if ($dryrun) {
        Write-Warn "[DRY-RUN] Backend non déployé"
    } else {
        # === SYNC PACKAGE.JSON (détection nouvelles dépendances) ===
        Write-Info "Sync package.json vers le serveur..."
        $localPkgHash = (Get-FileHash "$LOCAL_BACKEND_ROOT\package.json" -Algorithm MD5).Hash
        $remotePkgHash = Invoke-SSH "md5sum $REMOTE_PATH/backend/package.json 2>/dev/null | awk '{print `$1}'"
        $remotePkgHash = "$remotePkgHash".Trim().ToUpper()

        $pkgChanged = ($localPkgHash -ne $remotePkgHash)
        if ($pkgChanged) {
            Write-Warn "package.json modifié — upload + rebuild image Docker nécessaire"
        } else {
            Write-Detail "package.json inchangé"
        }

        # Upload package.json + package-lock.json
        & scp @SSH_OPTS "$LOCAL_BACKEND_ROOT\package.json" "$LOCAL_BACKEND_ROOT\package-lock.json" "${SERVER}:${REMOTE_PATH}/backend/" 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Upload package.json échoué — tentative alternative..."
            Send-FileToServer -LocalPath "$LOCAL_BACKEND_ROOT\package.json" -RemotePath "$REMOTE_PATH/backend/package.json" -Description "package.json" | Out-Null
            Send-FileToServer -LocalPath "$LOCAL_BACKEND_ROOT\package-lock.json" -RemotePath "$REMOTE_PATH/backend/package-lock.json" -Description "package-lock.json" | Out-Null
        } else {
            Write-Success "package.json synchronisé"
        }

        # === UPLOAD BACKEND DIST ===
        # Archive
        $tarPath = Join-Path $env:TEMP "trackyu-backend.tar.gz"
        Remove-Item $tarPath -Force -ErrorAction SilentlyContinue

        Push-Location $LOCAL_BACKEND
        & "$env:SystemRoot\System32\tar.exe" -czf $tarPath * 2>&1 | Out-Null
        Pop-Location

        if (-not (Test-Path $tarPath)) {
            Write-Err "Création archive backend échouée"
            exit 1
        }

        $tarSize = Format-Size (Get-Item $tarPath).Length
        Write-Info "Archive: $tarSize"

        $ok = Send-FileToServer -LocalPath $tarPath -RemotePath "/tmp/backend-dist.tar.gz" -Description "backend" -AlreadyCompressed
        if (-not $ok) {
            Remove-Item $tarPath -Force -ErrorAction SilentlyContinue
            exit 1
        }

        # Nettoyer et extraire
        Invoke-SSH "rm -rf $REMOTE_PATH/backend/dist/*"
        $extractResult = Invoke-SSH "cd $REMOTE_PATH/backend/dist && tar -xzf /tmp/backend-dist.tar.gz && rm -f /tmp/backend-dist.tar.gz && echo BACK_OK"

        if ("$extractResult" -notlike "*BACK_OK*") {
            Write-Err "Extraction backend échouée: $extractResult"
            Remove-Item $tarPath -Force -ErrorAction SilentlyContinue
            exit 1
        }

        Remove-Item $tarPath -Force -ErrorAction SilentlyContinue
        Write-Success "Backend extrait"

        # === UPLOAD MIGRATIONS SI PRÉSENTES ===
        if (Test-Path $LOCAL_MIGRATIONS) {
            $migrationFiles = Get-ChildItem -Path $LOCAL_MIGRATIONS -Filter "*.sql" -File
            if ($migrationFiles.Count -gt 0) {
                Write-Info "Upload $($migrationFiles.Count) fichiers de migration..."
                Invoke-SSH "mkdir -p $REMOTE_PATH/backend/migrations"
                foreach ($mig in $migrationFiles) {
                    & scp @SSH_OPTS $mig.FullName "${SERVER}:${REMOTE_PATH}/backend/migrations/" 2>&1 | Out-Null
                }
                Write-Success "Migrations synchronisées"
            }
        }

        # === REBUILD OU RESTART ===
        $needsRebuild = $rebuild -or $pkgChanged

        if ($needsRebuild) {
            if ($pkgChanged -and -not $rebuild) {
                Write-Info "Auto-rebuild (package.json modifié)..."
            } else {
                Write-Info "Rebuild Docker (-rebuild)..."
            }
            # Docker Compose v2 (pas docker-compose v1 = bug ContainerConfig)
            Invoke-SSH "cd $REMOTE_PATH && docker compose build backend 2>&1 | tail -5"
            Write-Info "Recréation container..."
            $recreateResult = Invoke-SSH "cd $REMOTE_PATH && docker compose up -d backend 2>&1 | tail -5"
            Write-Detail "$recreateResult"
            Write-Success "Backend reconstruit et redémarré"
        } else {
            Write-Info "Restart container..."
            # Trouver le nom du container (v1 = _, v2 = -)
            $container = Invoke-SSH "docker ps --format '{{.Names}}' | grep backend | grep -v staging | head -1"
            $container = "$container".Trim()

            if ($container) {
                Write-Detail "Container trouvé: $container"
                Invoke-SSH "docker cp $REMOTE_PATH/backend/dist/. ${container}:/app/dist/"
                Invoke-SSH "docker restart $container"
                Write-Success "Container $container redémarré"
            } else {
                Write-Warn "Container non trouvé — recréation via docker compose..."
                Invoke-SSH "cd $REMOTE_PATH && docker compose up -d backend 2>&1 | tail -5"
                Write-Success "Backend recréé"
            }
        }

        # === MIGRATIONS SQL (-migrate) ===
        if ($migrate) {
            Write-Host ""
            Write-Host "  --- MIGRATIONS ---" -ForegroundColor Yellow
            # Trouver le container postgres (v1 = _, v2 = -)
            $pgContainer = Invoke-SSH "docker ps --format '{{.Names}}' | grep postgres | grep -v staging | head -1"
            $pgContainer = "$pgContainer".Trim()

            if (-not $pgContainer) {
                Write-Err "Container PostgreSQL non trouvé"
            } else {
                Write-Info "Exécution des migrations sur $pgContainer..."
                $migFiles = Invoke-SSH "ls -1 $REMOTE_PATH/backend/migrations/*.sql 2>/dev/null | sort"
                if ($migFiles) {
                    $migList = @($migFiles -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
                    foreach ($mig in $migList) {
                        $migName = Split-Path $mig -Leaf
                        Write-Info "  → $migName"
                        $migResult = Invoke-SSH "cat $mig | docker exec -i $pgContainer psql -U fleet_user -d fleet_db 2>&1"
                        if ("$migResult" -like "*ERROR*") {
                            Write-Warn "    Migration avec erreurs: $migResult"
                        } else {
                            Write-Success "  $migName OK"
                        }
                    }
                } else {
                    Write-Info "Aucune migration trouvée"
                }
            }
        }

        # === HEALTH CHECK (avec retry) ===
        Write-Info "Health check..."
        $healthOk = $false
        for ($attempt = 1; $attempt -le 4; $attempt++) {
            $waitTime = $attempt * 5
            Write-Detail "Attente ${waitTime}s (tentative $attempt/4)..."
            Start-Sleep -Seconds $waitTime

            $health = Invoke-SSH "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/health 2>/dev/null || echo 000"
            $health = "$health".Trim()

            if ($health -eq "200") {
                Write-Success "Backend opérationnel (HTTP 200)"
                $healthOk = $true
                break
            }
            Write-Detail "HTTP $health — retry..."
        }

        if (-not $healthOk) {
            Write-Err "Backend ne répond pas après 4 tentatives (HTTP $health)"
            $container = Invoke-SSH "docker ps --format '{{.Names}}' | grep backend | grep -v staging | head -1"
            $container = "$container".Trim()
            if ($container) {
                $logs = Invoke-SSH "docker logs $container --tail 20 2>&1"
                Write-Host $logs -ForegroundColor DarkGray
            }
            Write-Err "Vérifier: ssh root@$VPS_IP `"docker logs $container --tail 30`""
        }

        Write-Success "Backend déployé [$(Get-ElapsedTime)]"
    }
}

# =============================================================================
# RÉSUMÉ
# =============================================================================
Write-Host ""
Write-Host "  ========================================" -ForegroundColor Green
Write-Host "   DEPLOIEMENT TERMINE - $(Get-ElapsedTime)" -ForegroundColor Green
Write-Host "  ========================================" -ForegroundColor Green
Write-Host ""

if (-not $dryrun -and ($frontend -or $all)) {
    Write-Success "https://trackyugps.com"
}

Write-Host ""
Write-Host "  Commandes:" -ForegroundColor Yellow
Write-Host "    .\deploy.ps1 -frontend              # Delta (rapide)" -ForegroundColor DarkGray
Write-Host "    .\deploy.ps1 -frontend -force        # Complet" -ForegroundColor DarkGray
Write-Host "    .\deploy.ps1 -backend                # Backend seul" -ForegroundColor DarkGray
Write-Host "    .\deploy.ps1 -backend -migrate       # Backend + migrations SQL" -ForegroundColor DarkGray
Write-Host "    .\deploy.ps1 -backend -rebuild       # Backend + rebuild image Docker" -ForegroundColor DarkGray
Write-Host "    .\deploy.ps1 -all -nobuild           # Redeploy sans build" -ForegroundColor DarkGray
Write-Host "    .\deploy.ps1 -frontend -full -force  # Tout inclure (APK, .map)" -ForegroundColor DarkGray
Write-Host "    .\deploy.ps1 -dryrun                 # Simulation" -ForegroundColor DarkGray
Write-Host ""

