# API Tests Script
$API = "http://148.230.126.62:3001/api"

# Login
$body = '{"email":"pilote@trackyugps.com","password":"Pilote@123"}'
$auth = Invoke-RestMethod "$API/auth/login" -Method Post -Body $body -ContentType "application/json"
$h = @{ Authorization = "Bearer $($auth.token)" }
Write-Host "Logged in as: $($auth.user.name) ($($auth.user.role))"
Write-Host ""

# Tests
$results = @()

# Fleet
try {
    $r = Invoke-RestMethod "$API/fleet/vehicles" -Headers $h
    $results += "✅ Fleet Vehicles: $($r.Count)"
} catch { $results += "❌ Fleet Vehicles: FAILED" }

# Tickets
try {
    $r = Invoke-RestMethod "$API/tickets" -Headers $h
    $results += "✅ Support Tickets: $($r.Count)"
} catch { $results += "❌ Support Tickets: FAILED" }

# Leads
try {
    $r = Invoke-RestMethod "$API/leads" -Headers $h
    $results += "✅ CRM Leads: $($r.Count)"
} catch { $results += "❌ CRM Leads: FAILED" }

# Clients
try {
    $r = Invoke-RestMethod "$API/clients" -Headers $h
    $results += "✅ CRM Clients: $($r.Count)"
} catch { $results += "❌ CRM Clients: FAILED" }

# Invoices
try {
    $r = Invoke-RestMethod "$API/finance/invoices" -Headers $h
    $results += "✅ Finance Invoices: $($r.Count)"
} catch { $results += "❌ Finance Invoices: FAILED" }

# Contracts
try {
    $r = Invoke-RestMethod "$API/contracts" -Headers $h
    $results += "✅ Finance Contracts: $($r.Count)"
} catch { $results += "❌ Finance Contracts: FAILED" }

# Devices
try {
    $r = Invoke-RestMethod "$API/devices" -Headers $h
    $results += "✅ Tech Devices: $($r.Count)"
} catch { $results += "❌ Tech Devices: FAILED" }

# Users
try {
    $r = Invoke-RestMethod "$API/users" -Headers $h
    $results += "✅ Admin Users: $($r.Count)"
} catch { $results += "❌ Admin Users: FAILED" }

Write-Host "=== TESTS RESULTS ==="
$results | ForEach-Object { Write-Host $_ }

# Summary
$passed = ($results | Where-Object { $_ -like "✅*" }).Count
$total = $results.Count
Write-Host ""
Write-Host "=== SUMMARY: $passed/$total passed ==="
