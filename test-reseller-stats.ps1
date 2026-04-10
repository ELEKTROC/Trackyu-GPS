# Test de l'API reseller stats
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyX3N1cGVyYWRtaW4iLCJlbWFpbCI6ImRnQHRyYWNreXVncHMuY29tIiwicm9sZSI6IlNVUEVSQURNSU4iLCJ0ZW5hbnRJZCI6InRlbmFudF9kZWZhdWx0IiwicGVybWlzc2lvbnMiOltdLCJpYXQiOjE3Mzg2NzYwNTQsImV4cCI6MTczODc2MjQ1NH0.Xe0QNFUh5Pl2H6lnPzGp9M9YOvxUy8ZuV7wRNmBhfMU"

Write-Host "`n=== Test API Reseller Stats (Staging) ===" -ForegroundColor Cyan
Write-Host "Endpoint: https://staging.trackyugps.com/api/resellers/stats/summary`n"

try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "https://staging.trackyugps.com/api/resellers/stats/summary" -Headers $headers -Method Get
    
    Write-Host "✅ Requête réussie !`n" -ForegroundColor Green
    Write-Host "=== SUMMARY ===" -ForegroundColor Yellow
    $response.summary | Format-List
    
    Write-Host "`n=== RESELLERS ===" -ForegroundColor Yellow
    $response.resellers | ForEach-Object {
        Write-Host "`n📊 $($_.resellerName)" -ForegroundColor Magenta
        Write-Host "   ID: $($_.resellerId)"
        Write-Host "   Tenant: $($_.tenantId)"
        Write-Host "   Status: $($_.status)"
        Write-Host "   Clients: $($_.clients.total) (actifs: $($_.clients.active))"
        Write-Host "   Véhicules: $($_.vehicles.total) (actifs: $($_.vehicles.active))"
        Write-Host "   MRR: $('{0:N0}' -f $_.mrr) FCFA"
    }
    
} catch {
    Write-Host "❌ Erreur: $_" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Message: $($_.Exception.Message)"
}

Write-Host "`n=== Production ===" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "https://trackyugps.com/api/resellers/stats/summary" -Headers $headers -Method Get
    
    Write-Host "✅ Production OK !`n" -ForegroundColor Green
    Write-Host "Total clients: $($response.summary.totalClients)"
    Write-Host "Total véhicules: $($response.summary.totalVehicles)"
    Write-Host "MRR total: $('{0:N0}' -f $response.summary.totalMRR) FCFA"
    
} catch {
    Write-Host "❌ Production Error: $_" -ForegroundColor Red
}
