# docs/ — Rapports et chantiers TrackYu

Index de tous les rapports d'audit, diagnostics, chantiers, plans et résumés de session du projet TrackYu.

> **⚠️ Rapports potentiellement obsolètes** — beaucoup de fichiers datent de plusieurs semaines ou mois. Toujours vérifier la date dans le nom ou l'en-tête avant de s'y fier. Si un rapport contredit l'état actuel du code ou de la prod, c'est la prod/code qui fait foi.

## Règle de rangement des futurs rapports

**Tout nouveau rapport doit être créé dans `docs/<thème>/`** selon cette organisation :

- Rapport ciblant **un module métier** → `docs/modules/<module>/`
- Rapport **backend transverse** (archi, sécu, perf, dette, infra) → `docs/backend/`
- Rapport **frontend transverse** (refactoring, UI/UX, design) → `docs/frontend/`
- Rapport **perf transverse** → `docs/performance/`
- **Diagnostic / audit multi-modules** → `docs/audits-globaux/`
- **Plan, roadmap, suivi, TODO** → `docs/plans/`
- **Release notes ou résumé de session daté** → `docs/sessions/`

Ne **jamais** déposer un rapport à la racine du repo. `CLAUDE.md` est le seul `.md` autorisé à la racine.

Nommage : `AUDIT_<sujet>[_<YYYY_MM_DD>].md`, `CHANTIER_<sujet>.md`, `RESUME_SESSION_<YYYY_MM_DD>.md`, `PLAN_<sujet>.md`, etc. Inclure la date quand le rapport est daté.

---

## modules/ — rapports par module métier

### gps/

- `AUDIT_GPS_MODULE_2026_02_03.md` — audit module GPS (février 2026)
- `AUDIT_GEOCODING.md` — audit chaîne de géocodage
- `CHANTIER_GPS_PRECISION.md` — chantier précision GPS (correctifs anti-drift, CRC, variantes)
- `CHANTIER_GPS_HAUT_DE_GAMME.md` — chantier GPS haut de gamme (phases F1/F2/F3)
- `BALISES_NON_ASSIGNEES.md` — inventaire balises non assignées

### fleet/

- `AUDIT_FLEET_MODULE.md` — audit module flotte
- `AUDIT_VEHICULES.md` — audit liste véhicules

### finance/

- `AUDIT_FINANCE_MODULE.md` — audit module finance/facturation

### crm/

- `AUDIT_CRM_MODULE.md` — audit module CRM

### tech/

- `AUDIT_TECH_MODULE.md` — audit module Tech
- `AUDIT_TECH_MODULE_COMPLET.md` — audit complet module Tech
- `AUDIT_FINAL_MODULE_INTERVENTIONS.md` — audit final interventions
- `AUDIT_TICKET_FORM.md` — audit formulaire ticket intervention

### admin/

- `AUDIT_ADMIN_MODULE_REPORT.md` — audit module administration

### catalogue/

- `AUDIT_CATALOGUE_MODULE_2026_02_27.md` — audit catalogue (27/02/2026)

### stock/

- `AUDIT_STOCK_MODULE_2026_02_03.md` — audit stock (03/02/2026)

### dashboard/

- `AUDIT_DASHBOARD_MODULE.md` — audit dashboard

### map/

- `AUDIT_MAP_MODULE.md` — audit carte

### support/

- `AUDIT_SUPPORT_MODULE.md` — audit module support

### alertes/

- `CHANTIER_ALERTES.md` — chantier système d'alertes

---

## backend/ — transverse backend

- `AUDIT_BACKEND.md` — audit backend global
- `AUDIT_BACKEND_ARCHITECTURE.md` — audit architecture
- `AUDIT_BACKEND_DETTE.md` — audit dette technique
- `AUDIT_BACKEND_INFRA.md` — audit infrastructure
- `AUDIT_BACKEND_PERF.md` — audit performance
- `AUDIT_BACKEND_SECURITE.md` — audit sécurité
- `SRC_DIST_INVENTORY.md` — inventaire src/ vs dist/

---

## frontend/ — transverse frontend web

- `AUDIT_WEB.md` — audit frontend web
- `AUDIT_REFACTORING_OBJECTS_TABLE.md` — audit refactoring table objects
- `RECONSTRUCTION_FRONTEND.md` — chantier reconstruction frontend
- `ROADMAP_REFACTORING.md` — roadmap refactoring
- `PLAN_SRC_REMISE_AU_CARRE.md` — plan remise au carré du src
- `design-harmonisation.md` — harmonisation design web
- `AUDIT_UI_UX_CONSISTENCY.md` — audit cohérence UI/UX
- `AUDIT_UI_UX_HARMONIZATION_2026_03_06.md` — harmonisation UI/UX (06/03/2026)
- `AUDIT_DROPDOWNS_COMPLET.md` — audit complet dropdowns

---

## performance/ — transverse performance

- `AUDIT_PERFORMANCE.md` — audit performance global
- `AUDIT_PERFORMANCE_2026_02_27.md` — audit performance (27/02/2026)

---

## audits-globaux/ — diagnostics multi-modules

- `AUDIT_COMPLET_FINAL_2026_02_03.md` — audit complet final (03/02/2026)
- `DIAGNOSTIC_COMPLET_2026_02_03.md` — diagnostic complet (03/02/2026)
- `ANALYSE_IMPACT_PRE_CORRECTIONS.md` — analyse d'impact pré-corrections
- `VERIFICATION_CORRECTIONS.md` — vérification corrections
- `RESUME_CORRECTIONS.md` — résumé corrections

---

## plans/ — plans, roadmap, suivi

- `AUDIT_PROGRESSION.md` — progression des audits
- `PLAN_DE_TESTS_MANUELS.md` — plan de tests manuels
- `PROCHAINES_ETAPES.md` — prochaines étapes
- `TODO.md` — TODO global
- `SUIVI.md` — suivi général
- `USERS_CREATION_PLAN.md` — plan création utilisateurs
- `CONTEXTE_REPRISE.md` — contexte de reprise de session

---

## sessions/ — release notes et résumés datés

- `RELEASE_NOTES_Q1_2026.md` — release notes Q1 2026
- `RESUME_SESSION_2026_04_06.md` — résumé session 06/04/2026
- `RESUME_SESSION_2026_04_09.md` — résumé session 09/04/2026
