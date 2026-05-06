# Skill — Intégration IA TrackYu

## Fonctionnalités IA existantes

### Assistant IA (AiAssistant)

- Composant : `features/ai/AiAssistant` (chunk 126 KB gzippé)
- Modèle : Claude via `geminiService` (service hybride)
- Context injecté : données flotte, alertes actives, stats véhicules
- Conversations persistées en DB : tables `ai_conversations`, `ai_messages`

### Knowledge base IA

```javascript
// config/aiKnowledgeBase.js — contexte injecté dans les prompts
`Carburant moyen : ${stats.avg_fuel ? Math.round(stats.avg_fuel) + '%' : 'N/A'}`;
```

## Règles pour développer des features IA

- **Calculs = serveur uniquement** — l'IA ne recalcule jamais des stats déjà disponibles en API
- **Pas de données sensibles dans les prompts** — jamais IMEI, coordonnées GPS, données personnelles
- **Fallback obligatoire** — si l'IA ne répond pas, afficher un état dégradé gracieux
- **Prompt caching** — utiliser le cache Anthropic sur les contextes longs (knowledge base)

## Intégration Claude API (Anthropic SDK)

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Toujours inclure le cache sur les blocs système longs
const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  system: [{ type: 'text', text: knowledgeBase, cache_control: { type: 'ephemeral' } }],
  messages: [{ role: 'user', content: userMessage }],
});
```

## Modèles disponibles (2026)

| Modèle     | ID                          | Usage recommandé                |
| ---------- | --------------------------- | ------------------------------- |
| Opus 4.7   | `claude-opus-4-7`           | Analyses complexes, rapports    |
| Sonnet 4.6 | `claude-sonnet-4-6`         | Usage général, assistant flotte |
| Haiku 4.5  | `claude-haiku-4-5-20251001` | Réponses rapides, suggestions   |

## Cas d'usage IA TrackYu

1. **Analyse anomalies carburant** — détecter vols/pertes inhabituels
2. **Prédiction maintenance** — basée sur kilométrage et historique
3. **Résumé journalier flotte** — rapport automatique fin de journée
4. **Détection conduite agressive** — pattern recognition sur eco-driving events
5. **Suggestions alertes** — recommander des règles d'alerte selon le profil de flotte

## Automatisations (Automation Rules)

Tables : `automation_rules`, `automations`, `automation_logs`
Logique dans `automationController` — règles déclenchées sur événements GPS.
