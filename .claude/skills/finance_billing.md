# Skill — Finance & Facturation TrackYu

## Modèle économique

```
1 véhicule = 1 tracker = 1 abonnement = 1 contrat (règle absolue)
```

Abonnements récurrents mensuels/annuels par véhicule tracké.

## Tables clés

| Table                | Rôle                                             |
| -------------------- | ------------------------------------------------ |
| `subscriptions`      | Abonnement par véhicule (statut, dates, montant) |
| `contracts`          | Contrat client                                   |
| `invoices`           | Factures générées                                |
| `payments`           | Paiements reçus                                  |
| `tiers`              | Tiers (clients, fournisseurs)                    |
| `accounting_entries` | Écritures comptables                             |
| `fiscal_years`       | Exercices fiscaux                                |
| `chart_of_accounts`  | Plan comptable                                   |
| `zoho_invoices`      | Sync Zoho Books                                  |

## Moteur récurrent

- Génération automatique des factures récurrentes à l'échéance
- Chaque abonnement a `next_billing_date`, `billing_cycle` (MONTHLY/ANNUAL)
- Fix critique appliqué : ARD et TETRATECH (client migré) avaient des doublons de facturation

## Cas AUTOCHEK (CLI-SMT-00044)

~595 renouvellements manquants 2023-2025 — régularisation en cours. Phase 0 mapping ABO.
Ne pas modifier les abonnements AUTOCHEK sans vérification préalable.

## Intégration Zoho Books

Tables : `zoho_invoices`, `zoho_payments`, `zoho_recurring_invoices`, `zoho_quotes`
Sync via `integrationCredentialsController` + webhooks Zoho.

## Règles de codage finance

- Montants toujours en entiers (centimes) ou `DECIMAL(15,2)` — jamais `float`
- Arrondi : `Math.round(montant * 100) / 100`
- Devise par tenant (paramètre settings) — utiliser le hook `useCurrency()`
- Jamais recalculer un solde côté client — toujours charger depuis l'API

## Modules frontend

- `features/finance/` — vue principale Finance
- `features/crm/` — contrats, tiers, facturation CRM
- Hook `useCurrency()` pour affichage des montants avec la devise du tenant

## Numérotation automatique

Factures, contrats, devis : séquences auto via `numberingController` + table `number_counters`.
Format configurable par tenant (ex: `FAC-2026-0001`).

---

## Rapports liés (docs/)

Voir l'index complet dans [`docs/README.md`](../../docs/README.md). Rapports pertinents pour ce skill : `docs/modules/finance/AUDIT_FINANCE_MODULE.md`.

> ⚠️ Ces rapports peuvent être obsolètes — vérifier la date avant de s'y fier. En cas de contradiction avec le code ou la prod, c'est le code/prod qui fait foi.
>
> **Tout nouveau rapport doit être rangé dans `docs/<thème>/`** selon l'organisation décrite dans `docs/README.md`.
