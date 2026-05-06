# Skill — Conformité & Sécurité des données TrackYu

## Cadre réglementaire applicable

| Règlement                           | Portée                | Impact TrackYu                                      |
| ----------------------------------- | --------------------- | --------------------------------------------------- |
| RGPD / GDPR                         | UE + résidents UE     | Données GPS = données personnelles                  |
| Loi Informatique et Libertés        | France                | Si clients français                                 |
| OHADA                               | Afrique Subsaharienne | Facturation, contrats                               |
| Loi ivoirienne sur la cybersécurité | Côte d'Ivoire         | Données hébergées hors CI → info client obligatoire |

## Données personnelles dans TrackYu

### Ce qui est considéré donnée personnelle

- **Position GPS** d'un véhicule tracé à un chauffeur nominatif
- **IMEI** — identifiant unique d'un appareil
- **Historique de trajets** — reconstitution de déplacements personnels
- **Données d'éco-conduite** — comportement individuel du conducteur

### Ce qui n'est PAS personnel (par défaut)

- Position d'un véhicule de société sans chauffeur assigné
- Stats agrégées (flotte entière)
- Alertes techniques (batterie faible, déconnexion GPS)

## Règles de stockage et accès

```
SUPERADMIN       → accès total (audit uniquement, pas opérationnel)
ADMIN/MANAGER    → accès limité à leur tenant
CLIENT           → lecture seule ses propres véhicules
Logs d'accès     → table audit_logs (qui a accédé à quoi, quand)
```

## Isolation tenant — règle absolue

```sql
-- Toujours filtrer par tenant_id dans les requêtes
WHERE o.tenant_id = $tenantId

-- Ne jamais exposer des données cross-tenant sauf SUPERADMIN
-- Tests d'isolation : voir testing.md
```

## Retention des données

| Type          | Durée recommandée              | Implémentation actuelle        |
| ------------- | ------------------------------ | ------------------------------ |
| Positions GPS | 12 mois glissants              | Non implémenté (tout conservé) |
| Logs d'alerte | 6 mois                         | Non implémenté                 |
| Logs d'audit  | 24 mois                        | Non implémenté                 |
| Factures      | 10 ans (comptable)             | Zoho gère                      |
| Tokens JWT    | 15 min (access) / 7j (refresh) | ✅ Implémenté                  |

**Action à planifier** : politique de purge automatique positions > 18 mois.

## Sécurité des credentials

```javascript
// Credentials Zoho/SMS : chiffrés en DB
// Table integration_credentials — jamais en clair dans le code
// Variables d'environnement : .env sur VPS (jamais committé)
```

**Ne jamais committer dans le repo** :

- `.env` files
- Clés API (Anthropic, Zoho, SMS)
- Mots de passe base de données
- Certificats SSL privés

## Logs et traçabilité

```sql
-- table audit_logs (à alimenter sur actions sensibles)
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  tenant_id INTEGER,
  action VARCHAR(100),  -- 'vehicle.immobilize', 'user.delete', etc.
  resource_type VARCHAR(50),
  resource_id INTEGER,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Actions à loguer obligatoirement :

- Immobilisation / déverrouillage véhicule
- Suppression d'entité (véhicule, client, utilisateur)
- Modification de rôle utilisateur
- Export de données (CSV, rapport)
- Connexion / échec de connexion

## Chiffrement en transit

- HTTPS uniquement (nginx → Let's Encrypt)
- Connexion TCP GPS (port 5000) : **non chiffrée** — à noter dans la doc client
- API backend : HTTPS via reverse proxy nginx
- WebSocket : WSS (via nginx upgrade)

## IMEI et données de balise

- L'IMEI est un identifiant de matériel, pas une donnée personnelle en soi
- Devient personnel si associé à un conducteur nominatif
- Afficher IMEI complet uniquement à ADMIN+ (jamais au rôle CLIENT)

## Conformité facturation (OHADA)

- Numérotation séquentielle des factures obligatoire
- Mentions légales : RCCM, NIF, siège social sur chaque facture
- Archivage 10 ans minimum
- Devise locale obligatoire sur les factures (XOF, XAF, MAD…)

## Checklist avant déploiement prod

- [ ] Pas de donnée personnelle dans les logs applicatifs
- [ ] Pas de credential en clair dans le code source
- [ ] Isolation tenant vérifiée sur les nouveaux endpoints
- [ ] Actions sensibles loguées dans audit_logs
- [ ] HTTPS configuré sur les nouveaux domaines/sous-domaines
