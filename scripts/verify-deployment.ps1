# =============================================================================
# TRACKYU GPS - VÉRIFICATION POST-DÉPLOIEMENT
# =============================================================================
# Ce script vérifie que le code déployé est bien synchronisé entre :
# - Le code source local
# - Le dossier sur le serveur
# - L'image Docker en cours d'exécution
#
# Usage: .\scripts\verify-deployment.ps1
# =============================================================================

$VPS_IP = "148.230.126.62"
$SERVER = "root@$VPS_IP"

function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Err { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "   VÉRIFICATION DU DÉPLOIEMENT" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# 1. Vérifier la date de l'image Docker
Write-Info "1. Vérification de l'image Docker..."
$imageDate = ssh $SERVER "docker inspect trackyu-gps_backend:latest --format '{{.Created}}' 2>/dev/null | cut -d'T' -f1"
$today = Get-Date -Format "yyyy-MM-dd"
Write-Host "   Image créée le: $imageDate"
Write-Host "   Date actuelle:  $today"

if ($imageDate -eq $today) {
    Write-Success "Image Docker créée aujourd'hui"
} else {
    Write-Err "Image Docker obsolète! Exécutez: .\deploy.ps1 -backend"
}

# 2. Vérifier STAFF_TENANT_ID (bug critique précédent)
Write-Info ""
Write-Info "2. Vérification de tenantHelper.js..."

# Local
$localValue = Get-Content "backend\dist\utils\tenantHelper.js" | Select-String "STAFF_TENANT_ID = '"
Write-Host "   Local:     $localValue"

# Serveur (fichier)
$serverValue = ssh $SERVER "grep `"STAFF_TENANT_ID = '`" /var/www/trackyu-gps/backend/dist/utils/tenantHelper.js 2>/dev/null | head -1"
Write-Host "   Serveur:   $serverValue"

# Conteneur
$containerValue = ssh $SERVER "docker exec trackyu-gps_backend_1 grep `"STAFF_TENANT_ID = '`" /app/dist/utils/tenantHelper.js 2>/dev/null | head -1"
Write-Host "   Conteneur: $containerValue"

if ($localValue -eq $containerValue) {
    Write-Success "tenantHelper.js synchronisé"
} else {
    Write-Err "tenantHelper.js DÉSYNCHRONISÉ entre local et conteneur!"
}

# 3. Vérifier que le conteneur fonctionne
Write-Info ""
Write-Info "3. Vérification du conteneur backend..."
$status = ssh $SERVER "docker inspect trackyu-gps_backend_1 --format '{{.State.Status}}' 2>/dev/null"
Write-Host "   Status: $status"

if ($status -eq "running") {
    Write-Success "Conteneur en cours d'exécution"
} else {
    Write-Err "Conteneur non opérationnel!"
}

# 4. Test API rapide
Write-Info ""
Write-Info "4. Test API health check..."
$healthResponse = ssh $SERVER "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/health/db 2>/dev/null"
Write-Host "   HTTP Status: $healthResponse"

if ($healthResponse -eq "200") {
    Write-Success "API répond correctement"
} else {
    Write-Err "API ne répond pas correctement!"
}

# 5. Résumé
Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "   RÉSUMÉ" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

$allGood = ($imageDate -eq $today) -and ($localValue -eq $containerValue) -and ($status -eq "running") -and ($healthResponse -eq "200")

if ($allGood) {
    Write-Host ""
    Write-Success "Déploiement vérifié - Tout est synchronisé!"
    Write-Host ""
} else {
    Write-Host ""
    Write-Err "Des problèmes ont été détectés. Exécutez: .\deploy.ps1 -backend"
    Write-Host ""
}
