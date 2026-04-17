# Assets Play Store — TrackYu Mobile

Éléments graphiques et textuels pour la soumission Google Play Console.

## État d'avancement

| Asset                   | Statut           | Fichier                              | Note                               |
| ----------------------- | ---------------- | ------------------------------------ | ---------------------------------- |
| Icon 512×512            | ✅ Prêt          | `icon-512.png`                       | Récupéré depuis staging (web logo) |
| Feature graphic 1024×500 | **À créer**      | `feature-graphic-1024x500.png`       | Voir section dédiée ci-dessous     |
| Screenshots phone       | **À capturer**   | `screenshots/phone-*.png`            | Nécessite APK preview + device     |
| Short description FR    | ✅ Prêt          | `descriptions-fr.md`                 | 73 chars                           |
| Full description FR     | ✅ Prêt          | `descriptions-fr.md`                 | ~2100 chars                        |

## Feature graphic 1024×500

**Contraintes Play Console** :
- 1024 × 500 px exactement
- JPG ou PNG 24-bit (pas d'alpha)
- Pas de texte en bas (Google recouvre cette zone)
- Pas de capture d'écran de l'app

**Contenu recommandé** :
- Fond dégradé bleu TrackYu (cohérent avec icon)
- Logo pin GPS à gauche
- Texte "TRACKYU — Suivi GPS de flotte" à droite
- Pas plus de 6-8 mots

**Options de création** :

### Option A — Canva (5 min, gratuit)

1. https://www.canva.com/create/feature-graphics/
2. Dimension personnalisée : 1024 × 500 px
3. Importer `icon-512.png` comme asset
4. Texte + fond bleu
5. Télécharger en PNG

### Option B — Figma (10 min, gratuit)

1. Nouveau frame 1024×500
2. Rectangle fond #1E3A8A (bleu TrackYu)
3. Image `icon-512.png`
4. Texte système "TRACKYU"
5. Export PNG

### Option C — Commander (~10€, fiverr/upwork)

Briefer : "Google Play Feature Graphic 1024×500, fond dégradé bleu, logo pin GPS inclus (fourni), texte 'TRACKYU Suivi GPS flotte', style corporate épuré."

## Screenshots

**Contraintes Play Console** :
- Min 2, idéal 6-8 par taille d'écran
- Phone portrait : 1080 × 1920 px minimum
- Format 16:9 ou 9:16
- PNG ou JPG 24-bit

**Écrans à capturer** (ordre suggéré) :
1. **LoginScreen** — orange/noir/blanc, logo TrackYu en haut
2. **MapScreen** — carte avec 3-5 véhicules visibles, mix de statuts (moving/idle/stopped)
3. **FleetScreen** — liste véhicules avec filtres
4. **VehicleDetailScreen** — détail véhicule : vitesse, trajet du jour, stats
5. **AlertsScreen** — quelques alertes (excès vitesse, sortie zone)
6. **DashboardScreen** — vue d'ensemble KPI

**Procédure de capture** :

1. Installer APK preview EAS sur device Android :
   ```bash
   cd trackyu-mobile-expo
   eas build --platform android --profile preview
   # Attendre ~15 min, télécharger APK depuis le lien EAS
   ```
2. Connecter device en mode debug USB, se logger avec un compte démo peuplé
3. Captures d'écran natives Android (power + volume down)
4. Transférer vers ce dossier `screenshots/phone-01-login.png`, etc.

**Astuce** : utiliser un compte démo avec données réalistes (plusieurs véhicules, alertes récentes) pour des screenshots parlants.

## Data Safety (déclaration Play Console)

À remplir dans Play Console → Policy → Data safety :

- **Collecte de données** : Oui
- **Types** :
  - *Location* (Approximate + Precise) : données GPS des véhicules (pas user)
  - *Personal info* : Email, Name (utilisateurs)
  - *App activity* : App interactions, In-app search
- **Finalité** : App functionality
- **Chiffrement en transit** : Oui (HTTPS/WSS)
- **Suppression possible** : Oui (via support@trackyugps.com)

## Content rating

Questionnaire IARC à remplir dans Play Console. Catégorie TrackYu :
- **Business / Productivity**
- No ads
- No user-generated content
- No violence / drugs / gambling
- Target audience : 18+

## Target audience

- **Âge** : 18+
- **Pays** : Côte d'Ivoire (V1), extension Afrique de l'Ouest (phase 2)
