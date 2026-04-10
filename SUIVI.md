# SUIVI — Chantier Local → VPS → Déploiement
> TrackYu GPS · Démarré le 2026-04-03 · Audit complet : 2026-04-04 · MàJ : 2026-04-04

---

## OBJECTIF DU CHANTIER

**Formule :** modifications → `npm run build` → vérification locale → itérations → déploiement via `deploy.ps1`

**Cible :** version locale fonctionnellement et visuellement proche de la VPS, puis déploiement.

---

## WORKFLOW

```
[Claude modifie] → [npm run build] → [User vérifie en local] → [OK? → next item | NON? → correctif]
                                                                    ↓ (quand tout validé)
                                                           [deploy.ps1 → VPS]
```

---

## ÉTAT GLOBAL (après audit 2026-04-04)

| Axe | État | Détail |
|-----|------|--------|
| Design System — composants partagés | ✅ FAIT | 23 composants core + 5 restants migrés |
| Design System — features (vues P1) | ✅ FAIT | Login, Dashboard, FleetTable migrés + build ✓ |
| Design System — features (vues P2-P4) | ⛔ À FAIRE | ~160 fichiers restants |
| Backend — GPS pipeline | ✅ DÉJÀ CORRIGÉ | IMEI GT06 réel, CRC16, rate limiter, anti-drift |
| Contextes — bugs | ✅ CORRIGÉ | ToastContext : memory leak timers fixé |
| Déploiement | ⏳ BLOQUÉ | Attend validation locale + migration features |

---

## CHIFFRES CLÉ DE L'AUDIT

| Métrique | Valeur |
|----------|--------|
| Fichiers .tsx/.ts total | 183 |
| Fichiers avec `dark:` non migrés | **171** |
| Occurrences `dark:` restantes | **5 635** |
| Modules features complets | **13/13** ✅ |
| Parseurs GPS actifs | **6/6** ✅ |
| Contextes avec issues | 2/5 |
| Fichiers avec `any` explicite | 26 |
| Fichiers avec `@ts-ignore` | 31 |
| Services API — taille totale | 282 KB |

---

## SPRINT 1 — Design System : composants partagés ✅ COMPLÉTÉ

| Composant | État |
|-----------|------|
| `contexts/ThemeContext.tsx` | ✅ |
| `contexts/AppearanceContext.tsx` | ✅ |
| `src/index.css` — tokens CSS vars | ✅ |
| `components/Card.tsx` | ✅ |
| `components/Sidebar.tsx` | ✅ |
| `components/Modal.tsx` | ✅ |
| `components/ConfirmDialog.tsx` | ✅ |
| `components/Drawer.tsx` | ✅ |
| `components/Tabs.tsx` | ✅ |
| `components/SearchInput.tsx` | ✅ |
| `components/Skeleton.tsx` | ✅ |
| `components/EmptyState.tsx` | ✅ |
| `components/Pagination.tsx` | ✅ |
| `components/form/Input.tsx` | ✅ |
| `components/form/Select.tsx` | ✅ |
| `components/form/FormField.tsx` | ✅ |
| `components/form/Textarea.tsx` | ✅ |
| `components/BottomNavigation.tsx` | ✅ |
| `components/CommandPalette.tsx` | ✅ |
| `components/MobileCard.tsx` | ✅ |
| `components/SortableHeader.tsx` | ✅ |
| `components/StatusBadge.tsx` | ✅ |
| `components/OfflineBanner.tsx` | ✅ |
| `components/NotificationToast.tsx` | ✅ (chrome seulement) |

**Composants `components/` session 2 (migrés 2026-04-04) :**
- `BottomSheet.tsx` — ✅
- `ColumnManager.tsx` — ✅
- `FormStepper.tsx` — ✅
- `MobileFilterSheet.tsx` — ✅
- `form/SearchableSelect.tsx` — ✅
- `contexts/ToastContext.tsx` — ✅ + fix memory leak timers

---

## SPRINT 2 — Design System : features (PRINCIPAL CHANTIER)

> **5 635 occurrences** `dark:` à migrer dans 171 fichiers. Ordre de priorité par visibilité/impact.

### Priorité 1 — Vues principales (vues que l'user voit en premier)

| Vue | Fichier | Occurrences | État |
|-----|---------|-------------|------|
| Login | `features/auth/components/LoginView.tsx` | 34 | ✅ 2026-04-04 |
| Dashboard | `features/dashboard/components/DashboardView.tsx` | 53 | ✅ 2026-04-04 |
| Carte GPS | `features/map/components/MapView.tsx` | 92 | ⬜ |
| Flotte — table | `features/fleet/components/FleetTable.tsx` | 134 | ✅ 2026-04-04 |

### Priorité 2 — Vues métier courantes

| Vue | Fichier | Occurrences | État |
|-----|---------|-------------|------|
| Finance | `features/finance/components/FinanceView.tsx` | 177 | ⬜ |
| Factures fournisseurs | `features/finance/components/SupplierInvoicesView.tsx` | 64 | ⬜ |
| Tech | `features/tech/components/TechView.tsx` | 73 | ⬜ |
| Tech Settings | `features/tech/components/TechSettingsPanel.tsx` | 57 | ⬜ |
| Support | `features/support/components/SupportViewV2.tsx` | 137 | ⬜ |
| Support Settings | `features/support/components/SupportSettingsPanel.tsx` | 90 | ⬜ |

### Priorité 3 — Admin & Settings

| Vue | Fichier | Occurrences | État |
|-----|---------|-------------|------|
| Staff panel | `features/admin/components/panels/StaffPanelV2.tsx` | 123 | ⬜ |
| Intégrations | `features/admin/components/IntegrationsPanelV2.tsx` | 90 | ⬜ |
| Rôles | `features/admin/components/RoleManagerV2.tsx` | 60 | ⬜ |
| Mon compte | `features/settings/components/MyAccountView.tsx` | 60 | ⬜ |
| Notifications | `features/settings/components/MyNotificationsView.tsx` | 85 | ⬜ |
| Opérations | `features/settings/components/MyOperationsView.tsx` | 57 | ⬜ |
| Paramètres | `features/settings/components/SettingsView.tsx` | 55 | ⬜ |

### Priorité 4 — CRM, Rapports, Agenda, Stock

| Vue | Fichier | Occurrences | État |
|-----|---------|-------------|------|
| CRM — client detail | `features/crm/components/ClientDetailModal.tsx` | 107 | ⬜ |
| CRM — billing | `features/crm/components/BillingForecastView.tsx` | 76 | ⬜ |
| CRM — contrats | `features/crm/components/ContractsView.tsx` | 59 | ⬜ |
| CRM — leads | `features/crm/components/LeadsList.tsx` | 37 | ⬜ |
| Reports | `features/reports/components/ReportsView.tsx` | 31 | ⬜ |
| Stock table | `features/stock/components/partials/StockTable.tsx` | 68 | ⬜ |
| Stock modals | `features/stock/components/partials/StockModals.tsx` | 61 | ⬜ |
| Agenda | `features/agenda/components/AgendaCalendar.tsx` | 23 | ⬜ |
| Alertes | `features/tech/components/monitoring/AlertsConsole.tsx` | 62 | ⬜ |
| Interventions | `features/tech/components/InterventionList.tsx` | 76 | ⬜ |

---

## SPRINT 3 — Backend GPS Pipeline ✅ DÉJÀ CORRIGÉ

> **Surprise audit :** les corrections critiques sont déjà en place dans le backend local.

| Bug | État | Détail |
|-----|------|--------|
| IMEI GT06 hardcodé | ✅ CORRIGÉ | Login packet 0x01 parsé, BCD 8 bytes → 15 digits |
| Teltonika/Meitrack/WialonIPS non branchés | ✅ CORRIGÉ | 6 parseurs actifs en `server.ts` |
| Aucune validation CRC | ✅ CORRIGÉ | CRC16 IBM validé GT06, tous protocoles |
| Aucune validation coordonnées | ✅ CORRIGÉ | Bounds check lat/lng/speed/heading |
| Pas de rate-limiting IMEI | ✅ CORRIGÉ | Max 10 pkt/s par IMEI |
| Anti-drift | ✅ CORRIGÉ | speed=0 + dist<50m + ts<30s ignoré |

---

## SPRINT 4 — Bugs et corrections ciblées

### Critique

| ID | Fichier | Bug | État |
|----|---------|-----|------|
| C1 | `contexts/ToastContext.tsx` L.92, L.166, L.195 | 3 timers sans cleanup → memory leak | ✅ CORRIGÉ 2026-04-04 |

### Composants restants à migrer (`components/`)

| ID | Fichier | Occurrences | État |
|----|---------|-------------|------|
| M1 | `components/BottomSheet.tsx` | 5 | ✅ |
| M2 | `components/ColumnManager.tsx` | 15 | ✅ |
| M3 | `components/FormStepper.tsx` | 14 | ✅ |
| M4 | `components/MobileFilterSheet.tsx` | 13 | ✅ |
| M5 | `components/form/SearchableSelect.tsx` | 15 | ✅ |

---

## SPRINT 5 — Déploiement

```powershell
# Depuis PowerShell à la racine du projet
./deploy.ps1
```

**Pré-requis avant déploiement :**
- [x] Sprint 4 C1 corrigé (ToastContext) ✅
- [x] Build propre (`npm run build` sans erreurs) ✅ 2026-04-04
- [x] Vues P1 migrées (Login, Dashboard, FleetTable) ✅
- [ ] Validation locale OK sur les vues principales (à faire par l'user)
- [ ] Sprint 2 P2-P4 terminé (migration ~160 fichiers restants)

---

## NOTES TECHNIQUES

- **Service Worker** : utiliser incognito pour les tests locaux (évite cache SW prod)
- **Auth** : SUPERADMIN, 102 permissions — login via proxy `/api/auth/login`
- **Proxy Vite** : `https://trackyugps.com` avec `headers: { origin: ... }` (CORS bypass)
- **npm install** : toujours `--legacy-peer-deps` (conflit eslint v10 / react-hooks)
- **Deploy** : toujours via `deploy.ps1`, jamais upload manuel du dist

---

## BUGS BUILD RÉSOLUS (historique)

| Erreur | Fichier | Correction |
|--------|---------|------------|
| `Unexpected "}"` | `types.ts:33` | Fragment enum orphelin supprimé |
| `Could not resolve "./accounting"` | `types/index.ts` | Export supprimé |
| `Could not resolve "./detail-blocks/modals"` | barrel manquant | `index.ts` créé |
| `Could not resolve "./messages"` | barrel manquant | `index.ts` créé |
| `Could not resolve "./partials"` | barrel manquant | `index.ts` créé |
| `DeviceConfigPanelV2 not exported` | `SuperAdminView.tsx` | Import default corrigé |
| CORS dev server | `vite.config.ts` | `headers: { origin: 'https://trackyugps.com' }` |
