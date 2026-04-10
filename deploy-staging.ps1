# Script de déploiement staging avec gestion permissions
param(
    [switch]$frontend,
    [switch]$backend,
    [switch]$all
)

$ErrorActionPreference = "Stop"

if (-not ($frontend -or $backend -or $all)) {
    Write-Host "Usage: .\deploy-staging.ps1 [-frontend] [-backend] [-all]" -ForegroundColor Yellow
    exit 1
}

if ($frontend -or $all) {
    Write-Host "`n🔨 Build frontend..." -ForegroundColor Cyan
    npm run build
    
    Write-Host "📤 Upload vers staging..." -ForegroundColor Cyan
    scp -r dist/assets root@148.230.126.62:/var/www/trackyu-gps-staging/dist/
    scp dist/*.html root@148.230.126.62:/var/www/trackyu-gps-staging/dist/
    
    Write-Host "🔐 Correction permissions..." -ForegroundColor Cyan
    ssh root@148.230.126.62 "chmod -R 755 /var/www/trackyu-gps-staging/dist/"
    
    Write-Host "✅ Frontend staging déployé!" -ForegroundColor Green
}

if ($backend -or $all) {
    Write-Host "`n🔨 Build backend..." -ForegroundColor Cyan
    cd backend
    npm run build
    cd ..
    
    Write-Host "📤 Upload backend..." -ForegroundColor Cyan
    scp -r backend/dist/* root@148.230.126.62:/var/www/trackyu-gps/backend/dist/
    
    Write-Host "🔄 Restart staging backend..." -ForegroundColor Cyan
    ssh root@148.230.126.62 "docker restart staging_backend"
    
    Write-Host "✅ Backend staging déployé!" -ForegroundColor Green
}

Write-Host "`n🎉 Déploiement terminé - Testez sur https://staging.trackyugps.com" -ForegroundColor Green
