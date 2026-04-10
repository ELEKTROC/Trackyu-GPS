# 📚 Instructions TrackYu GPS - Documentation pour Agents IA

> Ce dossier contient la documentation structurée pour imprégner les agents IA dans le contexte de l'application TrackYu GPS.

## 🗂️ Structure des fichiers

| Fichier | Description | Mise à jour |
|---------|-------------|-------------|
| `00_OVERVIEW.md` | Vue d'ensemble de l'architecture | Manuel |
| `01_ARCHITECTURE.md` | Architecture technique détaillée | Manuel |
| `02_SECURITY.md` | Sécurité, auth, RBAC | Manuel |
| `03_FRONTEND.md` | Patterns React, hooks, composants | Auto |
| `04_BACKEND.md` | API, routes, services backend | Auto |
| `05_GPS_PIPELINE.md` | Pipeline GPS temps réel | Manuel |
| `06_DATABASE.md` | Schéma DB, migrations | Auto |
| `07_MOBILE.md` | Capacitor, React Native | Manuel |
| `08_INTEGRATIONS.md` | Services externes (SMS, Wave...) | Manuel |
| `09_WORKFLOWS.md` | Procédures de développement | Manuel |
| `10_AI_GUIDELINES.md` | Consignes spécifiques agents IA | Manuel |
| `11_PROJECT_STATS.md` | Statistiques du projet | **Auto quotidien** |

## 🔄 Mise à jour automatique

Le fichier `11_PROJECT_STATS.md` est mis à jour automatiquement par le script `update-instructions.ps1`.

### Exécution manuelle
```powershell
.\INSTRUCTIONS\update-instructions.ps1
```

### Planification automatique (Windows Task Scheduler)
```powershell
# Créer une tâche planifiée quotidienne à 6h00
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\Users\ADMIN\Desktop\TRACKING\INSTRUCTIONS\update-instructions.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 6:00AM
Register-ScheduledTask -TaskName "TrackYu-UpdateInstructions" -Action $action -Trigger $trigger -Description "Mise à jour quotidienne des stats projet"
```

### Avec GitHub Actions (CI/CD)
Voir `.github/workflows/update-instructions.yml` pour une mise à jour automatique à chaque push.

## 📅 Dernière mise à jour

- **Date** : 2026-02-10
- **Version** : 1.2.0
- **Auteur** : Agent IA Copilot

### Changelog v1.2.0
- Mise à jour complète des 12 fichiers après audit DevOps
- 00_OVERVIEW : Ajout sections Tests/CI/CD et Audits de sécurité
- 01_ARCHITECTURE : Ajout section Infrastructure DevOps (CI/CD, Husky, Docker hardening, backup)
- 02_SECURITY : Remplacement corrections par tableau 16 audits (~250+ issues)
- 03_FRONTEND : Versions à jour (React 19.2, Vite 6.2, TailwindCSS 4.1, react-window 1.8.10), ConfirmDialog, tests Vitest
- 04_BACKEND : Tests détaillés (Jest 30.2, 78/78 pass), backup, .env.example
- 06_DATABASE : Backup automatisé, Docker healthcheck
- 09_WORKFLOWS : Husky pre-commit, GitHub Actions CI/CD, tests détaillés, onboarding développeur
- 10_AI_GUIDELINES : Erreurs #10-12 (ConfirmDialog, react-window v1, TailwindCSS 4.1), contexte CI/CD et sécurité
- 11_PROJECT_STATS : Refonte complète avec stats à jour (66 routes, 48 controllers, 35 migrations, 78/78 backend tests)

### Changelog v1.1.0
- Ajout environnement staging (staging.trackyugps.com)
- Documentation architecture staging dans 01_ARCHITECTURE.md
- Rapport migration sécurité (STAGING_DEPLOYMENT_REPORT.md)

---

*Ce dossier est conçu pour être lu par les agents IA avant de travailler sur le projet.*
