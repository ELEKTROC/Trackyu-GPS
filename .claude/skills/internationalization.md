# Skill — Internationalisation (i18n) TrackYu

## Langue source

**Français** — toutes les clés i18n sont d'abord écrites en FR.

## Priorité de traduction

```
FR (source) → EN (prioritaire, obligatoire) → ES (3e, IA first pass acceptable)
```

## Implémentation web

```typescript
import { useTranslation } from '../../../i18n';
const { t } = useTranslation();

// Usage
t('fleet.detailPanel.status.moving');
t('fleet.detailPanel.emptyStates.noFuel');
```

## Structure des clés

```
fleet.detailPanel.*     — panneau détail véhicule
fleet.table.*           — tableau flotte
notifications.*         — centre de notifications
agenda.*                — agenda/planification
settings.*              — paramètres
auth.*                  — authentification
common.*                — termes communs (save, cancel, etc.)
```

## Alertes et messages dynamiques

- Langue de l'utilisateur connecté (settings `language`)
- Fallback : langue du tenant
- Fallback final : français

```typescript
// Pattern correct
const userLang = user?.settings?.language ?? tenant?.defaultLanguage ?? 'fr';
```

## Vagues de déploiement i18n web

- **Vague A** : déployée prod 2026-04-18 — fleet, notifications, agenda
- **Vague B** : non urgente — settings, finance, CRM

## Mobile (Expo)

- `i18next` + `react-i18next`
- Fichiers de traduction dans `trackyu-mobile-expo/src/i18n/`
- Détection automatique de la langue du device

## Règles de codage

- Jamais de texte hardcodé en français dans les composants — toujours `t('clé')`
- Noms de clés : snake_case, hiérarchiques par module
- Interpolations : `t('clé', { variable: valeur })`
- Pluriels : utiliser `t('clé', { count: n })`
- Dates : toujours `toLocaleDateString('fr-FR', options)` avec la locale de l'utilisateur

## Formats régionaux

```typescript
// Date
new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

// Heure
new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// Nombre
new Intl.NumberFormat('fr-FR').format(n);

// Devise — utiliser le hook useCurrency() du tenant
const { format } = useCurrency();
format(montant); // → "1 250,00 XOF" selon config tenant
```
