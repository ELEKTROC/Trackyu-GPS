/**
 * ecosystem.config.cjs — PM2 Cluster Mode
 * Architecture scalable 10k devices / 1500 users
 *
 * Démarrage :
 *   pm2 start ecosystem.config.cjs
 *   pm2 start ecosystem.config.cjs --env production
 *
 * Monitoring :
 *   pm2 monit
 *   pm2 logs
 *   pm2 status
 *
 * Architecture :
 *   trackyu-api  → Cluster (1 worker/CPU) — HTTP + Socket.IO
 *   trackyu-gps  → Fork unique             — Serveur TCP stateful
 *
 * IMPORTANT Socket.IO Cluster :
 *   Le Redis adapter (@socket.io/redis-adapter) doit être activé dans server.js
 *   pour que les events Socket.IO soient broadcastés entre tous les workers.
 *   Sans Redis adapter, les users connectés à worker-1 ne reçoivent pas les
 *   events émis par worker-2. Voir scripts/install-redis-adapter.sh
 */

const cpus = require('os').cpus().length;

module.exports = {
  apps: [
    // ─── API + Socket.IO (cluster multi-CPU) ────────────────────────────────────
    {
      name: 'trackyu-api',
      script: './dist/server.js',
      instances: process.env.API_WORKERS || cpus,
      exec_mode: 'cluster',
      max_memory_restart: process.env.WORKER_MEM_LIMIT || '800M',
      listen_timeout: 10_000,
      kill_timeout: 5_000,
      wait_ready: true,           // Attendre process.send('ready') dans server.js
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        REDIS_URL: 'redis://localhost:6379',
        DB_POOL_MAX: 5,           // Par worker (5 × nCPU ≤ PG max_connections 100)
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
        DB_POOL_MAX: Math.floor(80 / cpus), // Rester sous 100 connexions PG totales
        GPS_BUFFER_BATCH: 500,
        GPS_BUFFER_MAX: 10000,
        GPS_BUFFER_INTERVAL: 500,
        GPS_PARALLEL_FLUSH: 4,
        THROTTLE_REALTIME: 500,
        THROTTLE_MOVING: 1500,
        THROTTLE_IDLE: 4000,
        THROTTLE_PARKED: 10000,
        UV_THREADPOOL_SIZE: 16,   // Plus de threads I/O pour les requêtes DB parallèles
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
    },

    // ─── Serveur GPS TCP (fork unique — connexions persistantes) ─────────────────
    // Ne PAS mettre en cluster : les connexions TCP sont stateful (IMEI → socket map)
    // L'isolation via fork garantit que le crash GPS ne tue pas l'API
    {
      name: 'trackyu-gps',
      script: './dist/gps-server/server.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'development',
        GPS_PORT: 5000,
        GPS_BUFFER_BATCH: 100,
        GPS_BUFFER_MAX: 2000,
      },
      env_production: {
        NODE_ENV: 'production',
        GPS_PORT: 5000,
        GPS_BUFFER_BATCH: 500,
        GPS_BUFFER_MAX: 10000,
        GPS_BUFFER_INTERVAL: 500,
        GPS_PARALLEL_FLUSH: 4,
        GPS_RATE_LIMIT: 10,
        UV_THREADPOOL_SIZE: 8,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/gps-error.log',
      out_file: './logs/gps-out.log',
    },
  ],

  // ─── Déploiement VPS ──────────────────────────────────────────────────────────
  deploy: {
    production: {
      user: 'root',
      host: process.env.VPS_HOST || 'trackyugps.com',
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
