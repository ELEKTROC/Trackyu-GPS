# 📋 Plan de Tests Manuels — TrackYu GPS

> **Version** : 1.0 — 24 février 2026
> **URL de test** : https://trackyugps.com
> **Objectif** : Tester chaque module de l'application et remonter les bugs, incohérences ou difficultés d'utilisation.

---

## 🔧 Instructions pour les testeurs

### Comment remonter un bug

Pour chaque problème trouvé, notez :

1. **Module** : Quel module / onglet
2. **Étape** : Ce que vous avez fait (ex: "J'ai cliqué sur Ajouter un véhicule")
3. **Résultat attendu** : Ce qui devrait se passer
4. **Résultat obtenu** : Ce qui s'est réellement passé
5. **Capture d'écran** : Si possible
6. **Navigateur** : Chrome / Firefox / Safari / Edge + version
7. **Appareil** : PC / Mobile (Android / iPhone) + modèle si mobile
8. **Sévérité** : 🔴 Bloquant / 🟠 Majeur / 🟡 Mineur / 🔵 Cosmétique

### Comptes de test

| Rôle               | Email                 | Mot de passe | Accès attendu                    |
| ------------------ | --------------------- | ------------ | -------------------------------- |
| SuperAdmin         | _(fourni séparément)_ | _(fourni)_   | Tout                             |
| Admin              | _(fourni séparément)_ | _(fourni)_   | Tout sauf SuperAdmin             |
| Commercial         | _(fourni séparément)_ | _(fourni)_   | CRM, ventes                      |
| Technicien         | _(fourni séparément)_ | _(fourni)_   | Interventions, stock, monitoring |
| Support Client     | _(fourni séparément)_ | _(fourni)_   | Tickets support                  |
| Utilisateur simple | _(fourni séparément)_ | _(fourni)_   | Dashboard, carte, flotte         |

### Barème de notation

Après chaque test, évaluez sur 5 :

- ⭐⭐⭐⭐⭐ = Parfait, aucun problème
- ⭐⭐⭐⭐ = Fonctionne avec défauts mineurs
- ⭐⭐⭐ = Fonctionne mais UX à améliorer
- ⭐⭐ = Bugs importants
- ⭐ = Ne fonctionne pas

---

## 📦 MODULE 1 — Authentification & Inscription

**Testeur assigné** : ******\_\_\_******
**Date de test** : ******\_\_\_******
**Note globale** : ⭐⭐⭐⭐⭐

### TEST 1.1 — Connexion standard

| #   | Action                                                                     | Résultat attendu                                      | ✅/❌ | Remarques |
| --- | -------------------------------------------------------------------------- | ----------------------------------------------------- | ----- | --------- |
| 1   | Ouvrir https://trackyugps.com                                              | Page de connexion affichée avec logo TrackYu          |       |           |
| 2   | Laisser les champs vides et cliquer "Se connecter"                         | Message d'erreur indiquant que les champs sont requis |       |           |
| 3   | Saisir un email invalide (ex: "test@") et un mot de passe                  | Message d'erreur "Email invalide" ou similaire        |       |           |
| 4   | Saisir un email valide avec un mauvais mot de passe                        | Message d'erreur "Identifiants incorrects"            |       |           |
| 5   | Saisir un email valide avec le bon mot de passe                            | Redirection vers le Dashboard                         |       |           |
| 6   | Cocher "Se souvenir de moi", se connecter, fermer le navigateur, ré-ouvrir | L'email est pré-rempli dans le champ                  |       |           |
| 7   | Vérifier que l'icône œil affiche/masque le mot de passe                    | Le mot de passe bascule entre texte et points         |       |           |

### TEST 1.2 — Mot de passe oublié

| #   | Action                                | Résultat attendu                       | ✅/❌ | Remarques |
| --- | ------------------------------------- | -------------------------------------- | ----- | --------- |
| 1   | Cliquer sur "Mot de passe oublié ?"   | Modal avec champ email s'affiche       |       |           |
| 2   | Saisir un email inexistant et envoyer | Message d'erreur ou avertissement      |       |           |
| 3   | Saisir un email valide et envoyer     | Message de confirmation "Email envoyé" |       |           |
| 4   | Cliquer "Annuler"                     | La modal se ferme                      |       |           |

### TEST 1.3 — Inscription (demande de compte)

| #   | Action                                                   | Résultat attendu                                                                  | ✅/❌ | Remarques |
| --- | -------------------------------------------------------- | --------------------------------------------------------------------------------- | ----- | --------- |
| 1   | Cliquer "Pas encore de compte ? S'inscrire"              | Formulaire d'inscription affiché (Nom, Téléphone, Email, Mot de passe)            |       |           |
| 2   | Remplir tous les champs et soumettre                     | Message "Demande d'inscription envoyée !" — le compte nécessite approbation admin |       |           |
| 3   | Tenter de se connecter immédiatement avec le compte créé | Message indiquant que le compte n'est pas encore activé                           |       |           |

### TEST 1.4 — Demande de démo

| #   | Action                           | Résultat attendu                      | ✅/❌ | Remarques |
| --- | -------------------------------- | ------------------------------------- | ----- | --------- |
| 1   | Cliquer "Demander un accès démo" | Modal avec champs Nom, Email, Message |       |           |
| 2   | Remplir et envoyer               | Confirmation d'envoi                  |       |           |

### TEST 1.5 — Activation de compte (si lien disponible)

| #   | Action                                                 | Résultat attendu                                                              | ✅/❌ | Remarques |
| --- | ------------------------------------------------------ | ----------------------------------------------------------------------------- | ----- | --------- |
| 1   | Ouvrir un lien d'activation valide                     | Page d'activation avec email pré-rempli, champs "Mot de passe" et "Confirmer" |       |           |
| 2   | Saisir un mot de passe < 8 caractères                  | Indicateurs rouges, bouton désactivé                                          |       |           |
| 3   | Saisir deux mots de passe différents                   | Message "Les mots de passe ne correspondent pas"                              |       |           |
| 4   | Saisir un mot de passe valide (≥ 8 chars) et confirmer | Message "Compte activé !" + bouton "Se connecter"                             |       |           |
| 5   | Réutiliser le même lien d'activation                   | Message "Lien invalide" ou expiré                                             |       |           |

### TEST 1.6 — Déconnexion

| #   | Action                                      | Résultat attendu                                        | ✅/❌ | Remarques |
| --- | ------------------------------------------- | ------------------------------------------------------- | ----- | --------- |
| 1   | Cliquer sur le bouton de profil/déconnexion | Retour à la page de connexion                           |       |           |
| 2   | Appuyer sur "Retour" du navigateur          | Ne PAS pouvoir accéder à l'app (redirection vers login) |       |           |

---

## 📦 MODULE 2 — Tableau de Bord (Dashboard)

**Testeur assigné** : ******\_\_\_******
**Date de test** : ******\_\_\_******
**Note globale** : ⭐⭐⭐⭐⭐

### TEST 2.1 — Affichage général

| #   | Action                                                                       | Résultat attendu                                                              | ✅/❌ | Remarques |
| --- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----- | --------- |
| 1   | Se connecter et vérifier l'affichage du Dashboard                            | KPI affichés : nombre de véhicules, véhicules en ligne, en mouvement, alertes |       |           |
| 2   | Vérifier que les chiffres correspondent (ex: compter les véhicules en ligne) | Les KPI sont cohérents entre eux                                              |       |           |
| 3   | Vérifier l'affichage des graphiques (courbes, camemberts)                    | Les graphiques se chargent sans erreur                                        |       |           |
| 4   | Modifier la plage de dates                                                   | Les données se mettent à jour en conséquence                                  |       |           |
| 5   | Redimensionner la fenêtre du navigateur                                      | Le Dashboard est responsive, pas de texte coupé                               |       |           |

### TEST 2.2 — Navigation depuis le Dashboard

| #   | Action                                                         | Résultat attendu                        | ✅/❌ | Remarques |
| --- | -------------------------------------------------------------- | --------------------------------------- | ----- | --------- |
| 1   | Cliquer sur un KPI ou un lien de section (ex: "Voir la carte") | Navigation vers le module correspondant |       |           |
| 2   | Vérifier que les raccourcis fonctionnent                       | Chaque lien mène au bon écran           |       |           |

---

## 📦 MODULE 3 — Carte en Direct (Map)

**Testeur assigné** : ******\_\_\_******
**Date de test** : ******\_\_\_******
**Note globale** : ⭐⭐⭐⭐⭐

### TEST 3.1 — Affichage de la carte

| #   | Action                                              | Résultat attendu                                           | ✅/❌ | Remarques |
| --- | --------------------------------------------------- | ---------------------------------------------------------- | ----- | --------- |
| 1   | Ouvrir le module Carte                              | La carte s'affiche avec les véhicules positionnés          |       |           |
| 2   | Vérifier que les marqueurs s'affichent correctement | Chaque véhicule a un marqueur sur la carte                 |       |           |
| 3   | Zoomer / Dézoomer                                   | La carte répond au zoom, les marqueurs restent positionnés |       |           |
| 4   | Cliquer sur un marqueur véhicule                    | Info-bulle ou panneau avec détails (nom, vitesse, statut)  |       |           |

### TEST 3.2 — Liste des véhicules (panneau latéral)

| #   | Action                                                  | Résultat attendu                                          | ✅/❌ | Remarques |
| --- | ------------------------------------------------------- | --------------------------------------------------------- | ----- | --------- |
| 1   | Vérifier la liste des véhicules dans le panneau latéral | Liste complète avec statut (en ligne, arrêté, hors ligne) |       |           |
| 2   | Rechercher un véhicule par nom ou plaque                | La liste se filtre instantanément                         |       |           |
| 3   | Cliquer sur un véhicule dans la liste                   | La carte se centre sur ce véhicule                        |       |           |

### TEST 3.3 — Mode Replay (historique des trajets)

| #   | Action                                             | Résultat attendu                                              | ✅/❌ | Remarques |
| --- | -------------------------------------------------- | ------------------------------------------------------------- | ----- | --------- |
| 1   | Sélectionner un véhicule et activer le mode Replay | Panneau de contrôle Replay affiché                            |       |           |
| 2   | Choisir une date et lancer la lecture              | Le trajet s'anime sur la carte (le véhicule suit le parcours) |       |           |
| 3   | Mettre en pause / reprendre la lecture             | La lecture se met en pause et reprend correctement            |       |           |
| 4   | Accélérer / ralentir la vitesse de lecture         | La vitesse d'animation change                                 |       |           |
| 5   | Sélectionner une date sans données                 | Message "Aucun trajet pour cette date"                        |       |           |

### TEST 3.4 — Carte thermique (Heatmap)

| #   | Action                                          | Résultat attendu                    | ✅/❌ | Remarques |
| --- | ----------------------------------------------- | ----------------------------------- | ----- | --------- |
| 1   | Activer le mode carte thermique (si disponible) | Zone de densité de passage affichée |       |           |

---

## 📦 MODULE 4 — Gestion de Flotte (Véhicules)

**Testeur assigné** : ******\_\_\_******
**Date de test** : ******\_\_\_******
**Note globale** : ⭐⭐⭐⭐⭐

### TEST 4.1 — Liste des véhicules

| #   | Action                                             | Résultat attendu                                                                 | ✅/❌ | Remarques |
| --- | -------------------------------------------------- | -------------------------------------------------------------------------------- | ----- | --------- |
| 1   | Ouvrir le module Véhicules                         | Tableau avec la liste des véhicules (nom, plaque, statut, vitesse, dernière MAJ) |       |           |
| 2   | Trier par colonne (cliquer sur l'en-tête)          | Le tri s'applique correctement (A-Z, Z-A, etc.)                                  |       |           |
| 3   | Rechercher un véhicule par nom                     | Le filtre réduit la liste                                                        |       |           |
| 4   | Filtrer par statut (En ligne, Hors ligne, etc.)    | Seuls les véhicules du statut choisi apparaissent                                |       |           |
| 5   | Changer le mode d'affichage (Standard, Fuel, Tech) | L'affichage du tableau change avec les colonnes appropriées                      |       |           |

### TEST 4.2 — Fiche détaillée d'un véhicule

| #   | Action                                | Résultat attendu                                                        | ✅/❌ | Remarques |
| --- | ------------------------------------- | ----------------------------------------------------------------------- | ----- | --------- |
| 1   | Cliquer sur un véhicule dans la liste | Panneau de détail s'ouvre (infos, GPS, carburant, alertes, maintenance) |       |           |
| 2   | Onglet **Activité**                   | Historique des événements récents                                       |       |           |
| 3   | Onglet **GPS**                        | Position actuelle et historique GPS                                     |       |           |
| 4   | Onglet **Carburant**                  | Graphique de consommation et niveau actuel                              |       |           |
| 5   | Onglet **Maintenance**                | Prochaines maintenances et historique                                   |       |           |
| 6   | Onglet **Alertes**                    | Liste des alertes récentes pour ce véhicule                             |       |           |
| 7   | Onglet **Capteurs**                   | Données capteurs (si disponibles)                                       |       |           |
| 8   | Onglet **Violations**                 | Infractions (excès de vitesse, etc.)                                    |       |           |
| 9   | Onglet **Comportement**               | Score de conduite et statistiques                                       |       |           |
| 10  | Onglet **Dépenses**                   | Historique des dépenses associées                                       |       |           |
| 11  | Onglet **Photos**                     | Galerie de photos du véhicule                                           |       |           |
| 12  | Fermer le panneau de détail           | Le panneau se ferme proprement                                          |       |           |

### TEST 4.3 — Localisation rapide

| #   | Action                                                      | Résultat attendu                                  | ✅/❌ | Remarques |
| --- | ----------------------------------------------------------- | ------------------------------------------------- | ----- | --------- |
| 1   | Cliquer sur l'icône "localiser" d'un véhicule dans la liste | Basculement sur la carte, centrée sur ce véhicule |       |           |

---

## 📦 MODULE 5 — Prévente (CRM)

**Testeur assigné** : ******\_\_\_******
**Date de test** : ******\_\_\_******
**Note globale** : ⭐⭐⭐⭐⭐

### TEST 5.1 — Vue d'ensemble Prévente

| #   | Action                                          | Résultat attendu                                                            | ✅/❌ | Remarques |
| --- | ----------------------------------------------- | --------------------------------------------------------------------------- | ----- | --------- |
| 1   | Ouvrir le module Prévente                       | Onglet "Vue d'ensemble" avec KPI (total leads, nouveau, qualifié, gagné...) |       |           |
| 2   | Vérifier les graphiques (entonnoir, camemberts) | Les graphiques se chargent et sont cohérents                                |       |           |
| 3   | Modifier la plage de dates                      | Les KPI changent en fonction de la période                                  |       |           |

### TEST 5.2 — Leads & Pistes

| #   | Action                                                            | Résultat attendu                                                              | ✅/❌ | Remarques |
| --- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Leads"                                       | Liste des leads affichée                                                      |       |           |
| 2   | Cliquer "Ajouter un lead"                                         | Formulaire de création (Nom, Entreprise, Email, Téléphone, Source, Statut...) |       |           |
| 3   | Remplir tous les champs et sauvegarder                            | Le lead apparaît dans la liste                                                |       |           |
| 4   | Créer un lead avec un email déjà existant                         | Message d'erreur "Doublon" ou avertissement                                   |       |           |
| 5   | Modifier un lead existant                                         | La modal de modification s'ouvre avec les données pré-remplies                |       |           |
| 6   | Changer le statut d'un lead (Nouveau → Qualifié → Proposition...) | Le statut se met à jour visuellement                                          |       |           |
| 7   | Supprimer un lead                                                 | Confirmation demandée, le lead disparaît de la liste                          |       |           |
| 8   | Rechercher/filtrer les leads (par statut, source, scoring)        | Les résultats se filtrent correctement                                        |       |           |

### TEST 5.3 — Devis

| #   | Action                                  | Résultat attendu                                     | ✅/❌ | Remarques |
| --- | --------------------------------------- | ---------------------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Devis"             | Liste des devis affichée                             |       |           |
| 2   | Créer un nouveau devis                  | Formulaire avec lignes d'articles, TVA, totaux       |       |           |
| 3   | Ajouter/supprimer des lignes d'articles | Les montants se recalculent                          |       |           |
| 4   | Sauvegarder le devis                    | Le devis apparaît dans la liste avec bon statut      |       |           |
| 5   | Générer un PDF du devis                 | Le PDF s'ouvre/se télécharge avec les bonnes données |       |           |
| 6   | Convertir un devis en facture           | La facture est créée dans le module Vente            |       |           |

### TEST 5.4 — Catalogue produits

| #   | Action                                      | Résultat attendu                    | ✅/❌ | Remarques |
| --- | ------------------------------------------- | ----------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Catalogue"             | Liste des produits/services         |       |           |
| 2   | Ajouter un produit (nom, prix, description) | Le produit s'ajoute au catalogue    |       |           |
| 3   | Modifier un produit                         | Les modifications sont enregistrées |       |           |
| 4   | Supprimer un produit                        | Le produit disparaît de la liste    |       |           |

### TEST 5.5 — Tâches

| #   | Action                                                | Résultat attendu                | ✅/❌ | Remarques |
| --- | ----------------------------------------------------- | ------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Tâches"                          | Liste des tâches affichée       |       |           |
| 2   | Créer une tâche (titre, assignation, date d'échéance) | La tâche apparaît dans la liste |       |           |
| 3   | Marquer une tâche comme terminée                      | Le statut change visuellement   |       |           |
| 4   | Supprimer une tâche                                   | Confirmation puis suppression   |       |           |

### TEST 5.6 — Automatisations

| #   | Action                                | Résultat attendu                  | ✅/❌ | Remarques |
| --- | ------------------------------------- | --------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Automatisations" | Liste des règles d'automatisation |       |           |
| 2   | Créer une règle (trigger + action)    | La règle est ajoutée et active    |       |           |
| 3   | Désactiver/activer une règle          | Le basculement fonctionne         |       |           |

---

## 📦 MODULE 6 — Vente & Facturation

**Testeur assigné** : ******\_\_\_******
**Date de test** : ******\_\_\_******
**Note globale** : ⭐⭐⭐⭐⭐

### TEST 6.1 — Vue d'ensemble Ventes

| #   | Action                                          | Résultat attendu                                    | ✅/❌ | Remarques |
| --- | ----------------------------------------------- | --------------------------------------------------- | ----- | --------- |
| 1   | Ouvrir le module Vente, onglet "Vue d'ensemble" | Tableau de bord avec CA, impayés, nombre de clients |       |           |
| 2   | Modifier la plage de dates                      | Les métriques se mettent à jour                     |       |           |

### TEST 6.2 — Clients & Tiers

| #   | Action                                                  | Résultat attendu                                             | ✅/❌ | Remarques |
| --- | ------------------------------------------------------- | ------------------------------------------------------------ | ----- | --------- |
| 1   | Aller dans l'onglet "Clients & Tiers"                   | Liste complète des tiers (Clients, Fournisseurs, Revendeurs) |       |           |
| 2   | Ajouter un nouveau client (Nom, Email, Téléphone, Type) | Le client apparaît dans la liste                             |       |           |
| 3   | Ajouter un fournisseur                                  | Le fournisseur apparaît avec le bon type                     |       |           |
| 4   | Modifier les informations d'un tiers                    | Les champs se mettent à jour                                 |       |           |
| 5   | Supprimer un tiers                                      | Confirmation requise, le tiers disparaît                     |       |           |
| 6   | Filtrer par type (Client, Fournisseur, Revendeur)       | Le filtre fonctionne                                         |       |           |
| 7   | Rechercher un tiers par nom ou email                    | La recherche est instantanée                                 |       |           |
| 8   | Cliquer sur un client pour voir sa fiche détaillée      | Détails complèts : contrats, factures, historique            |       |           |

### TEST 6.3 — Contrats

| #   | Action                                                       | Résultat attendu                                           | ✅/❌ | Remarques |
| --- | ------------------------------------------------------------ | ---------------------------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Contrats"                               | Liste des contrats avec statut (Actif, Expiré, En attente) |       |           |
| 2   | Créer un nouveau contrat (client, durée, montant, véhicules) | Le contrat apparaît dans la liste                          |       |           |
| 3   | Modifier un contrat                                          | Les modifications sont sauvegardées                        |       |           |
| 4   | Voir le détail d'un contrat                                  | Modal avec récapitulatif complet                           |       |           |
| 5   | Filtrer par statut (Actif, Expiré)                           | Le filtre fonctionne correctement                          |       |           |
| 6   | Vérifier les contrats expirants                              | Les contrats proches de l'expiration sont signalés         |       |           |

### TEST 6.4 — Factures

| #   | Action                                               | Résultat attendu                                                    | ✅/❌ | Remarques |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Factures"                       | Liste des factures avec statut (Brouillon, Envoyée, Payée, Impayée) |       |           |
| 2   | Créer une facture manuellement (client, lignes, TVA) | La facture apparaît en statut "Brouillon"                           |       |           |
| 3   | Vérifier les calculs (sous-total, TVA, total TTC)    | Les montants sont corrects                                          |       |           |
| 4   | Enregistrer un paiement sur une facture              | Le statut passe à "Payée" ou "Partiellement payée"                  |       |           |
| 5   | Générer un PDF de la facture                         | PDF conforme (en-tête, lignes, totaux, mentions légales)            |       |           |
| 6   | Filtrer les factures par statut                      | Le filtre fonctionne                                                |       |           |
| 7   | Rechercher une facture par numéro ou client          | La recherche fonctionne                                             |       |           |
| 8   | Vérifier la numérotation automatique                 | Les numéros se suivent (FAC-XXXX)                                   |       |           |

---

## 📦 MODULE 7 — Comptabilité

**Testeur assigné** : ******\_\_\_******
**Date de test** : ******\_\_\_******
**Note globale** : ⭐⭐⭐⭐⭐

### TEST 7.1 — Vue d'ensemble Comptabilité

| #   | Action                        | Résultat attendu                         | ✅/❌ | Remarques |
| --- | ----------------------------- | ---------------------------------------- | ----- | --------- |
| 1   | Ouvrir le module Comptabilité | Dashboard avec solde, recettes, dépenses |       |           |
| 2   | Vérifier chaque onglet        | Les 9 onglets s'affichent sans erreur    |       |           |

### TEST 7.2 — Onglets comptabilité (vérification rapide)

| #   | Onglet       | Action | Résultat attendu                             | ✅/❌ |
| --- | ------------ | ------ | -------------------------------------------- | ----- |
| 1   | Finance      | Ouvrir | Écran Finance sans erreur                    |       |
| 2   | Recouvrement | Ouvrir | Liste des impayés avec actions de relance    |       |
| 3   | Budget       | Ouvrir | Budgets par catégorie                        |       |
| 4   | Comptabilité | Ouvrir | Journal comptable, écritures                 |       |
| 5   | Banque       | Ouvrir | Rapprochement bancaire                       |       |
| 6   | Caisse       | Ouvrir | Gestion de caisse                            |       |
| 7   | Rapports     | Ouvrir | Rapports financiers                          |       |
| 8   | Dépenses     | Ouvrir | Gestion des dépenses / factures fournisseurs |       |

### TEST 7.3 — Recouvrement (test détaillé)

| #   | Action                                        | Résultat attendu                              | ✅/❌ | Remarques |
| --- | --------------------------------------------- | --------------------------------------------- | ----- | --------- |
| 1   | Identifier une facture impayée                | Elle apparaît dans l'onglet Recouvrement      |       |           |
| 2   | Envoyer une relance (SMS, Email, ou Telegram) | Confirmation d'envoi + log dans l'historique  |       |           |
| 3   | Vérifier le statut de relance                 | Le nombre de relances envoyées est incrémenté |       |           |

---

## 📦 MODULE 8 — Interventions Techniques

**Testeur assigné** : ******\_\_\_******
**Date de test** : ******\_\_\_******
**Note globale** : ⭐⭐⭐⭐⭐

### TEST 8.1 — Vue d'ensemble Technique

| #   | Action                         | Résultat attendu                                                                   | ✅/❌ | Remarques |
| --- | ------------------------------ | ---------------------------------------------------------------------------------- | ----- | --------- |
| 1   | Ouvrir le module Interventions | Onglet "Vue d'ensemble" avec stats (interventions en cours, terminées, planifiées) |       |           |
| 2   | Vérifier les KPI               | Les chiffres correspondent à la réalité                                            |       |           |

### TEST 8.2 — Liste des interventions

| #   | Action                                                                  | Résultat attendu                                                 | ✅/❌ | Remarques |
| --- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Liste"                                             | Tableau des interventions avec statut, date, technicien          |       |           |
| 2   | Créer une nouvelle intervention                                         | Formulaire avec 3 onglets : Demande, Véhicule/Boîtier, Technique |       |           |
| 3   | Remplir l'onglet **Demande** (client, type, description, priorité)      | Champs validés                                                   |       |           |
| 4   | Remplir l'onglet **Véhicule** (sélection véhicule, IMEI, boîtier)       | Association correcte                                             |       |           |
| 5   | Remplir l'onglet **Technique** (technicien assigné, date planifiée)     | L'intervention est créée                                         |       |           |
| 6   | Modifier le statut d'une intervention (Planifiée → En cours → Terminée) | Le statut change avec mise à jour visuelle                       |       |           |
| 7   | Filtrer par statut / technicien                                         | Les filtres fonctionnent                                         |       |           |
| 8   | Supprimer une intervention                                              | Confirmation requise                                             |       |           |

### TEST 8.3 — Planning des interventions

| #   | Action                                                      | Résultat attendu                             | ✅/❌ | Remarques |
| --- | ----------------------------------------------------------- | -------------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Planning"                              | Calendrier avec les interventions planifiées |       |           |
| 2   | Vérifier que les interventions s'affichent aux bonnes dates | Correspondance avec les dates de la liste    |       |           |

### TEST 8.4 — Radar (carte des techniciens)

| #   | Action                      | Résultat attendu                                     | ✅/❌ | Remarques |
| --- | --------------------------- | ---------------------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Radar" | Carte avec position des techniciens et interventions |       |           |

### TEST 8.5 — Équipe technique

| #   | Action                         | Résultat attendu                              | ✅/❌ | Remarques |
| --- | ------------------------------ | --------------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Équipe"   | Liste des techniciens avec stats              |       |           |
| 2   | Voir le profil d'un technicien | Détails, interventions assignées, performance |       |           |

---

## 📦 MODULE 9 — Monitoring Technique

**Testeur assigné** : ******\_\_\_******
**Date de test** : ******\_\_\_******
**Note globale** : ⭐⭐⭐⭐⭐

### TEST 9.1 — Onglets du Monitoring

| #   | Onglet             | Action | Résultat attendu                                              | ✅/❌ |
| --- | ------------------ | ------ | ------------------------------------------------------------- | ----- |
| 1   | Vue d'ensemble     | Ouvrir | Dashboard avec métriques système (CPU, RAM, connexions GPS)   |       |
| 2   | Système & Pipeline | Ouvrir | Statistiques du pipeline GPS (positions/sec, buffer, latence) |       |
| 3   | Silence Radio      | Ouvrir | Liste des trackers qui ne communiquent plus                   |       |
| 4   | Anomalies          | Ouvrir | Détection d'anomalies (positions aberrantes, etc.)            |       |
| 5   | Console d'Alertes  | Ouvrir | Flux en temps réel des alertes système                        |       |
| 6   | Suivi Utilisateurs | Ouvrir | Utilisateurs connectés, activité                              |       |

### TEST 9.2 — Silence Radio (test détaillé)

| #   | Action                               | Résultat attendu                                      | ✅/❌ | Remarques |
| --- | ------------------------------------ | ----------------------------------------------------- | ----- | --------- |
| 1   | Vérifier la liste des trackers muets | Trackers sans communication récente listés            |       |           |
| 2   | Vérifier la durée de silence         | Le temps depuis la dernière communication est affiché |       |           |

---

## 📦 MODULE 10 — Matériel & Stock

**Testeur assigné** : ******\_\_\_******
**Date de test** : ******\_\_\_******
**Note globale** : ⭐⭐⭐⭐⭐

### TEST 10.1 — Vue d'ensemble Stock

| #   | Action                 | Résultat attendu                                    | ✅/❌ | Remarques |
| --- | ---------------------- | --------------------------------------------------- | ----- | --------- |
| 1   | Ouvrir le module Stock | Dashboard avec nombre de boîtiers, SIM, accessoires |       |           |

### TEST 10.2 — Boîtiers GPS

| #   | Action                                                 | Résultat attendu                                      | ✅/❌ | Remarques |
| --- | ------------------------------------------------------ | ----------------------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Boîtiers GPS"                     | Liste des boîtiers GPS avec IMEI, statut, affectation |       |           |
| 2   | Ajouter un boîtier (IMEI, modèle, N° série)            | Le boîtier apparaît en statut "En stock"              |       |           |
| 3   | Ajouter un boîtier avec un IMEI déjà existant          | Erreur "IMEI déjà enregistré"                         |       |           |
| 4   | Assigner un boîtier à un véhicule                      | Le statut passe à "Installé"                          |       |           |
| 5   | Transférer un boîtier vers un autre site/branch        | Le mouvement est enregistré                           |       |           |
| 6   | Filtrer par statut (En stock, Installé, En panne, RMA) | Le filtre fonctionne                                  |       |           |
| 7   | Voir le détail d'un boîtier                            | Historique complet (mouvements, véhicule associé)     |       |           |
| 8   | Import en masse (CSV) — si disponible                  | Les boîtiers sont importés correctement               |       |           |

### TEST 10.3 — Cartes SIM

| #   | Action                                           | Résultat attendu              | ✅/❌ | Remarques |
| --- | ------------------------------------------------ | ----------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Cartes SIM"                 | Liste des cartes SIM          |       |           |
| 2   | Ajouter une carte SIM (numéro, opérateur, ICCID) | La SIM apparaît dans la liste |       |           |
| 3   | Associer une SIM à un boîtier                    | L'association est visible     |       |           |

### TEST 10.4 — Accessoires

| #   | Action                            | Résultat attendu                             | ✅/❌ | Remarques |
| --- | --------------------------------- | -------------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Accessoires" | Liste des accessoires (câbles, relais, etc.) |       |           |
| 2   | Ajouter un accessoire             | L'accessoire apparaît                        |       |           |

### TEST 10.5 — Mouvements de stock

| #   | Action                                                                  | Résultat attendu                          | ✅/❌ | Remarques |
| --- | ----------------------------------------------------------------------- | ----------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Mouvements"                                        | Historique des entrées/sorties/transferts |       |           |
| 2   | Vérifier la cohérence (les mouvements correspondent aux actions faites) | Tout est traçable                         |       |           |

### TEST 10.6 — SAV / RMA

| #   | Action                          | Résultat attendu                 | ✅/❌ | Remarques |
| --- | ------------------------------- | -------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "SAV / RMA" | Liste des retours et réparations |       |           |
| 2   | Créer un dossier SAV            | Le dossier apparaît avec statut  |       |           |

---

## 📦 MODULE 11 — Support Client (Tickets)

**Testeur assigné** : ******\_\_\_******
**Date de test** : ******\_\_\_******
**Note globale** : ⭐⭐⭐⭐⭐

### TEST 11.1 — Dashboard Support

| #   | Action                   | Résultat attendu                                                           | ✅/❌ | Remarques |
| --- | ------------------------ | -------------------------------------------------------------------------- | ----- | --------- |
| 1   | Ouvrir le module Support | Dashboard avec métriques (tickets ouverts, en cours, résolus, temps moyen) |       |           |

### TEST 11.2 — Gestion des tickets

| #   | Action                                                            | Résultat attendu                                         | ✅/❌ | Remarques |
| --- | ----------------------------------------------------------------- | -------------------------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Tickets"                                     | Liste des tickets                                        |       |           |
| 2   | Créer un nouveau ticket (sujet, description, priorité, catégorie) | Le ticket apparaît avec statut "Ouvert"                  |       |           |
| 3   | Ajouter une pièce jointe au ticket                                | Le fichier est uploadé et visible                        |       |           |
| 4   | Répondre à un ticket (ajouter un commentaire)                     | Le commentaire apparaît dans le fil de conversation      |       |           |
| 5   | Changer le statut (Ouvert → En cours → Résolu → Fermé)            | Le statut se met à jour                                  |       |           |
| 6   | Assigner un ticket à un agent                                     | L'agent assigné est visible                              |       |           |
| 7   | Escalader un ticket                                               | La modal d'escalade s'ouvre, permet de changer le niveau |       |           |
| 8   | Filtrer par statut / priorité / catégorie                         | Les filtres fonctionnent                                 |       |           |
| 9   | Rechercher un ticket par numéro ou sujet                          | La recherche fonctionne                                  |       |           |

### TEST 11.3 — Kanban

| #   | Action                                            | Résultat attendu                    | ✅/❌ | Remarques |
| --- | ------------------------------------------------- | ----------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Kanban"                      | Vue Kanban avec colonnes par statut |       |           |
| 2   | Glisser-déposer un ticket d'une colonne à l'autre | Le statut du ticket change          |       |           |

### TEST 11.4 — SLA Monitor

| #   | Action                            | Résultat attendu                                                     | ✅/❌ | Remarques |
| --- | --------------------------------- | -------------------------------------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "SLA Monitor" | Liste des tickets avec indicateurs SLA (dans les délais / en retard) |       |           |

### TEST 11.5 — Live Chat

| #   | Action                          | Résultat attendu                         | ✅/❌ | Remarques |
| --- | ------------------------------- | ---------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Live Chat" | Interface de chat                        |       |           |
| 2   | Envoyer un message              | Le message apparaît dans la conversation |       |           |

---

## 📦 MODULE 12 — Rapports & Analyses IA

**Testeur assigné** : ******\_\_\_******
**Date de test** : ******\_\_\_******
**Note globale** : ⭐⭐⭐⭐⭐

### TEST 12.1 — Onglets de rapports

| #   | Onglet      | Action                                 | Résultat attendu                                                   | ✅/❌ |
| --- | ----------- | -------------------------------------- | ------------------------------------------------------------------ | ----- |
| 1   | Activité    | Générer un rapport d'activité véhicule | Tableau avec données d'activité (km, temps mouvement, temps arrêt) |       |
| 2   | Technique   | Générer un rapport technique           | Données techniques (connexions, alertes)                           |       |
| 3   | Carburant   | Générer un rapport carburant           | Consommation, pleins, pertes                                       |       |
| 4   | Performance | Générer un rapport de performance      | Scores de conduite, efficacité                                     |       |
| 5   | Journaux    | Consulter les journaux                 | Logs d'événements                                                  |       |
| 6   | Business    | Générer un rapport business            | CA, clients, contrats                                              |       |
| 7   | Support     | Rapport de support                     | Tickets, temps de résolution                                       |       |

### TEST 12.2 — Filtres et export

| #   | Action                                                    | Résultat attendu                                | ✅/❌ | Remarques |
| --- | --------------------------------------------------------- | ----------------------------------------------- | ----- | --------- |
| 1   | Sélectionner un (ou plusieurs) véhicule(s) et une période | Le rapport se génère pour la sélection          |       |           |
| 2   | Exporter en PDF                                           | Le PDF se télécharge avec les données correctes |       |           |
| 3   | Exporter en CSV/Excel (si disponible)                     | Le fichier se télécharge correctement           |       |           |

### TEST 12.3 — Analyse IA

| #   | Action                               | Résultat attendu                                               | ✅/❌ | Remarques |
| --- | ------------------------------------ | -------------------------------------------------------------- | ----- | --------- |
| 1   | Lancer une analyse IA sur un rapport | Modal d'analyse IA s'ouvre avec résultats                      |       |           |
| 2   | Planifier un rapport automatique     | Modal de planification avec options (fréquence, destinataires) |       |           |

---

## 📦 MODULE 13 — Agenda

**Testeur assigné** : ******\_\_\_******
**Date de test** : ******\_\_\_******
**Note globale** : ⭐⭐⭐⭐⭐

### TEST 13.1 — Calendrier

| #   | Action                                  | Résultat attendu                                                | ✅/❌ | Remarques |
| --- | --------------------------------------- | --------------------------------------------------------------- | ----- | --------- |
| 1   | Ouvrir le module Agenda                 | Calendrier avec les événements (interventions, tâches business) |       |           |
| 2   | Naviguer entre les mois                 | Les événements changent selon la période                        |       |           |
| 3   | Filtrer par type (Tous, Tech, Business) | Seuls les événements du type choisi s'affichent                 |       |           |
| 4   | Filtrer par agent/technicien            | Les événements filtrés par personne                             |       |           |
| 5   | Cliquer sur un événement                | Détail de l'intervention/tâche s'affiche                        |       |           |

---

## 📦 MODULE 14 — Administration (SuperAdmin)

**Testeur assigné** : ******\_\_\_****** _(doit avoir un compte SuperAdmin)_
**Date de test** : ******\_\_\_******
**Note globale** : ⭐⭐⭐⭐⭐

### TEST 14.1 — Inscriptions

| #   | Action                             | Résultat attendu                                  | ✅/❌ | Remarques |
| --- | ---------------------------------- | ------------------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Inscriptions" | Liste des demandes d'inscription en attente       |       |           |
| 2   | Approuver une demande              | L'utilisateur reçoit un email d'activation        |       |           |
| 3   | Rejeter une demande                | La demande disparaît ou passe en statut "Rejetée" |       |           |

### TEST 14.2 — Revendeurs

| #   | Action                                             | Résultat attendu                                            | ✅/❌ | Remarques |
| --- | -------------------------------------------------- | ----------------------------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Revendeurs"                   | Liste des revendeurs                                        |       |           |
| 2   | Créer un nouveau revendeur (nom, domaine, contact) | Le revendeur apparaît                                       |       |           |
| 3   | Configurer la marque blanche pour un revendeur     | Les paramètres de branding (logo, couleurs) se sauvegardent |       |           |

### TEST 14.3 — Paramètres Boîtiers

| #   | Action                                    | Résultat attendu                          | ✅/❌ | Remarques |
| --- | ----------------------------------------- | ----------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Paramètres Boîtiers" | Configuration des modèles de boîtiers GPS |       |           |

### TEST 14.4 — Marque Blanche

| #   | Action                               | Résultat attendu                                | ✅/❌ | Remarques |
| --- | ------------------------------------ | ----------------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Marque Blanche" | Configuration du branding (logo, couleurs, nom) |       |           |
| 2   | Modifier les couleurs et le logo     | Les changements se reflètent visuellement       |       |           |

### TEST 14.5 — Équipe (Gestion du personnel)

| #   | Action                         | Résultat attendu                        | ✅/❌ | Remarques |
| --- | ------------------------------ | --------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Équipe"   | Liste des membres de l'équipe           |       |           |
| 2   | Ajouter un utilisateur staff   | L'utilisateur est créé avec le bon rôle |       |           |
| 3   | Modifier les rôles/permissions | Les changements sont sauvegardés        |       |           |
| 4   | Désactiver un utilisateur      | L'utilisateur ne peut plus se connecter |       |           |

### TEST 14.6 — Système

| #   | Action                        | Résultat attendu                                      | ✅/❌ | Remarques |
| --- | ----------------------------- | ----------------------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Système" | Informations système (version, connexions, DB, Redis) |       |           |

### TEST 14.7 — Journal d'Audit

| #   | Action                                   | Résultat attendu                                    | ✅/❌ | Remarques |
| --- | ---------------------------------------- | --------------------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Journal d'Audit"    | Liste des actions auditées (qui a fait quoi, quand) |       |           |
| 2   | Filtrer par utilisateur ou type d'action | Les filtres fonctionnent                            |       |           |

### TEST 14.8 — Centre d'Aide

| #   | Action                              | Résultat attendu        | ✅/❌ | Remarques |
| --- | ----------------------------------- | ----------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Centre d'Aide" | Articles d'aide, FAQ    |       |           |
| 2   | Ajouter/modifier un article         | L'article se sauvegarde |       |           |

### TEST 14.9 — Documents (Templates)

| #   | Action                          | Résultat attendu                                 | ✅/❌ | Remarques |
| --- | ------------------------------- | ------------------------------------------------ | ----- | --------- |
| 1   | Aller dans l'onglet "Documents" | Templates de documents (facture, devis, contrat) |       |           |
| 2   | Modifier un template            | Les modifications sont sauvegardées              |       |           |
| 3   | Prévisualiser un template       | L'aperçu s'affiche                               |       |           |

### TEST 14.10 — Messages & Webhooks

| #   | Action                         | Résultat attendu                             | ✅/❌ | Remarques |
| --- | ------------------------------ | -------------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Messages" | Templates de messages (SMS, Email, Telegram) |       |           |
| 2   | Aller dans l'onglet "Webhooks" | Configuration des webhooks                   |       |           |

### TEST 14.11 — Intégrations

| #   | Action                                              | Résultat attendu                                            | ✅/❌ | Remarques |
| --- | --------------------------------------------------- | ----------------------------------------------------------- | ----- | --------- |
| 1   | Aller dans l'onglet "Intégrations"                  | Liste des intégrations (Orange SMS, Wave, Telegram, Resend) |       |           |
| 2   | Configurer une intégration (saisir les credentials) | La configuration se sauvegarde                              |       |           |
| 3   | Tester une intégration (ex: envoi SMS test)         | Confirmation d'envoi ou erreur explicite                    |       |           |

### TEST 14.12 — Corbeille

| #   | Action                          | Résultat attendu                           | ✅/❌ | Remarques |
| --- | ------------------------------- | ------------------------------------------ | ----- | --------- |
| 1   | Aller dans l'onglet "Corbeille" | Éléments supprimés (soft-delete)           |       |           |
| 2   | Restaurer un élément            | L'élément revient dans le module d'origine |       |           |
| 3   | Supprimer définitivement        | L'élément est supprimé de la corbeille     |       |           |

---

## 📦 MODULE 15 — Paramètres

**Testeur assigné** : ******\_\_\_******
**Date de test** : ******\_\_\_******
**Note globale** : ⭐⭐⭐⭐⭐

### TEST 15.1 — Mon compte

| #   | Action                                                    | Résultat attendu                          | ✅/❌ | Remarques |
| --- | --------------------------------------------------------- | ----------------------------------------- | ----- | --------- |
| 1   | Ouvrir Paramètres > Mon compte                            | Page profil avec infos personnelles       |       |           |
| 2   | Modifier le nom                                           | Le nom est mis à jour                     |       |           |
| 3   | Modifier le téléphone                                     | Le numéro est sauvegardé                  |       |           |
| 4   | Changer le mot de passe (ancien + nouveau + confirmation) | Message de succès                         |       |           |
| 5   | Saisir un ancien mot de passe incorrect                   | Message d'erreur                          |       |           |
| 6   | Saisir un nouveau mot de passe < 8 caractères             | Validation rejetée                        |       |           |
| 7   | Basculer le thème (Clair ↔ Sombre)                        | L'interface change immédiatement de thème |       |           |

### TEST 15.2 — Utilisateurs

| #   | Action                                                  | Résultat attendu                         | ✅/❌ | Remarques |
| --- | ------------------------------------------------------- | ---------------------------------------- | ----- | --------- |
| 1   | Ouvrir Paramètres > Utilisateurs                        | Liste des utilisateurs de l'organisation |       |           |
| 2   | Ajouter un utilisateur (email, nom, rôle, mot de passe) | L'utilisateur est créé                   |       |           |
| 3   | Modifier le rôle d'un utilisateur                       | Le rôle change                           |       |           |
| 4   | Désactiver / supprimer un utilisateur                   | L'utilisateur est désactivé/supprimé     |       |           |

### TEST 15.3 — Véhicules (Paramètres)

| #   | Action                                                | Résultat attendu                          | ✅/❌ | Remarques |
| --- | ----------------------------------------------------- | ----------------------------------------- | ----- | --------- |
| 1   | Ouvrir Paramètres > Véhicules                         | Liste des véhicules avec bouton "Ajouter" |       |           |
| 2   | Ajouter un véhicule (nom, plaque, type, IMEI boîtier) | Le véhicule apparaît dans la liste        |       |           |
| 3   | Modifier un véhicule                                  | Les champs sont mis à jour                |       |           |
| 4   | Supprimer un véhicule                                 | Le véhicule est retiré                    |       |           |

### TEST 15.4 — Zones (Geofencing)

| #   | Action                                       | Résultat attendu              | ✅/❌ | Remarques |
| --- | -------------------------------------------- | ----------------------------- | ----- | --------- |
| 1   | Ouvrir Paramètres > Zones                    | Liste des zones géographiques |       |           |
| 2   | Créer une zone (nom, dessin sur carte, type) | La zone est enregistrée       |       |           |
| 3   | Modifier une zone                            | La zone se met à jour         |       |           |
| 4   | Supprimer une zone                           | La zone est retirée           |       |           |

### TEST 15.5 — POI (Points d'intérêt)

| #   | Action                              | Résultat attendu | ✅/❌ | Remarques |
| --- | ----------------------------------- | ---------------- | ----- | --------- |
| 1   | Créer un POI (nom, position, icône) | Le POI apparaît  |       |           |

### TEST 15.6 — Maintenance

| #   | Action                                         | Résultat attendu                             | ✅/❌ | Remarques |
| --- | ---------------------------------------------- | -------------------------------------------- | ----- | --------- |
| 1   | Ouvrir Paramètres > Maintenance                | Règles de maintenance (vidange, pneus, etc.) |       |           |
| 2   | Créer une règle (type, kilométrage, fréquence) | La règle est créée                           |       |           |

### TEST 15.7 — Alertes

| #   | Action                                                         | Résultat attendu            | ✅/❌ | Remarques |
| --- | -------------------------------------------------------------- | --------------------------- | ----- | --------- |
| 1   | Ouvrir Paramètres > Alertes                                    | Règles d'alerte configurées |       |           |
| 2   | Créer une alerte (excès de vitesse > 120 km/h, sortie de zone) | La règle est enregistrée    |       |           |

### TEST 15.8 — Conducteurs

| #   | Action                                         | Résultat attendu        | ✅/❌ | Remarques |
| --- | ---------------------------------------------- | ----------------------- | ----- | --------- |
| 1   | Ouvrir Paramètres > Conducteurs                | Liste des conducteurs   |       |           |
| 2   | Ajouter un conducteur (nom, permis, téléphone) | Le conducteur apparaît  |       |           |
| 3   | Assigner un conducteur à un véhicule           | L'association est faite |       |           |

### TEST 15.9 — Branches & Groupes

| #   | Action                           | Résultat attendu    | ✅/❌ | Remarques |
| --- | -------------------------------- | ------------------- | ----- | --------- |
| 1   | Créer une branche (nom, adresse) | La branche apparaît |       |           |
| 2   | Créer un groupe de véhicules     | Le groupe est créé  |       |           |

### TEST 15.10 — Éco-conduite

| #   | Action                                          | Résultat attendu                  | ✅/❌ | Remarques |
| --- | ----------------------------------------------- | --------------------------------- | ----- | --------- |
| 1   | Ouvrir Paramètres > Éco-conduite                | Paramètres de scoring de conduite |       |           |
| 2   | Modifier les seuils (vitesse max, accélération) | Les seuils sont enregistrés       |       |           |

### TEST 15.11 — Réinitialisation & Sync

| #   | Action                                      | Résultat attendu                       | ✅/❌ | Remarques |
| --- | ------------------------------------------- | -------------------------------------- | ----- | --------- |
| 1   | Ouvrir Paramètres > Réinitialisation & Sync | Options de synchronisation des données |       |           |

### TEST 15.12 — Centre d'Aide & À propos

| #   | Action                   | Résultat attendu                               | ✅/❌ | Remarques |
| --- | ------------------------ | ---------------------------------------------- | ----- | --------- |
| 1   | Ouvrir le Centre d'aide  | Articles d'aide, FAQ, formulaire de contact    |       |           |
| 2   | Ouvrir "À propos"        | Version de l'application, informations système |       |           |
| 3   | Ouvrir "Confidentialité" | Politique de confidentialité                   |       |           |

---

## 📦 MODULE 16 — Notifications & Assistant IA

**Testeur assigné** : ******\_\_\_******
**Date de test** : ******\_\_\_******
**Note globale** : ⭐⭐⭐⭐⭐

### TEST 16.1 — Centre de notifications

| #   | Action                                                       | Résultat attendu                                      | ✅/❌ | Remarques |
| --- | ------------------------------------------------------------ | ----------------------------------------------------- | ----- | --------- |
| 1   | Cliquer sur l'icône de notification (cloche) dans le header  | Panneau de notifications glissant                     |       |           |
| 2   | Vérifier les notifications récentes                          | Liste avec type (alerte, info, succès), date, message |       |           |
| 3   | Filtrer par type (Toutes, Non lues, Alertes, Avertissements) | Le filtre fonctionne                                  |       |           |
| 4   | Marquer une notification comme lue                           | L'indicateur "non lu" disparaît                       |       |           |
| 5   | Marquer tout comme lu                                        | Toutes les notifications passent en "lu"              |       |           |

### TEST 16.2 — Assistant IA

| #   | Action                                                          | Résultat attendu                                | ✅/❌ | Remarques |
| --- | --------------------------------------------------------------- | ----------------------------------------------- | ----- | --------- |
| 1   | Ouvrir l'assistant IA (icône bulle)                             | Interface de chat IA                            |       |           |
| 2   | Poser une question (ex: "Combien de véhicules sont en ligne ?") | Réponse cohérente                               |       |           |
| 3   | Basculer en mode "Support humain"                               | La conversation est transmise à un agent humain |       |           |

---

## 📦 MODULE 17 — Tests Transversaux (Multi-module)

**Testeur assigné** : ******\_\_\_******
**Date de test** : ******\_\_\_******
**Note globale** : ⭐⭐⭐⭐⭐

### TEST 17.1 — Permissions & Accès (RBAC)

| #   | Action                                                       | Résultat attendu                                                 | ✅/❌ | Remarques |
| --- | ------------------------------------------------------------ | ---------------------------------------------------------------- | ----- | --------- |
| 1   | Se connecter avec un compte **Utilisateur simple**           | Seuls Dashboard, Carte, Flotte, Agenda, Paramètres sont visibles |       |           |
| 2   | Vérifier que le menu CRM (Prévente, Vente) n'est PAS visible | Menu masqué                                                      |       |           |
| 3   | Vérifier que le menu Admin n'est PAS visible                 | Menu masqué                                                      |       |           |
| 4   | Tenter d'accéder à une URL directe d'admin (si applicable)   | Message "Accès refusé"                                           |       |           |
| 5   | Se connecter avec un compte **Commercial**                   | Accès CRM, Ventes, mais PAS Tech ni Admin                        |       |           |
| 6   | Se connecter avec un compte **Technicien**                   | Accès Interventions, Stock, Monitoring, mais PAS CRM ni Admin    |       |           |
| 7   | Se connecter avec un compte **Support**                      | Accès Support uniquement                                         |       |           |
| 8   | Se connecter avec un compte **Admin**                        | Tout visible sauf panels SuperAdmin spécifiques                  |       |           |
| 9   | Se connecter avec un compte **SuperAdmin**                   | Tout visible, y compris Administration                           |       |           |

### TEST 17.2 — Thème sombre / clair

| #   | Action                                         | Résultat attendu                                                           | ✅/❌ | Remarques |
| --- | ---------------------------------------------- | -------------------------------------------------------------------------- | ----- | --------- |
| 1   | Passer en mode sombre                          | Toute l'interface passe en fond sombre                                     |       |           |
| 2   | Vérifier tous les modules en mode sombre       | Pas de texte invisible (texte blanc sur fond blanc), pas d'éléments cassés |       |           |
| 3   | Revenir en mode clair                          | L'interface revient en mode clair                                          |       |           |
| 4   | Vérifier la persistance après rafraîchissement | Le thème est conservé                                                      |       |           |

### TEST 17.3 — Responsive (Mobile)

| #   | Action                                                        | Résultat attendu                                      | ✅/❌ | Remarques |
| --- | ------------------------------------------------------------- | ----------------------------------------------------- | ----- | --------- |
| 1   | Ouvrir l'app sur mobile (ou réduire la fenêtre du navigateur) | L'interface s'adapte, menu hamburger visible          |       |           |
| 2   | Ouvrir le menu hamburger                                      | Le menu latéral s'affiche                             |       |           |
| 3   | Naviguer dans chaque module                                   | Les tableaux sont scrollables, pas de contenu tronqué |       |           |
| 4   | Tester la carte sur mobile                                    | La carte est utilisable (zoom pinch, pan)             |       |           |
| 5   | Tester un formulaire sur mobile (ex: créer un lead)           | Le formulaire est remplissable et soumissible         |       |           |
| 6   | Vérifier la barre de navigation en bas (safe area)            | Pas de contenu masqué derrière la navbar système      |       |           |

### TEST 17.4 — Performance

| #   | Action                                                      | Résultat attendu                                  | ✅/❌ | Remarques |
| --- | ----------------------------------------------------------- | ------------------------------------------------- | ----- | --------- |
| 1   | Mesurer le temps de chargement de la page de connexion      | < 3 secondes                                      |       |           |
| 2   | Mesurer le temps de chargement du Dashboard après connexion | < 5 secondes                                      |       |           |
| 3   | Mesurer le temps de chargement de la carte avec véhicules   | < 5 secondes                                      |       |           |
| 4   | Naviguer rapidement entre les modules (clic rapide)         | Pas de crash, pas d'écran blanc, bonne transition |       |           |
| 5   | Ouvrir un tableau avec beaucoup d'entrées (+100 lignes)     | Le défilement est fluide                          |       |           |

### TEST 17.5 — Génération de documents PDF

| #   | Action                                                          | Résultat attendu                                       | ✅/❌ | Remarques |
| --- | --------------------------------------------------------------- | ------------------------------------------------------ | ----- | --------- |
| 1   | Générer un PDF de facture                                       | PDF lisible avec en-tête, lignes, totaux               |       |           |
| 2   | Générer un PDF de devis                                         | PDF lisible et complet                                 |       |           |
| 3   | Générer un PDF de contrat                                       | PDF conforme                                           |       |           |
| 4   | Générer un rapport PDF                                          | PDF avec données correctes et graphiques si applicable |       |           |
| 5   | Vérifier que les PDFs sont en noir/blanc/gris (pas de couleurs) | Conforme à la charte                                   |       |           |

### TEST 17.6 — Temps réel (WebSocket)

| #   | Action                                     | Résultat attendu                                              | ✅/❌ | Remarques |
| --- | ------------------------------------------ | ------------------------------------------------------------- | ----- | --------- |
| 1   | Laisser la carte ouverte pendant 5 minutes | Les positions des véhicules se mettent à jour automatiquement |       |           |
| 2   | Observer un véhicule en mouvement          | Le marqueur se déplace sur la carte sans rafraîchir           |       |           |
| 3   | Vérifier les notifications temps réel      | Les alertes apparaissent en temps réel                        |       |           |

### TEST 17.7 — Multi-navigateur

| #   | Navigateur                 | Fonctionne | Problèmes éventuels |
| --- | -------------------------- | ---------- | ------------------- |
| 1   | Chrome (dernière version)  | ✅/❌      |                     |
| 2   | Firefox (dernière version) | ✅/❌      |                     |
| 3   | Safari (si Mac/iPhone)     | ✅/❌      |                     |
| 4   | Edge                       | ✅/❌      |                     |
| 5   | Chrome Android             | ✅/❌      |                     |
| 6   | Safari iOS                 | ✅/❌      |                     |

---

## 📦 MODULE 18 — Tests de Sécurité (basiques)

**Testeur assigné** : ******\_\_\_****** _(profil technique recommandé)_
**Date de test** : ******\_\_\_******
**Note globale** : ⭐⭐⭐⭐⭐

### TEST 18.1 — Sécurité de base

| #   | Action                                                                 | Résultat attendu                                | ✅/❌ | Remarques |
| --- | ---------------------------------------------------------------------- | ----------------------------------------------- | ----- | --------- |
| 1   | Vérifier que le site est en HTTPS                                      | Cadenas vert dans la barre d'adresse            |       |           |
| 2   | Tenter plusieurs connexions échouées (>5 en 15 min)                    | Blocage temporaire (rate limiting)              |       |           |
| 3   | Copier l'URL d'une page authentifiée et l'ouvrir en navigation privée  | Redirection vers la page de connexion           |       |           |
| 4   | Inspecter le stockage local (F12 > Application > Local Storage)        | Pas de mot de passe en clair stocké             |       |           |
| 5   | Vérifier que l'API ne renvoie pas de `password_hash` dans les réponses | Champ absent des données JSON (console Network) |       |           |

### TEST 18.2 — Isolation des données (Multi-tenant)

| #   | Action                                                 | Résultat attendu                             | ✅/❌ | Remarques |
| --- | ------------------------------------------------------ | -------------------------------------------- | ----- | --------- |
| 1   | Se connecter avec le compte Client A                   | Seules les données du Client A sont visibles |       |           |
| 2   | Se connecter avec le compte Client B (autre tenant)    | Seules les données du Client B sont visibles |       |           |
| 3   | Vérifier qu'aucune donnée de l'autre client n'apparaît | Isolation totale entre tenants               |       |           |

---

## 📊 FEUILLE DE SYNTHÈSE

| #   | Module              | Testeur | Date | Note | Bugs trouvés | Bloquants |
| --- | ------------------- | ------- | ---- | ---- | ------------ | --------- |
| 1   | Authentification    |         |      | /5   |              |           |
| 2   | Dashboard           |         |      | /5   |              |           |
| 3   | Carte en direct     |         |      | /5   |              |           |
| 4   | Gestion de flotte   |         |      | /5   |              |           |
| 5   | Prévente (CRM)      |         |      | /5   |              |           |
| 6   | Vente & Facturation |         |      | /5   |              |           |
| 7   | Comptabilité        |         |      | /5   |              |           |
| 8   | Interventions Tech  |         |      | /5   |              |           |
| 9   | Monitoring          |         |      | /5   |              |           |
| 10  | Stock & Matériel    |         |      | /5   |              |           |
| 11  | Support (Tickets)   |         |      | /5   |              |           |
| 12  | Rapports IA         |         |      | /5   |              |           |
| 13  | Agenda              |         |      | /5   |              |           |
| 14  | Administration      |         |      | /5   |              |           |
| 15  | Paramètres          |         |      | /5   |              |           |
| 16  | Notifications & IA  |         |      | /5   |              |           |
| 17  | Tests transversaux  |         |      | /5   |              |           |
| 18  | Sécurité            |         |      | /5   |              |           |

---

## 📌 MODÈLE DE FICHE DE BUG

```
┌────────────────────────────────────────────┐
│              FICHE DE BUG #___             │
├────────────────────────────────────────────┤
│ Date        : ___/___/2026                 │
│ Testeur     : ___________________________ │
│ Module      : ___________________________ │
│ Sévérité    : 🔴 / 🟠 / 🟡 / 🔵          │
│ Navigateur  : ___________________________ │
│ Appareil    : ___________________________ │
├────────────────────────────────────────────┤
│ ÉTAPES POUR REPRODUIRE :                   │
│ 1. _______________________________________ │
│ 2. _______________________________________ │
│ 3. _______________________________________ │
├────────────────────────────────────────────┤
│ RÉSULTAT ATTENDU :                         │
│ __________________________________________ │
├────────────────────────────────────────────┤
│ RÉSULTAT OBTENU :                          │
│ __________________________________________ │
├────────────────────────────────────────────┤
│ CAPTURE D'ÉCRAN : [joindre image]          │
├────────────────────────────────────────────┤
│ NOTES SUPPLÉMENTAIRES :                    │
│ __________________________________________ │
└────────────────────────────────────────────┘
```

---

> **Deadline de retour** : ******\_\_\_******
> **Contact pour questions** : ******\_\_\_******
> **Retour des fiches à** : ******\_\_\_******
