/**
 * ecosystem.config.cjs — PM2 Configuration TrackYu
 *
 * Démarrage :
 *   pm2 start ecosystem.config.cjs --env production
 *
 * Monitoring :
 *   pm2 monit
 *   pm2 logs
 *   pm2 status
 *
 * ═══════════════════════════════════════════════════════════════
 *  PHASE ACTUELLE — KVM2 (2 vCPU · 8 GB RAM)
 *  Cible : 2 000 devices + 300 users
 *  Mode  : FORK (1 process API + 1 process GPS)
 *
 *  Pourquoi fork et non cluster ?
 *  → 67 pkt/s GPS + 300 users = charge légère, 1 process suffit
 *  → Cluster exige @socket.io/redis-adapter (complexité inutile ici)
 *  → Le fork libère le 2e vCPU pour TimescaleDB et Redis
 *
 *  Quand basculer en CLUSTER ?
 *  → > 1 000 users simultanés OU > 5 000 devices
 *  → Installer d'abord : npm install @socket.io/redis-adapter
 *  → Puis changer instances: 1 → 2 et exec_mode: 'fork' → 'cluster'
 *  → Activer le Redis adapter dans server.js (voir scripts/vps-scale-patch.py)
 * ═══════════════════════════════════════════════════════════════
 */

module.exports = {
  apps: [

    // ─── API HTTP + Socket.IO ─────────────────────────────────────────────────
    // Fork mode : 1 process, pas de Redis adapter requis
    // Le 2e vCPU du KVM2 est laissé à TimescaleDB (requêtes analytiques lourdes)
    {
      name: 'trackyu-api',
      script: './dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1200M',  // Redémarrage auto si fuite mémoire
      listen_timeout: 10_000,
      kill_timeout: 5_000,

      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        REDIS_URL: 'redis://localhost:6379',
        DB_POOL_MAX: 15,
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

        // Pool DB : 15 connexions (TimescaleDB max_connections=50 sur KVM2)
        DB_POOL_MAX: 15,
        DB_POOL_IDLE: 10000,

        // Socket.IO throttle (300 users × 2000 vehicles — charge modérée)
        THROTTLE_REALTIME: 500,
        THROTTLE_MOVING: 2000,
        THROTTLE_IDLE: 5000,
        THROTTLE_PARKED: 15000,

        // I/O threads (DB queries, fichiers)
        UV_THREADPOOL_SIZE: 8,

        // Node.js heap — laisser de la marge pour TimescaleDB sur le même VPS
        NODE_OPTIONS: '--max-old-space-size=1024',
      },

      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/api-error.log',
      out_file:   './logs/api-out.log',
      merge_logs: true,
    },

    // ─── Serveur GPS TCP ──────────────────────────────────────────────────────
    // Toujours en fork : connexions TCP stateful (IMEI → socket map)
    // Ne JAMAIS mettre en cluster — les connexions ne sont pas partagées
    {
      name: 'trackyu-gps',
      script: './dist/gps-server/server.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '400M',

      env: {
        NODE_ENV: 'development',
        GPS_PORT: 5000,
        GPS_BUFFER_BATCH: 100,
        GPS_BUFFER_MAX: 2000,
        GPS_BUFFER_INTERVAL: 1000,
        GPS_PARALLEL_FLUSH: 2,
      },

      env_production: {
        NODE_ENV: 'production',
        GPS_PORT: 5000,

        // 2000 devices × 1/30 pkt/s = 67 pkt/s → batch 200 largement suffisant
        GPS_BUFFER_BATCH: 200,
        GPS_BUFFER_MAX: 3000,
        GPS_BUFFER_INTERVAL: 800,
        GPS_PARALLEL_FLUSH: 2,
        GPS_RATE_LIMIT: 10,

        UV_THREADPOOL_SIZE: 4,
        NODE_OPTIONS: '--max-old-space-size=384',
      },

      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/gps-error.log',
      out_file:   './logs/gps-out.log',
    },
  ],

  // ─── Déploiement VPS ─────────────────────────────────────────────────────────
  deploy: {
    production: {
      user: 'root',
      host: process.env.VPS_HOST || 'live.trackyugps.com',
      ref: 'origin/master',
      repo: process.env.GIT_REPO || 'git@github.com:your-org/trackyu.git',
      path: '/opt/trackyu',
      'post-deploy': [
        'npm install --legacy-peer-deps',
        'npm run build',
        'pm2 reload ecosystem.config.cjs --env production',
        'pm2 save',
      ].join(' && '),
    },
  },
};
