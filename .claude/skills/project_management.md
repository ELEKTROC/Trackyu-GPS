# Skill — Gestion de projet TrackYu

## Organisation des sessions de travail

### 3 sessions parallèles

| Session      | Périmètre                 | Répertoire                                |
| ------------ | ------------------------- | ----------------------------------------- |
| Frontend web | `TRACKING/` (hors mobile) | `c:/Users/ADMIN/Desktop/TRACKING/`        |
| Backend      | `trackyu-backend/`        | `c:/Users/ADMIN/Desktop/trackyu-backend/` |
| Mobile       | `trackyu-mobile-expo/`    | `TRACKING/trackyu-mobile-expo/`           |

**Règle** : ne jamais toucher aux fichiers hors périmètre de la session courante sans prévenir.

## Priorités produit

### P0 — Bloquant prod (traiter dans l'heure)

- Crash serveur / backend down
- Perte de données GPS (positions non enregistrées)
- Immobilisation véhicule ne fonctionne plus
- Faille sécurité (accès cross-tenant, injection SQL)

### P1 — Critique (traiter dans la journée)

- Feature principale cassée (carte, alertes, carburant)
- Bug d'affichage sur tous les véhicules
- Facturation bloquée

### P2 — Important (sprint en cours)

- Amélioration UX significative
- Performance dégradée (> 3s)
- Feature demandée par un client clé

### P3 — Backlog (prochains sprints)

- Refactoring, dette technique
- Features nouveaux modules

## Workflow de développement

```
1. Identifier le bug / la feature → reproduire / spécifier
2. Analyser les fichiers impactés (lire avant de modifier)
3. Implémenter (demander accord avant de coder)
4. Tester localement
5. deploy-staging.ps1 → valider sur staging.trackyugps.com
6. Accord explicite utilisateur → deploy.ps1 -frontend / -backend
7. Vérifier en prod (monitoring logs, comportement réel)
8. Commit propre avec message conventionnel
```

## Format des commits

```
type(scope): description courte

feat(fuel): ajout courbe ralenti dans onglet Cette semaine
fix(positions): fuel_liters omis dans INSERT bulk positionWorker
chore(imei): lever limite 15 car → min(8) max(20) partout
refactor(auth): extraire middleware isAdmin dans utils
docs(claude): créer CLAUDE.md + skills de référence
```

Types : `feat` | `fix` | `chore` | `refactor` | `perf` | `test` | `docs` | `style`

## Gestion de la dette technique

### Chantiers actifs (2026-04)

| Chantier                                   | État                          | Priorité |
| ------------------------------------------ | ----------------------------- | -------- |
| D1 — Backend src/ reconstruit              | ✅ Complété 2026-04-20        | —        |
| i18n Vague A                               | ✅ Déployé staging 2026-04-18 | —        |
| i18n Vague B                               | ⏳ Non urgent                 | P3       |
| Backend audit (5 rapports)                 | ⏳ Top-10 actions priorisées  | P2       |
| Mobile Phase 2-3 (VehicleDetail, services) | ⏳ En cours                   | P2       |
| AUTOCHEK facturation régularisation        | ⏳ Phase 0 mapping ABO        | P1       |
| Design harmonisation Phase 2               | ⏳ En attente                 | P3       |
| Politique de purge données GPS             | ⏳ Non planifié               | P3       |

### Règle dette technique

Ne pas introduire de nouvelle dette pour gagner du temps :

- Pas de `// TODO` sans ticket
- Pas de `as any` sans justification
- Pas de patch VPS sans backport src/ dans 48h

## Gestion des clients

### Hiérarchie des interlocuteurs

```
TrackYu (SUPERADMIN) → Revendeurs (RESELLER_ADMIN) → Clients finaux (ADMIN)
```

### Client clé identifié

- **AUTOCHEK** (CLI-SMT-00044) : ~595 renouvellements manquants 2023-2025 — régularisation en cours
- **ARD / ex-TETRATECH** : migration effectuée 2026-04-07
- **261 comptes CLIENT** créés en masse 2026-04-07

## Backlogs structurés

### Template pour une user story

```
En tant que [rôle]
Je veux [action]
Afin de [bénéfice]

Critères d'acceptance :
- [ ] ...
- [ ] ...

Définition of Done :
- [ ] Code review
- [ ] Tests passent
- [ ] Staging validé
- [ ] Prod déployé
- [ ] Pas de régression observée
```

## Monitoring post-déploiement

### Vérifications systématiques après déploiement

1. Login / logout (auth fonctionnelle)
2. Carte temps réel (position véhicule mise à jour)
3. Bloc carburant (gauge + historique)
4. Ajout d'un véhicule (formulaire IMEI)
5. Immobilisation (action critique)

### Logs à surveiller

```bash
# Backend
ssh root@148.230.126.62
docker logs trackyu-gps-backend-1 --tail 50 -f

# GPS server
docker logs trackyu-gps-backend-1 2>&1 | grep -i "gps\|error\|warn"

# Frontend nginx
docker logs trackyu-gps-frontend-1 --tail 20
```

## Communication avec le client / utilisateur

- Toujours répondre en **français**
- Numéroter les questions si > 1 dans un message
- Ne jamais affirmer des chiffres non vérifiés
- Attendre un accord explicite avant de coder ou déployer
- Signaler clairement ce qui est staging vs prod

## Plan de release type

```
Semaine N :   Dev + tests locaux
Semaine N+1 : Staging + validation utilisateur
Semaine N+2 : Prod + monitoring 48h
```

Pour les hotfixes P0 : staging express (< 1h) + prod dans la foulée avec accord.

## Backups et continuité

- **DB** : pg_dump quotidien à 3h15, rétention 14 jours
- **Code** : Git (github.com/ELEKTROC/trackyu-backend + repo frontend)
- **Snapshot VPS** : Hostinger (manuel, avant toute opération risquée)
- **Rollback frontend** : redéployer le commit précédent avec `deploy.ps1 -frontend`
- **Rollback backend** : restaurer .bak sur VPS (urgence) + rebuild depuis src/

---

## Rapports liés (docs/)

Voir l'index complet dans [`docs/README.md`](../../docs/README.md). Rapports pertinents pour ce skill :

- `docs/plans/` — roadmap, progression, TODO, suivi, contexte de reprise
- `docs/sessions/` — release notes et résumés datés
- `docs/audits-globaux/` — diagnostics transverses

> ⚠️ Ces rapports peuvent être obsolètes — vérifier la date avant de s'y fier. En cas de contradiction avec le code ou la prod, c'est le code/prod qui fait foi.
>
> **Tout nouveau rapport doit être rangé dans `docs/<thème>/`** selon l'organisation décrite dans `docs/README.md`.
