# Load tests — TrackYu Mobile API

Stress tests du backend TrackYu via Artillery.

## Scenarios

| Fichier                  | Cible                                     | Paliers        | Duree  | Usage                       |
| ------------------------ | ----------------------------------------- | -------------- | ------ | --------------------------- |
| `00-smoke.yml`           | `/api/health`                             | 5 req/s        | 10s    | Sanity check                |
| `01-baseline-health.yml` | `/api/health`                             | 5 → 2500 req/s | ~7 min | Point de rupture brut       |
| `02-auth-fleet.yml`      | `/api/auth/login` + `/api/fleet/vehicles` | 5 → 1000 req/s | ~7 min | Charge realiste utilisateur |

---

## Execution locale

```bash
cd trackyu-mobile-expo
npx artillery run load-tests/00-smoke.yml
```

Pour `02-auth-fleet.yml`, credentials via variables d'environnement :

```bash
TEST_EMAIL=test.rpc.client@trackyugps.com \
TEST_PASSWORD=XXXXX \
  npx artillery run load-tests/02-auth-fleet.yml --output report.json
```

**Attention** : l'execution locale depuis Windows vers le VPS peut etre polluee par la latence / instabilite reseau local. Pour des chiffres fiables, utiliser le workflow GitHub Actions (ci-dessous).

---

## Execution via GitHub Actions (recommande)

Avantages : reseau propre Azure, 2 CPU runner, reproductible, logs et artifacts gardes 30 jours.

### Prerequis : GitHub Secrets

Dans le repo GitHub → Settings → Secrets and variables → Actions → New repository secret :

| Secret          | Valeur                           |
| --------------- | -------------------------------- |
| `TEST_EMAIL`    | Email compte test staging        |
| `TEST_PASSWORD` | Mot de passe compte test staging |

### Declencher le workflow

**Via interface GitHub :**

1. Onglet **Actions**
2. Workflow **Load test (Artillery)** → **Run workflow**
3. Choisir `smoke` / `baseline` / `auth-fleet`
4. Target par defaut = `https://staging.trackyugps.com`

**Via CLI `gh` :**

```bash
gh workflow run load-test.yml -f scenario=smoke
gh workflow run load-test.yml -f scenario=baseline
gh workflow run load-test.yml -f scenario=auth-fleet
```

### Recuperer le rapport

Apres execution :

1. Actions → run termine → **Artifacts** en bas
2. Telecharger `load-test-<scenario>-<run-number>.zip`
3. Ouvrir le `.html` dans un navigateur (vue graphique) ou le `.json` (brut)

---

## Lecture des resultats

**Criteres de reussite (Play Store V1, cible 100-500 users) :**

| Metrique              | Seuil acceptable | Seuil critique |
| --------------------- | ---------------- | -------------- |
| p95 `/api/health`     | < 1s a 200 req/s | > 3s           |
| p95 `/api/auth/login` | < 2s a 100 req/s | > 5s           |
| Error rate            | < 5%             | > 15%          |
| p99                   | < 2× p95         | > 3× p95       |

**Interpretation rupture :**

- Si `errors.ECONNRESET` ou `503` → saturation backend Node
- Si `ETIMEDOUT` partout → soit reseau (cote runner ou cote VPS), soit saturation Caddy / fail2ban
- Si `ECONNREFUSED` → backend crash ou restart

---

## Historique

| Date       | Scenario | Source        | Resultat                            | Note                           |
| ---------- | -------- | ------------- | ----------------------------------- | ------------------------------ |
| 2026-04-17 | smoke    | Windows local | 100% ETIMEDOUT                      | Reseau local instable          |
| 2026-04-17 | baseline | Windows local | 8.7% succes, p95=925ms (sur 32k OK) | Non concluant, reseau parasite |

Nouveaux runs via GitHub Actions a ajouter au fur et a mesure.
