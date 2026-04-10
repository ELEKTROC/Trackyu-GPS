# 🎨 Frontend React

## Stack Technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| React | 19.2 | Framework UI |
| Vite | 6.2 | Bundler |
| TypeScript | 5.8 | Typage |
| TailwindCSS | 4.1 | Styles |
| TanStack Query | 5.x | Cache & sync |
| Leaflet | 1.9 | Cartes |
| Recharts | 2.x | Graphiques |
| Lucide | - | Icônes |
| date-fns | 3.x | Dates |
| Zod | 3.x | Validation |
| react-window | 1.8.10 | Virtualisation listes |
| Vitest | 4.0.15 | Tests unitaires |

## 📁 Structure

```
/
├── components/           # Composants UI génériques
│   ├── Card.tsx
│   ├── Modal.tsx
│   ├── Table.tsx
│   ├── DateRangeSelector.tsx
│   └── ...
│
├── features/             # Modules métier
│   ├── {module}/
│   │   └── components/
│   │       ├── {Module}View.tsx    # Vue principale
│   │       ├── {Entity}Form.tsx    # Formulaires
│   │       └── {Entity}List.tsx    # Listes
│
├── contexts/             # Contextes React
│   ├── AuthContext.tsx   # Auth + RBAC
│   ├── DataContext.tsx   # TanStack Query
│   ├── ThemeContext.tsx  # Dark/Light mode
│   └── ToastContext.tsx  # Notifications
│
├── services/
│   ├── api.ts           # Service API centralisé (~4000 lignes)
│   └── socket.ts        # WebSocket
│
├── hooks/               # Hooks personnalisés
├── schemas/             # Validation Zod
├── utils/               # Utilitaires
│   └── apiConfig.ts     # URL API (Capacitor/web)
│
├── types.ts             # Types partagés (~1200 lignes)
├── App.tsx              # Point d'entrée
└── LazyViews.tsx        # Lazy loading
```

## 🔄 Gestion des Données (TanStack Query)

### Utilisation via DataContext

```typescript
import { useDataContext } from '../contexts/DataContext';

function VehicleList() {
  const { vehicles, isLoading, refreshData } = useDataContext();
  
  if (isLoading) return <Spinner />;
  
  return (
    <ul>
      {vehicles.map(v => <li key={v.id}>{v.name}</li>)}
    </ul>
  );
}
```

### Invalidation du Cache après Mutation

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

function CreateVehicle() {
  const queryClient = useQueryClient();
  
  const handleSubmit = async (data) => {
    await api.vehicles.create(data);
    // ✅ Invalider le cache pour refresh
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
  };
}
```

## 🔐 Authentification & Permissions

```typescript
import { useAuth } from '../contexts/AuthContext';

function AdminPanel() {
  const { user, hasPermission, logout } = useAuth();
  
  // Vérifier une permission
  if (!hasPermission('VIEW_ADMIN')) {
    return <AccessDenied />;
  }
  
  return (
    <div>
      <p>Connecté: {user.email}</p>
      <button onClick={logout}>Déconnexion</button>
    </div>
  );
}
```

## 📡 Appels API

### Service Centralisé

```typescript
// ✅ TOUJOURS utiliser le service api.ts
import { api } from '../services/api';

// Exemples d'appels
const vehicles = await api.vehicles.list();
const vehicle = await api.vehicles.getById(id);
await api.vehicles.create(data);
await api.vehicles.update(id, data);
await api.vehicles.delete(id);

// ❌ NE JAMAIS faire de fetch direct
fetch('/api/vehicles'); // INTERDIT
```

### Mode Mock

```typescript
// Dans .env pour dev sans backend
VITE_USE_MOCK=true

// api.ts gère automatiquement les données mock
// via localStorage pour la persistance
```

## 🔔 Notifications Toast

```typescript
import { useToast } from '../contexts/ToastContext';

function MyComponent() {
  const { showToast } = useToast();
  
  const handleSave = async () => {
    try {
      await api.vehicles.create(data);
      showToast('Véhicule créé avec succès', 'success');
    } catch (error) {
      showToast('Erreur lors de la création', 'error');
    }
  };
}

// Types de toast
showToast(message, 'success');  // Vert
showToast(message, 'error');    // Rouge
showToast(message, 'warning');  // Orange
showToast(message, 'info');     // Bleu
```

## 📡 WebSocket Temps Réel

```typescript
import { getSocket } from '../services/socket';

function MapView() {
  useEffect(() => {
    const socket = getSocket();
    
    // Rejoindre le room du tenant
    socket.emit('join:tenant', tenantId);
    
    // Écouter les mises à jour
    socket.on('vehicle:update', (data) => {
      // Mettre à jour la position sur la carte
      updateMarker(data.vehicleId, data.position);
    });
    
    return () => {
      socket.off('vehicle:update');
    };
  }, [tenantId]);
}
```

## 🎨 Lazy Loading des Vues

```typescript
// LazyViews.tsx
export const LazyMapView = withLazyLoad(
  () => import('./features/map/components/MapView').then(m => ({ default: m.MapView })),
  'Carte'
);

export const LazyFinanceView = withLazyLoad(
  () => import('./features/finance/components/FinanceView').then(m => ({ default: m.FinanceView })),
  'Finance'
);

// App.tsx - utilisation
{currentView === View.MAP && <LazyMapView />}
{currentView === View.FINANCE && <LazyFinanceView />}
```

## 🎯 Hooks Disponibles

| Hook | Fichier | Usage |
|------|---------|-------|
| `useAuth` | `contexts/AuthContext.tsx` | Auth, permissions, impersonation |
| `useDataContext` | `contexts/DataContext.tsx` | Données globales (vehicles, clients...) |
| `useToast` | `contexts/ToastContext.tsx` | Notifications toast |
| `useTheme` | `contexts/ThemeContext.tsx` | Dark/Light mode |
| `useCurrency` | `hooks/useCurrency.ts` | Formatage monétaire |
| `useDateRange` | `hooks/useDateRange.ts` | Sélection de plages de dates |
| `useAuditTrail` | `hooks/useAuditTrail.ts` | Historique des modifications |
| `useFilteredData` | `hooks/useFilteredData.ts` | Filtrage/recherche générique |
| `useSwipeBack` | `hooks/useSwipeBack.ts` | Navigation swipe (mobile) |
| `useConfirmDialog` | `hooks/useConfirmDialog.ts` | Dialog de confirmation stylé |

## ✅ Composants UI Importants

### ConfirmDialog (remplace `window.confirm`)

```typescript
// ❌ NE JAMAIS utiliser window.confirm natif
if (window.confirm('Supprimer ?')) { ... } // INTERDIT

// ✅ Utiliser le hook useConfirmDialog
import { useConfirmDialog } from '../hooks/useConfirmDialog';

function MyComponent() {
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Confirmer la suppression',
      message: 'Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      variant: 'danger'
    });
    if (ok) { /* supprimer */ }
  };

  return (
    <>
      <button onClick={handleDelete}>Supprimer</button>
      {ConfirmDialogComponent}
    </>
  );
}
```

### Virtualisation (react-window v1)

```typescript
// Utiliser react-window v1.8.10 pour les grandes listes
import { FixedSizeList as List } from 'react-window';
// ❌ NE PAS utiliser react-window v2 (API cassante)
```

## 🧪 Tests Frontend

| Métrique | Valeur |
|----------|--------|
| **Runner** | Vitest 4.0.15 |
| **Tests pass** | 155 / 189 (82%) |
| **Suites pass** | 5 / 19 |
| **Config** | `vitest.config.ts` + `setupTests.ts` |
| **Coverage** | `@vitest/coverage-v8` |

```bash
# Lancer les tests
npm run test           # mode watch
npx vitest run         # une seule exécution
npx vitest run --coverage  # avec couverture
```

## 🎨 Formatage

### Monnaie (FCFA)

```typescript
// Format français avec devise FCFA
new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
// Résultat : "1 500 000 FCFA"

// Ou via hook
const { formatCurrency } = useCurrency();
formatCurrency(1500000); // "1 500 000 FCFA"
```

### Dates

```typescript
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// Date complète
format(new Date(), 'dd MMMM yyyy', { locale: fr })
// Résultat : "15 janvier 2026"

// Date relative
formatDistanceToNow(date, { locale: fr, addSuffix: true })
// Résultat : "il y a 2 heures"
```

### Icônes

```typescript
// ✅ Utiliser lucide-react uniquement
import { Car, User, Settings, Plus, Trash2 } from 'lucide-react';

<Car className="w-5 h-5" />
<Button><Plus className="w-4 h-4 mr-2" />Ajouter</Button>

// ❌ NE PAS utiliser d'autres bibliothèques d'icônes
```

## 📱 Classes CSS Mobile

```css
/* Safe areas iOS/Android */
.safe-area-top { padding-top: env(safe-area-inset-top); }
.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }

/* Responsive */
.hidden md:block    /* Caché sur mobile, visible sur desktop */
.block md:hidden    /* Visible sur mobile, caché sur desktop */
```

---

*Dernière mise à jour : 2026-02-10*
