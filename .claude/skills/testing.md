# Skill — Tests TrackYu

## Philosophie

- Tests d'intégration > mocks — les mocks ont masqué des bugs de migration en prod par le passé
- Tester le comportement observable, pas l'implémentation interne
- Priorité : flows critiques (auth, GPS ingestion, facturation, immobilisation)

## Stack de test

| Couche                   | Outil                                  |
| ------------------------ | -------------------------------------- |
| Backend unit/integration | Jest + supertest                       |
| Frontend composants      | Vitest + React Testing Library         |
| Mobile                   | Jest + `@testing-library/react-native` |
| E2E (à venir)            | Playwright (web) / Detox (mobile)      |

## Tests backend existants

```bash
cd trackyu-backend
npm test           # run all
npm test -- --watch
npm test -- <fichier>
```

Fichiers de test : `src/**/__tests__/*.test.ts`

## Ce qu'il faut tester en priorité

1. **Auth** : login, refresh token, expiration, rôles
2. **Isolation tenant** : un user ne doit jamais voir les données d'un autre tenant
3. **GPS ingestion** : parsers GT06/CONCOX/Meitrack → données correctes en DB
4. **Pipeline fuel** : fuel dans raw_data → fuel_liters persisté en positions
5. **Facturation** : génération récurrente, montants, pas de doublon

## Pattern test d'isolation tenant

```typescript
it("ne doit pas retourner les véhicules d'un autre tenant", async () => {
  const res = await request(app).get('/api/v1/objects').set('Authorization', `Bearer ${tokenTenantA}`);
  expect(res.body.every((v) => v.tenant_id === tenantA.id)).toBe(true);
});
```

## Tests mobile

```bash
cd trackyu-mobile-expo
npm test
```

Fichiers : `src/__tests__/*.test.ts`

## Ce qu'on ne mocke pas

- La base de données PostgreSQL dans les tests d'intégration
- Le serveur GPS TCP pour les tests de parsers (utiliser de vraies trames binaires)

## Données de test

- Tenant test : `tenant_default` (TKY)
- Compte superadmin : superadmin@trackyugps.com
- Trames GT06 de test disponibles dans `src/gps-server/parsers/__tests__/`

## Avant de déployer

Vérifier manuellement sur staging :

1. Login / logout
2. Carte temps réel (position véhicule)
3. Bloc carburant (gauge + historique)
4. Ajout d'un véhicule (formulaire IMEI)
5. Immobilisation (action critique)

---

## Rapports liés (docs/)

Voir l'index complet dans [`docs/README.md`](../../docs/README.md). Rapports pertinents pour ce skill : `docs/plans/PLAN_DE_TESTS_MANUELS.md`.

> ⚠️ Ces rapports peuvent être obsolètes — vérifier la date avant de s'y fier. En cas de contradiction avec le code ou la prod, c'est le code/prod qui fait foi.
>
> **Tout nouveau rapport doit être rangé dans `docs/<thème>/`** selon l'organisation décrite dans `docs/README.md`.
