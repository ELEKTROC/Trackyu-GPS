# Skill — CRM & Intégrations clients TrackYu

## Modules CRM

- **Tiers** : clients, fournisseurs, revendeurs (table `tiers`)
- **Clients** : comptes avec accès à la plateforme (table `clients`)
- **Leads** : prospects en pipeline de vente (tables `leads`, `pipeline_stages`, `pipeline_movements`)
- **Contrats** : liés 1-pour-1 aux abonnements véhicules
- **Contacts** : `client_contacts`, `tier_contacts`
- **Follow-ups** : `follow_ups`, `dunning_sequences`, `dunning_actions`

## Hiérarchie

```
Tenant (revendeur ou TrackYu direct)
  └── Client (tier payant)
        └── Véhicule ←→ Abonnement ←→ Contrat
```

## Intégration Zoho Books

- Tables : `zoho_invoices`, `zoho_payments`, `zoho_recurring_invoices`, `zoho_quotes`, `zoho_quote_items`
- Sync bidirectionnelle via webhooks
- Credentials stockés dans `integration_credentials` (chiffrés)
- Contrôleur : `integrationCredentialsController`

## Intégration SMS

- Container `sms-app-app-1` (service séparé sur le VPS)
- Templates : table `message_templates`
- Logs : table `email_logs`
- Envoi via `sendController`

## Pipeline de vente

```
Lead → Qualified → Demo → Proposal → Negotiation → Closed Won/Lost
```

Stages configurables par tenant dans `sales_pipelines`.

## Règles CRM

- Un client (`CLIENT` role) a accès lecture seule à ses véhicules uniquement
- Isolation stricte : un ADMIN d'un tenant ne voit jamais les clients d'un autre tenant
- RESELLER = gère ses propres clients (équivalent ADMIN dans son périmètre)

## Reporting CRM

- `resellerStatsController` — stats par revendeur
- `recoveryController` — gestion des impayés (`recovery_dashboard`)
- `leadScoringController` — scoring automatique des leads

## Automatisations CRM

- `crm_rules` — règles déclenchées sur événements CRM
- `automation_rules` — workflow automatisé (ex: email après signature contrat)

---

## Rapports liés (docs/)

Voir l'index complet dans [`docs/README.md`](../../docs/README.md). Rapports pertinents pour ce skill : `docs/modules/crm/AUDIT_CRM_MODULE.md`.

> ⚠️ Ces rapports peuvent être obsolètes — vérifier la date avant de s'y fier. En cas de contradiction avec le code ou la prod, c'est le code/prod qui fait foi.
>
> **Tout nouveau rapport doit être rangé dans `docs/<thème>/`** selon l'organisation décrite dans `docs/README.md`.
