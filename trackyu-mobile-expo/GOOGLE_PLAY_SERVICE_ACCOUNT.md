# Guide — Creer le Service Account Google Play

> Necessaire pour que `eas submit` puisse publier automatiquement l'app sur Play Store.
> Temps estime : 10-15 minutes.
> A faire une seule fois.

---

## 1. Pourquoi ?

EAS (Expo Application Services) doit s'authentifier aupres de Google Play pour :

- Uploader l'AAB genere
- Creer les releases sur les tracks (internal, alpha, beta, production)
- Mettre a jour les metadonnees

Sans ce fichier JSON, on devra uploader manuellement chaque version via la Play Console (lourd et source d'erreurs).

---

## 2. Prerequis

- Un compte Google Play Console actif (avec l'app `com.smartrack.trackyu` deja creee ou en brouillon)
- Acces admin au compte Google Cloud associe
- Environ 15 minutes

---

## 3. Etape par etape

### 3.1 Creer le service account dans Google Cloud Console

1. Ouvrir <https://console.cloud.google.com/>
2. **Selectionner ou creer un projet** (ex: `trackyu-playstore`)
3. Menu lateral → **IAM & Admin** → **Service Accounts**
4. Cliquer **+ CREATE SERVICE ACCOUNT** en haut
5. Remplir :
   - **Service account name** : `eas-submit`
   - **Service account ID** : `eas-submit` (auto-rempli)
   - **Description** : `EAS Submit → Google Play API`
6. Cliquer **CREATE AND CONTINUE**
7. **Grant this service account access to project** : ne rien ajouter, cliquer **CONTINUE**
8. **Grant users access** : ne rien ajouter, cliquer **DONE**

### 3.2 Generer la cle JSON

1. Dans la liste Service Accounts, cliquer sur `eas-submit@...iam.gserviceaccount.com`
2. Onglet **KEYS** en haut
3. **ADD KEY** → **Create new key**
4. Selectionner **JSON** → **CREATE**
5. Un fichier JSON se telecharge automatiquement
6. Renommer ce fichier **`google-play-service-account.json`**

### 3.3 Activer l'API Google Play Android Developer

1. Toujours dans Google Cloud Console
2. Menu lateral → **APIs & Services** → **Library**
3. Rechercher **Google Play Android Developer API**
4. Cliquer dessus → **ENABLE**

### 3.4 Inviter le service account dans Play Console

1. Ouvrir <https://play.google.com/console/>
2. En bas a gauche : **Users and permissions**
3. **Invite new users**
4. **Email address** : coller l'email du service account (se termine par `@...iam.gserviceaccount.com`)
5. **App permissions** : selectionner l'app TrackYu
6. Cocher ces permissions pour l'app :
   - **View app information and download bulk reports (read-only)**
   - **Manage production releases**
   - **Manage testing track releases**
   - **Manage testing track access**
   - **Release to production, exclude devices, and use Play App Signing**
7. **Account permissions** : **Admin (all permissions)** n'est PAS requis — laisser vide
8. Cliquer **Invite user**
9. L'invitation est acceptee automatiquement cote service account (pas d'email a valider)

### 3.5 Placer le fichier dans le projet

```bash
cd C:\Users\ADMIN\Desktop\TRACKING\trackyu-mobile-expo
mkdir -p secrets
# Deplacer le JSON telecharge vers :
#   secrets/google-play-service-account.json
```

**Important** : verifier que `secrets/` est bien dans `.gitignore` (ne PAS committer ce fichier).

---

## 4. Verifier que tout marche

Une fois le fichier place, tester (sans publier) :

```bash
cd trackyu-mobile-expo
eas submit --platform android --latest --dry-run
```

Si pas d'erreur d'auth, c'est bon. L'erreur attendue a ce stade : "no build found" (normal, on n'a pas encore de build AAB production).

---

## 5. Securite

- **NE JAMAIS** committer `google-play-service-account.json` dans git
- **NE JAMAIS** le partager en clair (Slack, email, etc.)
- Si compromis : retourner sur Google Cloud Console → Service Accounts → Keys → Delete, puis regenerer
- Optionnel : stocker plutot comme EAS Secret via `eas secret:create` pour build cloud

---

## 6. Reference eas.json

Le fichier `eas.json` pointe deja sur le chemin attendu :

```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./secrets/google-play-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

Donc des que le JSON est en place, aucune config supplementaire n'est necessaire.

---

## 7. Checklist finale

- [ ] Service account `eas-submit` cree dans Google Cloud Console
- [ ] Cle JSON generee et telechargee
- [ ] API `Google Play Android Developer` activee
- [ ] Service account invite dans Play Console avec permissions app-level
- [ ] Fichier place a `trackyu-mobile-expo/secrets/google-play-service-account.json`
- [ ] `.gitignore` verifie (pas de commit du fichier)
- [ ] `eas submit --dry-run` renvoie "no build found" (et non une erreur d'auth)

Quand tout est coche, on peut proceder au build AAB production et submit.
