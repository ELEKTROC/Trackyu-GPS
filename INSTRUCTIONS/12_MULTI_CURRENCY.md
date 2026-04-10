# Guide Utilisateur : Multi-Devises

> **Version** : 1.0 — Sprint 5 (Février 2026)  
> **Applicable à** : TrackYu GPS v2.x

---

## 📝 Présentation

TrackYu GPS supporte désormais **6 devises** pour la facturation, les devis, les paiements et les contrats :

| Devise | Code ISO | Symbole | Exemple |
|--------|----------|---------|---------|
| Franc CFA (BCEAO) | XOF | FCFA | 1 500 000 FCFA |
| Franc CFA (BEAC) | XAF | FCFA | 1 500 000 FCFA |
| Euro | EUR | € | 1 500,00 € |
| Dollar US | USD | $ | $1,500.00 |
| Dirham Marocain | MAD | DH | 1 500,00 DH |
| Franc Guinéen | GNF | GNF | 50 000 GNF |

La devise par défaut reste le **Franc CFA (XOF)** pour assurer la compatibilité avec les données existantes.

---

## ⚙️ Configuration

### 1. Définir la devise de l'organisation

1. Aller dans **Administration** → **Organisation**
2. Dans la section **Devise**, sélectionner la devise souhaitée
3. Cliquer **Enregistrer**

> Cette devise sera utilisée par défaut pour tous les documents financiers de votre organisation.

### 2. Devise par client (optionnel)

Si vous facturez des clients dans des devises différentes :

1. Ouvrir la fiche du client concerné
2. Dans le champ **Devise**, sélectionner la devise du client
3. Les futures factures et devis pour ce client utiliseront automatiquement cette devise

### 3. Priorité de la devise

Lors de la création d'un document financier, la devise est résolue dans cet ordre :

1. **Devise du document** (si spécifiée manuellement)
2. **Devise du client** (si configurée sur la fiche client)
3. **Devise de l'organisation** (paramètre global)
4. **XOF** (défaut système)

---

## 📄 Documents concernés

Les documents suivants supportent la multi-devise :

- **Factures** — montant HT, TTC, TVA formatés dans la devise du document
- **Devis** — montants et sous-totaux dans la devise sélectionnée
- **Paiements** — enregistrés dans la devise de la facture associée
- **Contrats** — montant mensuel/annuel dans la devise du client
- **Factures fournisseur** — pour les achats en devise étrangère
- **Interventions** — coût chiffré dans la devise appropriée

---

## 🖨️ PDF et Exports

### Factures PDF
Le format du montant dans les PDF reflète la devise du document :
- **XOF** : `1 500 000 FCFA` (pas de décimales)
- **EUR** : `1 500,00 €` (2 décimales, symbole après)
- **USD** : `$1,500.00` (2 décimales, symbole avant)

### Exports CSV/Excel
Les colonnes de montants incluent le code devise (ex: `amount`, `currency`), permettant le tri et le filtrage par devise.

---

## 🔄 Migration des données existantes

Toutes les données financières existantes ont été automatiquement marquées en **XOF** (Franc CFA BCEAO). Aucune action n'est requise de votre part pour les documents déjà créés.

---

## ❓ FAQ

**Q : Puis-je mélanger les devises sur une même facture ?**  
R : Non, chaque document utilise une seule devise. Pour un client multi-devise, créez des factures séparées.

**Q : La conversion automatique est-elle disponible ?**  
R : Non, la plateforme ne fait pas de conversion de taux. Les montants sont saisis et affichés dans la devise choisie.

**Q : Que se passe-t-il si je change la devise de mon organisation ?**  
R : Les documents existants conservent leur devise d'origine. Seuls les nouveaux documents utiliseront la nouvelle devise par défaut.

**Q : Les rapports financiers tiennent-ils compte de la devise ?**  
R : Les rapports affichent les montants dans la devise de chaque document. Les totaux agrègent par devise pour éviter les mélanges.

---

## 🔐 Sécurité (Sprint 6)

### Améliorations de sécurité appliquées

| Mesure | Description |
|--------|-------------|
| **JWT HS256** | Algorithme de signature JWT verrouillé sur HS256, rejet des tokens avec algorithmes inconnus |
| **Secret ≥32 chars** | Le serveur refuse de démarrer si le JWT secret fait moins de 32 caractères |
| **XSS sanitizeHtml** | Utilitaire créé pour nettoyer le HTML dangereux avant rendu |
| **SQL Injection** | Tous les intervalles SQL passent par `safeInterval()` (whitelist) au lieu d'interpolation directe |
| **Swagger protégé** | L'interface `/api-docs` est protégée par identifiant/mot de passe en production |
| **GPS TCP durci** | Limite de 500 connexions simultanées, buffer max 16 KB, rate limiting par IP |

> Ces améliorations sont transparentes pour l'utilisateur final et ne nécessitent aucune action.
