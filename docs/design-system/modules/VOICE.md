# Module Spec — VOICE

> **Spec auto-suffisante.** Une session Claude lit ce fichier + STATE.md + CLAUDE.md, et a tout pour construire le module de A à Z.

---

## 0. Identité du module

| Champ                   | Valeur                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| **Nom court**           | Voice                                                                                       |
| **Nom complet**         | Centre d'appels IA                                                                          |
| **View enum**           | `View.VOICE`                                                                                |
| **URL cible V2**        | `/voice`                                                                                    |
| **Type**                | 🟪 Atypique (module transverse — consomme Finance, CRM, Support, Alertes GPS)               |
| **Statut construction** | ⬜ À FAIRE                                                                                  |
| **Priorité**            | P2 (après Fleet / CRM / Finance stabilisés)                                                 |
| **Dépendances**         | Finance (abonnements), CRM (leads, devis), Support (tickets), Alertes GPS (pipeline events) |

---

## 1. Vision produit

### Proposition de valeur

TrackYu Voice AI permet d'automatiser les interactions téléphoniques avec les clients finaux des tenants : recouvrement, fidélisation, relance commerciale, satisfaction, alertes critiques.

L'IA vocale est orchestrée par **VAPI** (plateforme voice AI). Le "cerveau" de la conversation est un **LLM** externe choisi par flux :

- **Flux sensibles** (recouvrement, fidélisation, leads chauds) → **Claude Haiku** (Anthropic)
- **Flux simples** (alertes, CSAT, relances légères) → **Groq + Llama 3.3 70B** (gratuit, ultra-rapide)
- **Fallback** si Groq rate-limité → **Gemini Flash** (gratuit)

### Chaîne technique d'un appel

```
Voix humaine
    │
    ▼
Speech-to-Text (Deepgram — intégré VAPI)
    │
    ▼
LLM — contexte client injecté depuis TrackYu DB
    │
    ▼
Text-to-Speech (voix FR — ElevenLabs ou Azure)
    │
    ▼
Réponse vocale → Client final
```

---

## 2. Les 6 flux d'appels

### Flux 1 — Recouvrement

| Attribut              | Valeur                                                                |
| --------------------- | --------------------------------------------------------------------- |
| **Direction**         | Outbound                                                              |
| **Déclencheur**       | Abonnement expiré depuis N jours (configurable : défaut 7j, 15j, 30j) |
| **Source données**    | `subscriptions` (Finance) → statut expired/overdue                    |
| **LLM**               | Claude Haiku                                                          |
| **Appelé**            | Contact facturation du compte client (tenant)                         |
| **Script IA**         | Rappel échéance · montant dû · lien paiement par SMS après appel      |
| **Si pas de réponse** | Message vocal automatique laissé                                      |
| **Action post-appel** | Log "promesse paiement" → Finance · SMS envoyé                        |

### Flux 2 — Fidélisation

| Attribut              | Valeur                                                                        |
| --------------------- | ----------------------------------------------------------------------------- |
| **Direction**         | Outbound                                                                      |
| **Déclencheur**       | J-30 avant expiration contrat OU inactivité plateforme > 14 jours             |
| **Source données**    | `subscriptions` + logs connexion                                              |
| **LLM**               | Claude Haiku                                                                  |
| **Appelé**            | Contact principal du compte (ADMIN tenant)                                    |
| **Script IA**         | Renouvellement anticipé · offre exclusive · transfert signal intérêt vers CRM |
| **Si pas de réponse** | Message vocal                                                                 |
| **Action post-appel** | Flag "intéressé/non intéressé" → CRM                                          |

### Flux 3 — Relance Lead

| Attribut              | Valeur                                                            |
| --------------------- | ----------------------------------------------------------------- |
| **Direction**         | Outbound                                                          |
| **Déclencheur**       | Lead sans réponse depuis N jours (configurable : défaut 3j, 7j)   |
| **Source données**    | CRM → table `leads` · statut non-répondu                          |
| **LLM**               | Claude Haiku                                                      |
| **Appelé**            | Contact du lead                                                   |
| **Script IA**         | Rappel de l'intérêt exprimé · qualification rapide · prise de RDV |
| **Si pas de réponse** | Message vocal                                                     |
| **Action post-appel** | Mise à jour statut lead CRM · log tentative                       |

### Flux 4 — Relance Devis

| Attribut              | Valeur                                                              |
| --------------------- | ------------------------------------------------------------------- |
| **Direction**         | Outbound                                                            |
| **Déclencheur**       | Devis sans signature depuis N jours (configurable : défaut 5j, 10j) |
| **Source données**    | CRM → table `quotes` · statut envoyé/non signé                      |
| **LLM**               | Claude Haiku                                                        |
| **Appelé**            | Contact du devis                                                    |
| **Script IA**         | Rappel du devis · réponse aux objections · relance signature        |
| **Si pas de réponse** | Message vocal                                                       |
| **Action post-appel** | Mise à jour statut devis · log tentative                            |

### Flux 5 — Notation CSAT

| Attribut              | Valeur                                                 |
| --------------------- | ------------------------------------------------------ |
| **Direction**         | Outbound                                               |
| **Déclencheur**       | Ticket Support clôturé OU intervention Tech terminée   |
| **Source données**    | Support/Tech → événement fermeture                     |
| **LLM**               | Groq + Llama 3.3 (gratuit)                             |
| **Appelé**            | Client concerné par le ticket/intervention             |
| **Script IA**         | 2 questions max · score 1-5 · commentaire libre        |
| **Si pas de réponse** | Pas de message (non intrusif)                          |
| **Action post-appel** | Score CSAT stocké DB · visible dans Support + Rapports |

### Flux 6 — Alerte Critique

| Attribut              | Valeur                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------- |
| **Direction**         | Outbound (temps réel)                                                                       |
| **Déclencheur**       | Event GPS critique : zone interdite · vitesse excessive · coupure alim · carburant critique |
| **Source données**    | Pipeline alertes GPS (events)                                                               |
| **LLM**               | Groq + Llama 3.3 (ultra-rapide — latence critique)                                          |
| **Appelé**            | Responsable flotte configuré par le tenant                                                  |
| **Script IA**         | Annonce alerte + véhicule + heure · acquittement demandé                                    |
| **Si pas de réponse** | Re-essai 1× puis escalade (notification push + email)                                       |
| **Action post-appel** | Acquittement logué · alerte fermée si acquittée                                             |

### Flux 7 — Inbound (entrant)

| Attribut           | Valeur                                                                                |
| ------------------ | ------------------------------------------------------------------------------------- |
| **Direction**      | Inbound                                                                               |
| **Déclencheur**    | Client final appelle le numéro TrackYu/Tenant                                         |
| **Disponibilité**  | 24h/24, 7j/7                                                                          |
| **Identification** | Numéro appelant → lookup compte DB                                                    |
| **LLM**            | Claude Haiku (contexte riche nécessaire)                                              |
| **Capacités IA**   | Statut abonnement · état véhicules · dernier ticket · horaires prochaine intervention |
| **Action**         | Log appel entrant · résumé IA · si non résolu → ticket Support créé automatiquement   |

---

## 3. Architecture technique

### Vue d'ensemble

```
TrackYu Backend (trackyu-backend/)
      │
      ├── Scheduler (node-cron)
      │   ├── Recouvrement : quotidien 9h
      │   ├── Fidélisation : hebdo lundi 10h
      │   ├── Relance leads : quotidien 10h30
      │   ├── Relance devis : quotidien 11h
      │   └── CSAT : immédiat post-clôture (event-driven)
      │
      ├── Alert Pipeline (temps réel)
      │   └── Flux 6 : déclenchement immédiat sur event GPS critique
      │
      │         → POST /voice/calls (VAPI API)
      │
      ▼
  VAPI Platform
      ├── Orchestre l'appel (STT + LLM + TTS)
      ├── Injecte le contexte client (via VAPI server-url webhook)
      └── POST /api/v1/voice/webhook (résultat appel)
      │
      ▼
TrackYu Backend — traitement webhook
      ├── Loguer appel (table voice_calls)
      ├── Mettre à jour Finance / CRM / Support selon flux
      └── Émettre Socket.IO event → frontend mis à jour temps réel
```

### Endpoints backend à créer

| Méthode | Endpoint                      | Rôle                                                   |
| ------- | ----------------------------- | ------------------------------------------------------ |
| `POST`  | `/api/v1/voice/webhook`       | Réception résultats appel VAPI                         |
| `POST`  | `/api/v1/voice/server-url`    | Contexte dynamique injecté pendant l'appel (VAPI pull) |
| `GET`   | `/api/v1/voice/calls`         | Liste historique appels (filtres tenant, flux, statut) |
| `GET`   | `/api/v1/voice/calls/:id`     | Détail appel (transcript, durée, actions)              |
| `GET`   | `/api/v1/voice/campaigns`     | Liste campagnes actives                                |
| `POST`  | `/api/v1/voice/campaigns`     | Créer/activer campagne                                 |
| `PATCH` | `/api/v1/voice/campaigns/:id` | Modifier paramètres campagne                           |
| `POST`  | `/api/v1/voice/calls/trigger` | Déclencher appel manuel                                |

### Table DB `voice_calls`

```sql
CREATE TABLE voice_calls (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  flow_type       VARCHAR(20) NOT NULL, -- 'recouvrement'|'fidelisation'|'lead'|'devis'|'csat'|'alerte'|'inbound'
  vapi_call_id    VARCHAR(100),
  caller_number   VARCHAR(20),
  callee_number   VARCHAR(20) NOT NULL,
  callee_name     VARCHAR(200),
  status          VARCHAR(20) NOT NULL, -- 'initiated'|'ringing'|'answered'|'voicemail'|'failed'|'completed'
  duration_sec    INTEGER,
  transcript      TEXT,
  summary_ai      TEXT,
  score_csat      INTEGER CHECK (score_csat BETWEEN 1 AND 5),
  action_taken    JSONB,               -- {type, value} ex: {type:'promise_payment', value:'2026-05-15'}
  llm_provider    VARCHAR(50),         -- 'claude-haiku'|'groq-llama3'|'gemini-flash'
  cost_usd        NUMERIC(8,4),
  reference_id    UUID,                -- ID subscription / lead / devis / ticket selon flux
  reference_type  VARCHAR(30),         -- 'subscription'|'lead'|'quote'|'ticket'|'alert'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_calls_tenant ON voice_calls(tenant_id, created_at DESC);
CREATE INDEX idx_voice_calls_flow ON voice_calls(flow_type, status);
```

### Table DB `voice_campaigns`

```sql
CREATE TABLE voice_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID,                -- NULL = global TrackYu
  flow_type       VARCHAR(20) NOT NULL,
  name            VARCHAR(200) NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  trigger_config  JSONB NOT NULL,      -- {delay_days, max_attempts, retry_delay_hours}
  schedule_config JSONB NOT NULL,      -- {days_of_week, start_hour, end_hour} légal FR 8h-20h
  llm_provider    VARCHAR(50),
  vapi_assistant_id VARCHAR(100),
  phone_number    VARCHAR(20),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. RBAC — qui voit quoi

Référence : [`../RBAC_MATRIX.md`](../RBAC_MATRIX.md)

| Rôle                               | Accès Voice                                              |
| ---------------------------------- | -------------------------------------------------------- |
| SUPERADMIN                         | Toutes campagnes · tous tenants · config globale · coûts |
| Staff TKY (TECH/ADMIN_TKY)         | Toutes campagnes · historique cross-tenant               |
| ADMIN tenant                       | Campagnes de son tenant · historique · config            |
| MANAGER (désigné)                  | Lecture historique appels uniquement                     |
| COMMERCIAL                         | Historique leads/devis uniquement                        |
| Autres rôles (CLIENT, TECH_FIELD…) | Aucun accès                                              |

### Isolation tenant

- ADMIN voit uniquement les appels de son tenant
- SUPERADMIN voit tout avec sélecteur tenant
- Le webhook VAPI vérifie le tenant_id avant d'injecter le contexte

---

## 5. Structure UI — Module Voice

### Layout général

Page Voice = AppShell standard + SubHeader onglets + contenu principal

```
/voice
├── /voice/dashboard      → Vue d'ensemble (KPIs + activité récente)
├── /voice/campaigns      → Campagnes actives (config + activation)
├── /voice/history        → Historique tous appels (table dense + détail drawer)
├── /voice/settings       → Paramètres (numéros, horaires, LLM, VAPI keys)
└── /voice/numbers        → Gestion numéros de téléphone
```

### Écrans principaux

#### 1. Voice Dashboard (`/voice/dashboard`)

```
┌─────────────────────────────────────────────────────────────┐
│  KPIs                                                        │
│  [Appels aujourd'hui] [Taux réponse %] [Durée moy.] [Coût]  │
├─────────────────────────────────────────────────────────────┤
│  Activité par flux (barres)         │  Statuts appels (donut)│
│  Recouvrement ████                  │  Aboutis    ██ 67%    │
│  Fidélisation ██                    │  Messagerie █  22%    │
│  Leads ███                          │  Échecs     ▌  11%    │
│  Devis ██                           │                       │
│  CSAT █                             │                       │
│  Alertes ██                         │                       │
├─────────────────────────────────────────────────────────────┤
│  Derniers appels                                             │
│  [Nom] [Flux] [Statut] [Durée] [Action] [Heure]             │
│  ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

#### 2. Campagnes (`/voice/campaigns`)

```
┌────────────────────────────────────────────────────────────┐
│  + Nouvelle campagne                                        │
├────────────────────────────────────────────────────────────┤
│  [Card Recouvrement]          [Card Fidélisation]           │
│  Statut: ACTIF ●              Statut: ACTIF ●               │
│  Déclencheur: J+7             Déclencheur: J-30             │
│  LLM: Claude Haiku            LLM: Claude Haiku             │
│  214 appels ce mois           87 appels ce mois             │
│  [Configurer] [Pause]         [Configurer] [Pause]          │
├────────────────────────────────────────────────────────────┤
│  [Card Relance Lead]          [Card Relance Devis]          │
│  [Card CSAT]                  [Card Alertes Critiques]      │
└────────────────────────────────────────────────────────────┘
```

#### 3. Historique (`/voice/history`)

Table dense avec drawer détail (460px droite) :

| Colonnes       | Notes                                    |
| -------------- | ---------------------------------------- |
| Date/heure     | Tri par défaut DESC                      |
| Contact        | Nom + numéro                             |
| Flux           | Badge coloré par type                    |
| Statut         | Abouti / Messagerie / Échec              |
| Durée          | mm:ss                                    |
| Action générée | Promesse paiement / Flag CRM / Score / — |
| LLM utilisé    | Icône Claude/Groq/Gemini                 |
| Coût           | En USD (SUPERADMIN uniquement)           |

**Drawer détail appel** :

- Transcript complet
- Résumé IA (2-3 phrases)
- Score CSAT si applicable
- Action générée
- Bouton "Réécouter" (enregistrement si activé)

#### 4. Configuration campagne (modale / drawer)

```
Nom de la campagne
Flux : [Recouvrement ▼]
─────────────────────
Déclencheur
  Délai après événement : [7] jours
  Tentatives max : [3]
  Délai entre tentatives : [48] heures
─────────────────────
Horaires d'appel (légal FR : 8h-20h lun-sam)
  Jours : [☑ Lun] [☑ Mar] [☑ Mer] [☑ Jeu] [☑ Ven] [☐ Sam] [☐ Dim]
  Plage : [09:00] → [19:00]
─────────────────────
LLM
  [● Claude Haiku] [○ Groq Llama 3] [○ Gemini Flash]
─────────────────────
Numéro sortant : [+225 XX XX XX XX ▼]
─────────────────────
[Annuler] [Sauvegarder]
```

---

## 6. i18n — clés à créer

```json
{
  "voice": {
    "title": "Centre d'appels IA",
    "subtitle": "{{count}} appels aujourd'hui · {{rate}}% de taux de réponse",
    "flows": {
      "recouvrement": "Recouvrement",
      "fidelisation": "Fidélisation",
      "lead": "Relance lead",
      "devis": "Relance devis",
      "csat": "Notation CSAT",
      "alerte": "Alerte critique",
      "inbound": "Appel entrant"
    },
    "status": {
      "initiated": "En cours",
      "ringing": "Sonnerie",
      "answered": "Abouti",
      "voicemail": "Messagerie",
      "failed": "Échoué",
      "completed": "Terminé"
    },
    "campaigns": {
      "title": "Campagnes",
      "active": "Actif",
      "paused": "En pause",
      "configure": "Configurer",
      "pause": "Mettre en pause",
      "resume": "Reprendre"
    },
    "history": {
      "title": "Historique des appels",
      "transcript": "Transcript",
      "summary": "Résumé IA",
      "action": "Action générée",
      "duration": "Durée",
      "cost": "Coût"
    },
    "kpis": {
      "callsToday": "Appels aujourd'hui",
      "answerRate": "Taux de réponse",
      "avgDuration": "Durée moyenne",
      "costMonth": "Coût ce mois"
    }
  }
}
```

---

## 7. Contraintes légales & RGPD

| Contrainte             | Règle                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------ |
| **Horaires légaux FR** | Appels sortants : lun-sam 8h00-20h00 uniquement (loi Hamon)                          |
| **Consentement**       | Opt-in explicite requis avant appel sortant commercial (CSAT, fidélisation, relance) |
| **Recouvrement**       | Autorisé sans consentement si relation commerciale existante                         |
| **Alertes critiques**  | Autorisé (sécurité, intérêt légitime)                                                |
| **Transcript**         | Chiffré au repos · rétention max 90 jours (configurable) · RGPD art. 5               |
| **Enregistrement**     | Mention légale obligatoire en début d'appel si enregistré                            |
| **Liste noire**        | Mécanisme opt-out obligatoire — numéro → jamais rappelé                              |

---

## 8. Coûts estimés

### Par appel (3 min)

| Composant       | Flux simple (Groq) | Flux sensible (Claude) |
| --------------- | ------------------ | ---------------------- |
| VAPI plateforme | ~0.15$             | ~0.15$                 |
| LLM             | ~0.00$ (gratuit)   | ~0.02$                 |
| STT + TTS       | ~0.10$             | ~0.10$                 |
| **Total**       | **~0.25$/appel**   | **~0.27$/appel**       |

### Volumes prévisionnels

| Volume mensuel | Coût/mois |
| -------------- | --------- |
| 100 appels     | ~25$      |
| 500 appels     | ~130$     |
| 2 000 appels   | ~530$     |

→ À refacturer en option premium aux tenants si souhaité.

---

## 9. États visuels

| État                     | Comportement                                         |
| ------------------------ | ---------------------------------------------------- |
| **Loading dashboard**    | Skeleton KPI cards + skeleton table                  |
| **Campagne sans appels** | EmptyState "Aucun appel cette période"               |
| **Appel en cours**       | Badge animé "En cours" dans la liste temps réel      |
| **Erreur VAPI**          | Banner rouge "Service vocal indisponible"            |
| **Rate limit Groq**      | Fallback automatique Gemini Flash (transparent UI)   |
| **Config manquante**     | Banner orange "Configurez votre numéro pour activer" |

---

## 10. Intégration VAPI — points clés

### Configuration VAPI requise

1. **Compte VAPI** → créer sur vapi.ai
2. **Assistants** → créer 1 assistant par flux (ou 1 assistant multi-flux avec routing)
3. **Phone numbers** → acheter numéro FR (+33) dans VAPI dashboard (~1$/mois)
4. **Server URL** → pointer vers `https://api.trackyugps.com/api/v1/voice/server-url`
5. **Webhook URL** → pointer vers `https://api.trackyugps.com/api/v1/voice/webhook`

### Injection de contexte (VAPI server-url)

À chaque appel, VAPI appelle notre endpoint pour enrichir le contexte LLM :

```json
{
  "call": { "id": "vapi-call-id", "phoneNumber": "+33612345678" },
  "customer": { "number": "+33687654321" }
}
```

Notre backend répond avec :

```json
{
  "messages": [
    {
      "role": "system",
      "content": "Client: Société X. Abonnement: expiré depuis 12 jours. Montant dû: 45 000 FCFA. Contact: Jean Dupont. Historique: 2 relances email sans réponse. Proposer paiement via lien Mobile Money."
    }
  ]
}
```

### LLM routing par flux

```typescript
const LLM_BY_FLOW = {
  recouvrement: { provider: 'anthropic', model: 'claude-haiku-4-5' },
  fidelisation: { provider: 'anthropic', model: 'claude-haiku-4-5' },
  lead: { provider: 'anthropic', model: 'claude-haiku-4-5' },
  devis: { provider: 'anthropic', model: 'claude-haiku-4-5' },
  csat: { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  alerte: { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  inbound: { provider: 'anthropic', model: 'claude-haiku-4-5' },
};

const FALLBACK_LLM = { provider: 'google', model: 'gemini-flash' };
```

---

## 11. Checklist build

```
[ ] Spec module à jour (cette page)
[ ] Mockup Design reçu (à demander à claude.ai Design — onglets Voice)
[ ] Tables DB créées (voice_calls + voice_campaigns)
[ ] Endpoints backend implémentés (webhook + server-url + CRUD)
[ ] Scheduler cron configuré (6 jobs)
[ ] VAPI account créé + assistants configurés
[ ] Numéro téléphone acheté (+33 ou +225)
[ ] Composant créé dans trackyu-front-V2/features/voice/
[ ] Hooks React Query : useVoiceCalls · useVoiceCampaigns · useVoiceKPIs
[ ] RBAC guards appliqués
[ ] i18n clés intégrées (FR/EN)
[ ] Contraintes horaires légales encodées (8h-20h lun-sam)
[ ] Mécanisme opt-out / liste noire implémenté
[ ] Transcript chiffré + rétention 90j configurée
[ ] Tests E2E manuels (déclencher appel test → voir dans historique)
[ ] Mode clair ET sombre testés
[ ] STATE.md mis à jour
[ ] CHANGELOG.md entrée datée
```

---

## 12. Notes & décisions

- **Numéro unique ou par tenant** : commencer avec 1 numéro partagé TrackYu. Numéro dédié = option premium future.
- **Langue** : FR uniquement au lancement. EN/ES = phase suivante si traction internationale.
- **Escalade humaine** : pas de transfert vers agent humain dans V1. Message vocal + ticket Support créé automatiquement si non résolu.
- **Inbound V1 scope** : répondre aux questions simples (statut abonnement, flotte, tickets). Pas de modification de compte possible via appel entrant (sécurité).
- **VAPI vs Twilio** : VAPI choisi car nativement conçu pour les agents IA vocaux (vs Twilio = infrastructure générique). Migration possible si besoin.
- **Coûts** : à monitorer dans le dashboard VAPI + loggés dans `voice_calls.cost_usd` pour reporting interne.

---

## 13. Changelog du module

| Date       | Action                                     | Par                    |
| ---------- | ------------------------------------------ | ---------------------- |
| 2026-04-28 | Création spec — conceptualisation complète | Claude (session Voice) |

---

_Spec auto-suffisante. Une session Claude lit ce fichier + STATE.md + CLAUDE.md, et a tout pour construire le module de A à Z._
