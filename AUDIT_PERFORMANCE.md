# 🚀 Audit Performance TrackYu GPS

> Date: 5 février 2026

## 📊 État Actuel

### Taille des Bundles

| Fichier | Taille | Gzipped | Problème |
|---------|--------|---------|----------|
| `index.js` (main) | **751 KB** | ~187 KB | ⚠️ CRITIQUE - Trop gros |
| `vendor-ui.js` | **499 KB** | ~142 KB | ⚠️ Élevé |
| `MapView.js` | **441 KB** | ~121 KB | OK (lazy loaded) |
| `SuperAdminView.js` | **412 KB** | ~87 KB | OK (lazy loaded) |
| `jspdf.es.min.js` | **380 KB** | ~127 KB | OK (lazy loaded) |
| **Total Assets** | **~21 MB** | ~6-7 MB | ⚠️ Élevé |

### Problèmes Identifiés

1. **Bundle principal trop volumineux (751 KB)**
   - Contient trop de code chargé au démarrage
   - `api.ts` (~4000 lignes) inclus entièrement

2. **Pas de compression Gzip/Brotli côté serveur**
   - Caddy ne compresse pas les réponses
   - Nginx ne compresse pas les assets statiques

3. **Pas de preload/prefetch des ressources critiques**
   - Les polices Google Fonts bloquent le rendu
   - Pas de preconnect vers les domaines tiers

4. **Cache HTTP non optimisé**
   - Headers cache absents sur Caddy
   - Nginx cache OK pour `/assets/` mais pas pour les autres fichiers statiques

5. **Pas de lazy loading agressif**
   - Certains composants lourds chargés au démarrage
   - `recharts` (dans vendor-ui) toujours chargé même si pas utilisé immédiatement

---

## ✅ Solutions Proposées

### 1. Activer la Compression Gzip/Brotli (Impact: ⭐⭐⭐⭐⭐)

**Gain estimé: -70% taille téléchargée**

#### Caddy (reverse proxy)
```caddyfile
trackyugps.com, www.trackyugps.com {
    # Activer compression
    encode gzip zstd
    
    # ... reste de la config
}
```

#### Nginx (frontend container)
```nginx
# Dans /etc/nginx/nginx.conf ou conf.d/default.conf
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;
gzip_min_length 1000;
```

### 2. Optimiser le Code Splitting (Impact: ⭐⭐⭐⭐)

**Gain estimé: -40% bundle initial**

```typescript
// vite.config.ts - Améliorer manualChunks
manualChunks: {
  'vendor-react': ['react', 'react-dom'],
  'vendor-router': ['react-router-dom'],
  'vendor-query': ['@tanstack/react-query'],
  'vendor-forms': ['react-hook-form', 'zod'],
  'vendor-icons': ['lucide-react'],
  'vendor-charts': ['recharts'],  // Séparé pour lazy load
  'vendor-socket': ['socket.io-client'],
  'vendor-map': ['leaflet', 'react-leaflet', 'react-leaflet-cluster'],
}
```

### 3. Lazy Load des Charts (Impact: ⭐⭐⭐)

```typescript
// Créer un wrapper pour recharts
const LazyAreaChart = React.lazy(() => 
  import('recharts').then(m => ({ default: m.AreaChart }))
);
```

### 4. Preload Resources Critiques (Impact: ⭐⭐⭐)

```html
<!-- index.html -->
<head>
  <!-- Preconnect aux domaines tiers -->
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  
  <!-- Preload police critique -->
  <link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" as="style">
  
  <!-- Prefetch des modules secondaires -->
  <link rel="prefetch" href="/assets/MapView.*.js">
</head>
```

### 5. Cache Headers Optimisés (Impact: ⭐⭐⭐⭐)

```caddyfile
# Caddy - Cache long pour assets immutables
trackyugps.com {
    encode gzip zstd
    
    # Assets avec hash - cache 1 an
    @assets path /assets/*
    header @assets Cache-Control "public, max-age=31536000, immutable"
    
    # index.html - pas de cache
    @html path /index.html
    header @html Cache-Control "no-cache, no-store, must-revalidate"
    
    # ... reste
}
```

### 6. Réduire api.ts (Impact: ⭐⭐⭐)

Diviser `api.ts` en modules séparés :
```
services/
├── api/
│   ├── index.ts      # Export centralisé
│   ├── auth.ts       # Auth endpoints
│   ├── fleet.ts      # Fleet endpoints
│   ├── finance.ts    # Finance endpoints
│   ├── crm.ts        # CRM endpoints
│   └── admin.ts      # Admin endpoints
```

### 7. Service Worker avec Caching (Impact: ⭐⭐⭐⭐)

Améliorer `sw.js` pour le runtime caching :
```javascript
// Stratégie Cache-First pour assets
// Network-First pour API
```

---

## 🔧 Plan d'Implémentation

### Phase 1 - Quick Wins (1-2h) ⚡

1. [ ] Activer compression Gzip dans Caddy
2. [ ] Activer compression dans Nginx frontend
3. [ ] Ajouter preconnect/preload dans index.html
4. [ ] Optimiser Cache-Control headers

### Phase 2 - Code Splitting (2-4h)

5. [ ] Séparer vendor-charts de vendor-ui
6. [ ] Lazy load des graphiques recharts
7. [ ] Vérifier que tous les gros modules sont lazy loaded

### Phase 3 - Refactoring (1 jour)

8. [ ] Diviser api.ts en modules
9. [ ] Améliorer le Service Worker
10. [ ] Implémenter route-based code splitting

---

## 📈 Résultats Attendus

| Métrique | Avant | Après Phase 1 | Après Phase 3 |
|----------|-------|---------------|---------------|
| First Contentful Paint | ~3s | ~1.5s | ~1s |
| Largest Contentful Paint | ~5s | ~2.5s | ~1.5s |
| Time to Interactive | ~6s | ~3s | ~2s |
| Taille téléchargée (gzip) | ~7 MB | ~2 MB | ~1.5 MB |
| Bundle initial | 751 KB | 751 KB | ~400 KB |

---

## 🚀 Commencer Maintenant ?

Pour implémenter la **Phase 1 (Quick Wins)**, confirmez et je procède aux modifications.
