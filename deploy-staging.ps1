# =============================================================================
# TRACKYU GPS - SCRIPT DE DEPLOIEMENT STAGING (frontend uniquement)
# =============================================================================
# Usage: .\deploy-staging.ps1 [-nobuild] [-dryrun] [-verbose]
#
# Note architecture : il n'existe pas de backend staging séparé.
# staging.trackyugps.com pointe sur le même backend prod (port 3001).
# Ce script déploie uniquement le frontend vers /var/www/trackyu-gps-staging/dist/
#
# Exemples:
#   .\deploy-staging.ps1              # Build + deploy staging
#   .\deploy-staging.ps1 -nobuild     # Deploy sans rebuild (utilise dist/ existant)
#   .\deploy-staging.ps1 -dryrun      # Simulation sans aucune modification
# =============================================================================

param(
    [switch]$nobuild,
    [switch]$dryrun,
    [switch]$verbose
)

$VPS_IP        = "148.230.126.62"
$SERVER        = "root@$VPS_IP"
$REMOTE_PATH   = "/var/www/trackyu-gps-staging"
$LOCAL_DIST    = "c:\Users\ADMIN\Desktop\TRACKING\dist"
$SCRIPT_START  = Get-Date

$SSH_OPTS = @(
    "-o", "ConnectTimeout=30",
    "-o", "ServerAliveInterval=15",
    "-o", "ServerAliveCountMax=10"
)

function Write-Success { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Info    { param($msg) Write-Host "  [..] $msg" -ForegroundColor Cyan }
function Write-Warn    { param($msg) Write-Host "  [!!] $msg" -ForegroundColor Yellow }
function Write-Err     { param($msg) Write-Host "  [XX] $msg" -ForegroundColor Red }
function Write-Detail  { param($msg) if ($verbose) { Write-Host "       $msg" -ForegroundColor DarkGray } }

function Get-ElapsedTime {
    $elapsed = (Get-Date) - $SCRIPT_START
    return "{0:mm\:ss}" -f $elapsed
}

function Invoke-SSH {
    param([string]$Command)
    Write-Detail "SSH> $Command"
    $result = & ssh @SSH_OPTS $SERVER $Command 2>&1
    return $result
}

Write-Host ""
Write-Host "  ==========================================" -ForegroundColor Magenta
Write-Host "   TRACKYU GPS - DEPLOIEMENT STAGING" -ForegroundColor Magenta
Write-Host "  ==========================================" -ForegroundColor Magenta
Write-Host ""

if ($dryrun) { Write-Warn "MODE DRY-RUN - Aucune modification ne sera effectuée" }

# Test SSH
Write-Info "Test connexion SSH..."
$sshTest = & ssh @SSH_OPTS $SERVER "echo OK" 2>&1
if ("$sshTest".Trim() -ne "OK") {
    Write-Err "Connexion SSH impossible vers $VPS_IP : $sshTest"
    exit 1
}
Write-Success "SSH OK"

# Build
if (-not $nobuild) {
    Write-Info "Build frontend..."
    Push-Location "c:\Users\ADMIN\Desktop\TRACKING"
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Build échoué"
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

if ($dryrun) {
    Write-Warn "[DRY-RUN] Déploiement staging non effectué"
    Write-Host ""
    Write-Host "  Cible : $SERVER`:$REMOTE_PATH/dist/" -ForegroundColor DarkGray
    exit 0
}

# Upload assets
Write-Info "Upload assets vers staging..."
$assetTar = Join-Path $env:TEMP "trackyu-staging-assets.tar.gz"
Remove-Item $assetTar -Force -ErrorAction SilentlyContinue

Push-Location "$LOCAL_DIST\assets"
& "$env:SystemRoot\System32\tar.exe" -czf $assetTar --exclude="*.map" * 2>&1 | Out-Null
Pop-Location

if (-not (Test-Path $assetTar)) {
    Write-Err "Création archive assets échouée"
    exit 1
}

$assetSize = [math]::Round((Get-Item $assetTar).Length / 1MB, 1)
Write-Info "Archive assets : $assetSize MB (sans .map)"

& scp @SSH_OPTS -C $assetTar "${SERVER}:/tmp/staging-assets.tar.gz" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Err "Upload assets échoué"
    Remove-Item $assetTar -Force -ErrorAction SilentlyContinue
    exit 1
}
Remove-Item $assetTar -Force -ErrorAction SilentlyContinue

$extractResult = Invoke-SSH "rm -rf $REMOTE_PATH/dist/assets/* && cd $REMOTE_PATH/dist/assets && tar -xzf /tmp/staging-assets.tar.gz && rm -f /tmp/staging-assets.tar.gz && echo ASSETS_OK"
if ("$extractResult" -notlike "*ASSETS_OK*") {
    Write-Err "Extraction assets échouée : $extractResult"
    exit 1
}
Write-Success "Assets extraits"

# Upload fichiers root (index.html en dernier)
Write-Info "Upload fichiers root..."
$rootFiles = Get-ChildItem -Path $LOCAL_DIST -File
$rootNonIndex = @($rootFiles | Where-Object { $_.Name -ne "index.html" })
$rootIndex    = @($rootFiles | Where-Object { $_.Name -eq "index.html" })

foreach ($f in $rootNonIndex) {
    & scp @SSH_OPTS -C $f.FullName "${SERVER}:${REMOTE_PATH}/dist/$($f.Name)" 2>&1 | Out-Null
    Write-Detail "Uploadé : $($f.Name)"
}

# index.html en dernier (bascule atomique)
foreach ($f in $rootIndex) {
    & scp @SSH_OPTS -C $f.FullName "${SERVER}:${REMOTE_PATH}/dist/$($f.Name)" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Upload index.html échoué — CRITIQUE"
        exit 1
    }
    Write-Detail "Uploadé : index.html (switch)"
}

# Permissions
Invoke-SSH "chmod -R 755 $REMOTE_PATH/dist/" | Out-Null

# Vérification
$check = Invoke-SSH "test -f $REMOTE_PATH/dist/index.html && echo YES || echo NO"
if ("$check".Trim() -ne "YES") {
    Write-Err "index.html manquant après déploiement"
    exit 1
}

$jsCount = Invoke-SSH "ls $REMOTE_PATH/dist/assets/*.js 2>/dev/null | wc -l"
Write-Success "Staging déployé — $("$jsCount".Trim()) JS [$(Get-ElapsedTime)]"

Write-Host ""
Write-Host "  ==========================================" -ForegroundColor Green
Write-Host "   STAGING OK - $(Get-ElapsedTime)" -ForegroundColor Green
Write-Host "  ==========================================" -ForegroundColor Green
Write-Host ""
Write-Success "https://staging.trackyugps.com"
Write-Host ""
Write-Warn "Backend staging = backend prod (port 3001) — pas de conteneur séparé."
Write-Warn "Pour déployer en prod après validation : .\deploy.ps1 -frontend"
Write-Host ""
