param([switch]$nobuild, [switch]$dryrun)
$ErrorActionPreference = "Stop"

$SERVER      = "root@148.230.126.62"
$SSH_OPTS    = @("-o","StrictHostKeyChecking=no","-o","ConnectTimeout=15")
$LOCAL_V2    = "C:\Users\ADMIN\Desktop\trackyu-front-V2"
$LOCAL_DIST  = "$LOCAL_V2\dist"
$REMOTE_PATH = "/var/www/trackyu-v2"

function Invoke-SSH($cmd) {
    $r = & ssh @SSH_OPTS $SERVER $cmd 2>&1
    return "$r"
}

Write-Host "--- Test connexion VPS" -ForegroundColor Cyan
$t = Invoke-SSH "echo OK"
if ($t.Trim() -ne "OK") { throw "VPS inaccessible: $t" }
Write-Host "    VPS OK" -ForegroundColor Green

# Build
if (-not $nobuild) {
    Write-Host "--- Build V2" -ForegroundColor Cyan
    Push-Location $LOCAL_V2
    if (-not $dryrun) {
        npm run build 2>&1 | Select-Object -Last 5
        if ($LASTEXITCODE -ne 0) { throw "Build echoue" }
    }
    Pop-Location
    Write-Host "    Build OK" -ForegroundColor Green
}

if (-not (Test-Path "$LOCAL_DIST\index.html")) {
    throw "dist/index.html introuvable - lancez npm run build dans trackyu-front-V2/"
}

# Preparer repertoire VPS
Write-Host "--- Preparer $REMOTE_PATH sur VPS" -ForegroundColor Cyan
if (-not $dryrun) {
    Invoke-SSH "mkdir -p $REMOTE_PATH/dist" | Out-Null
}
Write-Host "    OK" -ForegroundColor Green

# nginx.conf V2
Write-Host "--- Deployer nginx_v2.conf" -ForegroundColor Cyan
$nginxConf = @'
server {
    listen 80;
    server_name localhost;
    gzip on; gzip_vary on; gzip_proxied any; gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript image/svg+xml;
    root /usr/share/nginx/html;
    index index.html;
    location ~* \.(js|css|woff2?|ttf|eot|png|jpg|jpeg|gif|svg|ico)$ {
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
}
'@

if (-not $dryrun) {
    $tmpConf = [IO.Path]::GetTempFileName() + ".conf"
    [IO.File]::WriteAllText($tmpConf, $nginxConf, [Text.Encoding]::UTF8)
    & scp @SSH_OPTS $tmpConf ($SERVER + ":" + $REMOTE_PATH + "/nginx_v2.conf") 2>&1 | Out-Null
    Remove-Item $tmpConf -Force
}
Write-Host "    nginx_v2.conf deploye" -ForegroundColor Green

# docker-compose.yml
Write-Host "--- Deployer docker-compose.yml V2" -ForegroundColor Cyan
$dc = @'
services:
  frontend-v2:
    image: nginx:alpine
    restart: always
    container_name: trackyu-v2-frontend
    ports:
      - "8082:80"
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./nginx_v2.conf:/etc/nginx/conf.d/default.conf:ro
'@

if (-not $dryrun) {
    $tmpDC = [IO.Path]::GetTempFileName() + ".yml"
    [IO.File]::WriteAllText($tmpDC, $dc, [Text.Encoding]::UTF8)
    & scp @SSH_OPTS $tmpDC ($SERVER + ":" + $REMOTE_PATH + "/docker-compose.yml") 2>&1 | Out-Null
    Remove-Item $tmpDC -Force
}
Write-Host "    docker-compose.yml deploye" -ForegroundColor Green

# Upload dist/
Write-Host "--- Upload dist/ (tar.gz)" -ForegroundColor Cyan
$tarPath = [IO.Path]::GetTempFileName() + ".tar.gz"

if (-not $dryrun) {
    Push-Location $LOCAL_DIST
    & tar -czf $tarPath . 2>&1 | Out-Null
    Pop-Location

    $sizeMB = [math]::Round((Get-Item $tarPath).Length / 1MB, 1)
    Write-Host "    Archive: $sizeMB MB" -ForegroundColor Yellow

    & scp @SSH_OPTS $tarPath ($SERVER + ":/tmp/v2-dist.tar.gz") 2>&1 | Out-Null
    Remove-Item $tarPath -Force

    $ext = Invoke-SSH "rm -rf $REMOTE_PATH/dist/* && tar -xzf /tmp/v2-dist.tar.gz -C $REMOTE_PATH/dist && rm -f /tmp/v2-dist.tar.gz && chmod -R 755 $REMOTE_PATH/dist && echo EXTRACT_OK"
    if ($ext -notlike "*EXTRACT_OK*") { throw "Extraction echouee: $ext" }
}
Write-Host "    dist/ uploade OK" -ForegroundColor Green

# Demarrer container
Write-Host "--- Demarrer container V2 (port 8082)" -ForegroundColor Cyan
if (-not $dryrun) {
    $up = Invoke-SSH "cd $REMOTE_PATH && docker compose up -d 2>&1 && echo COMPOSE_OK"
    if ($up -notlike "*COMPOSE_OK*") { throw "docker compose up echoue: $up" }

    Start-Sleep -Seconds 4
    $http = Invoke-SSH "curl -s -o /dev/null -w '%{http_code}' http://localhost:8082/ 2>/dev/null"
    if ($http.Trim() -eq "200") {
        Write-Host "    Container V2 repond HTTP 200 sur port 8082" -ForegroundColor Green
    } else {
        Write-Host "    WARN: HTTP $http - verifiez: docker logs trackyu-v2-frontend" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== V2 deploye ! ===" -ForegroundColor Cyan
Write-Host "    live.trackyugps.com  -> port 8082 (V2 app)" -ForegroundColor Green
Write-Host "    trackyugps.com       -> port 8082 + redirect / -> /landing" -ForegroundColor Green
if ($dryrun) { Write-Host "    [DRYRUN - aucune action executee]" -ForegroundColor Magenta }
