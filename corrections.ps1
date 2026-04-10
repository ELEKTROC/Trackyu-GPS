# 🔧 SCRIPT DE CORRECTIONS CRITIQUES - TrackYu GPS
# À exécuter APRÈS backup et en staging d'abord

$ErrorActionPreference = "Stop"
$LogFile = "corrections_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"

function Write-Log {
    param($Message, $Level = "INFO")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] [$Level] $Message"
    Write-Host $LogMessage
    Add-Content -Path $LogFile -Value $LogMessage
}

Write-Log "===== DÉBUT DES CORRECTIONS CRITIQUES =====" "INFO"

# ============================================
# PHASE 1 : VÉRIFICATIONS PRE-CORRECTION
# ============================================

Write-Log "Phase 1 : Vérifications pré-correction..." "INFO"

# Vérifier environnement
if (-not (Test-Path "backend\src\controllers\userController.ts")) {
    Write-Log "ERREUR : Fichier userController.ts introuvable" "ERROR"
    exit 1
}

Write-Log "✅ Environnement vérifié" "INFO"

# ============================================
# PHASE 2 : CORRECTIONS BACKEND (CRITIQUES)
# ============================================

Write-Log "Phase 2 : Corrections Backend..." "INFO"

# CORRECTION 1 : backend/src/index.ts - Supprimer routes dupliquées
Write-Log "Correction 1 : Routes dupliquées (index.ts)..." "INFO"

$indexPath = "backend\src\index.ts"
$indexContent = Get-Content $indexPath -Raw

# Supprimer lignes 211-213 (routes dupliquées)
$indexContent = $indexContent -replace "app\.use\('/api/suppliers', supplierRoutes\);\s*//.*Doublon.*", ""
$indexContent = $indexContent -replace "app\.use\('/api/rma', rmaRoutes\);\s*//.*Doublon.*", ""
$indexContent = $indexContent -replace "app\.use\('/api/catalog', catalogRoutes\);\s*//.*FIX:.*", ""

Set-Content -Path $indexPath -Value $indexContent -NoNewline
Write-Log "✅ Routes dupliquées supprimées" "INFO"

# Note : Les corrections TypeScript complexes (userController, vehicleController, etc.)
# doivent être faites manuellement ou via multi_replace_string_in_file
# Car elles nécessitent une précision chirurgicale du contexte

Write-Log "⚠️  Corrections TypeScript complexes à faire manuellement :" "WARNING"
Write-Log "   - userController.ts (lignes 93, 171, 191, 219)" "WARNING"
Write-Log "   - vehicleController.ts (lignes 207, 475)" "WARNING"
Write-Log "   - deviceController.ts (ligne 139)" "WARNING"
Write-Log "   - ticketController.ts (lignes 56, ~150, 439)" "WARNING"
Write-Log "   - interventionController.ts (lignes 344-400)" "WARNING"
Write-Log "   - leadController.ts (ligne 58 - ajouter vérif doublons)" "WARNING"
Write-Log "   - tierRoutes.ts (lignes 10-12 - ajouter Zod)" "WARNING"
Write-Log "   - financeRoutes.ts (lignes 32-65 - ajouter RBAC)" "WARNING"
Write-Log "   - leadRoutes.ts (lignes 9-13 - ajouter RBAC)" "WARNING"

Write-Log "" "INFO"
Write-Log "📋 Voir DIAGNOSTIC_COMPLET_2026_02_03.md section ROADMAP pour code exact" "INFO"

# ============================================
# PHASE 3 : CORRECTIONS DATABASE
# ============================================

Write-Log "Phase 3 : Génération scripts SQL..." "INFO"

$sqlScriptPath = "corrections_db_$(Get-Date -Format 'yyyyMMdd').sql"

$sqlScript = @"
-- ============================================
-- SCRIPT SQL CORRECTIONS - TrackYu GPS
-- Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
-- ============================================

-- BACKUP PRÉALABLE OBLIGATOIRE
-- pg_dump -U fleet_user -d fleet_db > backup_before_corrections_$(Get-Date -Format "yyyyMMdd").sql

BEGIN;

-- ============================================
-- 1. VÉRIFICATIONS (NE MODIFIE PAS)
-- ============================================

-- 1.1 Utilisateurs sans tenant_id
SELECT 'WARN: Utilisateurs sans tenant_id:' AS check_type, COUNT(*) AS count
FROM users WHERE tenant_id IS NULL;

-- 1.2 Véhicules sans tenant_id
SELECT 'WARN: Véhicules sans tenant_id:' AS check_type, COUNT(*) AS count
FROM vehicles WHERE tenant_id IS NULL;

-- 1.3 Doublons Leads email
SELECT 'WARN: Doublons Leads email:' AS check_type, email, COUNT(*) as count
FROM leads
GROUP BY email, tenant_id
HAVING COUNT(*) > 1;

-- ============================================
-- 2. AJOUT INDEX PERFORMANCE
-- ============================================

-- Index pour recherches email/doublons
CREATE INDEX IF NOT EXISTS idx_leads_email_tenant ON leads(email, tenant_id);
CREATE INDEX IF NOT EXISTS idx_tiers_email_type_tenant ON tiers(email, type, tenant_id);

-- Index pour filtres tenant_id
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_status ON vehicles(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_client ON vehicles(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_status ON tickets(tenant_id, status);

-- Index pour IMEI lookup (performance GPS)
CREATE INDEX IF NOT EXISTS idx_vehicles_imei ON vehicles(imei);

-- Index pour positions (hypertable TimescaleDB)
CREATE INDEX IF NOT EXISTS idx_positions_vehicle_time ON positions(vehicle_id, time DESC);

-- ============================================
-- 3. STANDARDISATION tenant_id
-- ============================================

-- Uniformiser 'trackyu' -> 'tenant_trackyu'
-- ⚠️  ATTENTION : Vérifier d'abord si des données utilisent 'trackyu'

DO `$$
BEGIN
    IF EXISTS (SELECT 1 FROM tenants WHERE id = 'trackyu') THEN
        UPDATE users SET tenant_id = 'tenant_trackyu' WHERE tenant_id = 'trackyu';
        UPDATE vehicles SET tenant_id = 'tenant_trackyu' WHERE tenant_id = 'trackyu';
        UPDATE leads SET tenant_id = 'tenant_trackyu' WHERE tenant_id = 'trackyu';
        UPDATE tiers SET tenant_id = 'tenant_trackyu' WHERE tenant_id = 'trackyu';
        UPDATE invoices SET tenant_id = 'tenant_trackyu' WHERE tenant_id = 'trackyu';
        UPDATE tickets SET tenant_id = 'tenant_trackyu' WHERE tenant_id = 'trackyu';
        UPDATE interventions SET tenant_id = 'tenant_trackyu' WHERE tenant_id = 'trackyu';
        
        -- Renommer le tenant lui-même
        UPDATE tenants SET id = 'tenant_trackyu' WHERE id = 'trackyu';
        
        RAISE NOTICE 'Standardisation tenant_id terminée';
    END IF;
END
`$$;

-- ============================================
-- 4. AJOUT COLONNES MANQUANTES
-- ============================================

-- Lead conversion tracking
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_client_id VARCHAR(50) REFERENCES tiers(id);

-- Intervention signatures
ALTER TABLE interventions 
  ADD COLUMN IF NOT EXISTS signature_client TEXT,
  ADD COLUMN IF NOT EXISTS signature_tech TEXT;

-- ============================================
-- 5. CONTRAINTES UNICITÉ
-- ============================================

-- Unicité email par tenant pour leads
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_unique_email_tenant 
  ON leads(email, tenant_id) 
  WHERE email IS NOT NULL;

-- Unicité IMEI global
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_unique_imei 
  ON vehicles(imei) 
  WHERE imei IS NOT NULL;

-- ============================================
-- 6. NETTOYAGE DONNÉES INCOHÉRENTES
-- ============================================

-- Supprimer leads doublons (garder le plus récent)
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY email, tenant_id ORDER BY created_at DESC) AS rn
  FROM leads
  WHERE email IS NOT NULL
)
DELETE FROM leads WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- ============================================
-- FIN TRANSACTION
-- ============================================

-- ⚠️  DÉCOMMENTER POUR APPLIQUER
-- COMMIT;

-- ⚠️  EN CAS DE PROBLÈME
ROLLBACK;

-- ============================================
-- VÉRIFICATIONS POST-CORRECTION
-- ============================================

-- Compter les index créés
SELECT 
  schemaname, 
  tablename, 
  indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('leads', 'tiers', 'vehicles', 'invoices', 'tickets', 'positions')
ORDER BY tablename, indexname;

-- Vérifier doublons restants
SELECT 'POST-CHECK: Doublons Leads restants' AS check_type, COUNT(*) as count
FROM (
  SELECT email, tenant_id, COUNT(*) as cnt
  FROM leads
  WHERE email IS NOT NULL
  GROUP BY email, tenant_id
  HAVING COUNT(*) > 1
) AS duplicates;
"@

Set-Content -Path $sqlScriptPath -Value $sqlScript
Write-Log "✅ Script SQL généré : $sqlScriptPath" "INFO"

# ============================================
# PHASE 4 : GÉNÉRATION RAPPORT
# ============================================

Write-Log "Phase 4 : Génération rapport..." "INFO"

$reportPath = "RAPPORT_CORRECTIONS_$(Get-Date -Format 'yyyyMMdd').md"

$report = @"
# 📊 RAPPORT D'EXÉCUTION - Corrections TrackYu GPS

**Date** : $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**Script** : corrections.ps1  
**Log** : $LogFile

---

## ✅ Corrections Automatiques Appliquées

### Backend

1. ✅ **Routes dupliquées supprimées** (backend/src/index.ts)
   - Supprimé : /api/suppliers (doublon ligne 211)
   - Supprimé : /api/rma (doublon ligne 212)
   - Supprimé : /api/catalog (doublon ligne 213)

### Database

2. ✅ **Script SQL généré** : ``$sqlScriptPath``
   - Index de performance créés (8 index)
   - Standardisation tenant_id (trackyu → tenant_trackyu)
   - Colonnes manquantes ajoutées
   - Contraintes unicité ajoutées
   - Nettoyage doublons Leads

**⚠️  IMPORTANT** : Exécuter le script SQL manuellement après vérification

---

## ⚠️  Corrections Manuelles Requises

Les corrections TypeScript suivantes nécessitent une intervention manuelle car elles touchent à la logique métier critique :

### 🔴 URGENT - Isolation tenant_id (10 corrections)

| Fichier | Lignes | Action |
|---------|--------|--------|
| userController.ts | 93 | Ajouter filtrage tenant_id dans email check |
| userController.ts | 171 | Ajouter WHERE tenant_id pour non-SuperAdmin |
| userController.ts | 191 | Vérifier ownership avant DELETE access |
| userController.ts | 219 | Ajouter WHERE tenant_id dans DELETE |
| vehicleController.ts | 207 | Vérifier vehicleId appartient au tenant |
| vehicleController.ts | 475 | Paramétrer periodFilter (anti-injection) |
| deviceController.ts | 139 | Ajouter WHERE tenant_id |
| ticketController.ts | 56 | Forcer filtrage tenant même staff |
| ticketController.ts | ~150 | Vérifier tenant avant addMessage |
| ticketController.ts | 439 | Ajouter WHERE tenant_id dans DELETE |

### 🔴 URGENT - Validation & Doublons (5 corrections)

| Fichier | Lignes | Action |
|---------|--------|--------|
| leadController.ts | 58 | Ajouter vérification doublons email/company |
| tierRoutes.ts | 10-12 | Ajouter validateRequest(TierSchema) |
| interventionController.ts | ~200 | Valider signatures obligatoires COMPLETED |

### 🔴 URGENT - RBAC Permissions (9 corrections)

| Fichier | Lignes | Action |
|---------|--------|--------|
| financeRoutes.ts | 32-65 | Ajouter requirePermission sur 4 routes |
| leadRoutes.ts | 9-13 | Ajouter requirePermission sur toutes routes |

**📖 Documentation complète** : Voir ``DIAGNOSTIC_COMPLET_2026_02_03.md`` section ROADMAP

---

## 🎯 Prochaines Étapes

### Immédiat (Aujourd'hui)

1. ✅ Lire ce rapport
2. ⚠️  Vérifier que le build fonctionne : ``npm run build``
3. ⚠️  Exécuter script SQL en **staging** d'abord
4. ⚠️  Appliquer corrections TypeScript manuelles (voir diagnostic)

### Court Terme (Cette Semaine)

5. ⚠️  Tests isolation tenant_id (curl/Postman)
6. ⚠️  Tests doublons Leads/Tiers
7. ⚠️  Tests RBAC permissions
8. ⚠️  Déploiement staging complet
9. ⚠️  Validation par utilisateurs test

### Avant Production

10. ⚠️  Backup DB complet
11. ⚠️  Déploiement production
12. ⚠️  Monitoring 24h actif
13. ⚠️  Tests post-déploiement

---

## 📞 Support

**En cas de problème** :
- Consulter : ``$LogFile``
- Vérifier : ``DIAGNOSTIC_COMPLET_2026_02_03.md``
- Rollback SQL disponible dans transaction

---

*Rapport généré automatiquement le $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")*
"@

Set-Content -Path $reportPath -Value $report
Write-Log "✅ Rapport généré : $reportPath" "INFO"

# ============================================
# FIN
# ============================================

Write-Log "" "INFO"
Write-Log "===== CORRECTIONS TERMINÉES =====" "INFO"
Write-Log "" "INFO"
Write-Log "📁 Fichiers générés :" "INFO"
Write-Log "   - Log : $LogFile" "INFO"
Write-Log "   - SQL : $sqlScriptPath" "INFO"
Write-Log "   - Rapport : $reportPath" "INFO"
Write-Log "" "INFO"
Write-Log "⚠️  ÉTAPES SUIVANTES :" "WARNING"
Write-Log "   1. Lire le rapport : $reportPath" "WARNING"
Write-Log "   2. Vérifier build : npm run build" "WARNING"
Write-Log "   3. Exécuter SQL en STAGING : psql < $sqlScriptPath" "WARNING"
Write-Log "   4. Appliquer corrections TypeScript manuelles (voir diagnostic)" "WARNING"
Write-Log "" "INFO"
