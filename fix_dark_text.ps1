$files = @(
    "features\admin\components\panels\StaffPanelV2.tsx",
    "features\admin\components\panels\AuditLogsPanelV2.tsx",
    "features\admin\components\panels\DeviceConfigPanelV2.tsx",
    "features\admin\components\RoleManagerV2.tsx",
    "features\admin\components\DocumentTemplatesPanelV2.tsx",
    "features\admin\components\WebhooksPanelV2.tsx",
    "features\admin\components\forms\ResellerFormV2.tsx",
    "features\admin\components\panels\ResellersPanelV2.tsx",
    "features\support\components\SupportSettingsPanel.tsx",
    "features\tech\components\TechView.tsx",
    "features\finance\components\BudgetView.tsx",
    "features\finance\components\FinanceView.tsx",
    "features\crm\components\SubscriptionsView.tsx",
    "features\crm\components\TierDetailModal.tsx",
    "features\crm\components\CRMView.tsx",
    "features\crm\components\ContractsView.tsx",
    "features\crm\components\CatalogList.tsx",
    "features\tech\components\partials\InterventionTechTab.tsx",
    "features\tech\components\partials\InterventionVehicleTab.tsx",
    "features\tech\components\partials\InterventionRequestTab.tsx",
    "features\tech\components\TechStats.tsx",
    "features\tech\components\InterventionList.tsx",
    "features\finance\components\RecoveryView.tsx",
    "features\finance\components\SendDocumentModal.tsx",
    "features\finance\components\SupplierInvoicesView.tsx",
    "features\settings\components\CreateTicketModal.tsx",
    "features\reports\components\ReportFilterBar.tsx",
    "features\reports\components\ReportTable.tsx",
    "features\stock\components\partials\StockModals.tsx",
    "features\map\components\ReplayControlPanel.tsx",
    "features\settings\components\MyAccountView.tsx",
    "features\settings\components\MyOperationsView.tsx"
)

$root = "c:\Users\ADMIN\Desktop\TRACKING"
$totalFixes = 0
$fixedFiles = 0

foreach ($f in $files) {
    $path = Join-Path $root $f
    if (-not (Test-Path $path)) {
        Write-Host "SKIP $f"
        continue
    }
    
    $content = [System.IO.File]::ReadAllText($path)
    $fileFixCount = 0
    
    $newContent = [regex]::Replace($content, '(className="[^"]*dark:bg-slate-\d{3}[^"]*?)(")', {
        param($m)
        $cls = $m.Groups[1].Value
        if ($cls -notmatch 'dark:text-') {
            $script:fileFixCount++
            return $cls + ' dark:text-white' + $m.Groups[2].Value
        }
        return $m.Value
    })
    
    if ($content -ne $newContent) {
        [System.IO.File]::WriteAllText($path, $newContent)
        Write-Host "FIXED $f ($fileFixCount adds)"
        $totalFixes += $fileFixCount
        $fixedFiles++
    } else {
        Write-Host "OK    $f (no change)"
    }
}

Write-Host ""
Write-Host "TOTAL: $totalFixes dark:text-white added across $fixedFiles files"
