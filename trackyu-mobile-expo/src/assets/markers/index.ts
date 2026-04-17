// AUTO-GENERATED — ne pas éditer manuellement
// Régénérer : node scripts/generate-markers.js

export const MARKER_IMAGES = {
  car: {
    moving: require('./car-moving.png'),
    stopped: require('./car-stopped.png'),
    idle: require('./car-idle.png'),
    offline: require('./car-offline.png'),
  },
  truck: {
    moving: require('./truck-moving.png'),
    stopped: require('./truck-stopped.png'),
    idle: require('./truck-idle.png'),
    offline: require('./truck-offline.png'),
  },
  bus: {
    moving: require('./bus-moving.png'),
    stopped: require('./bus-stopped.png'),
    idle: require('./bus-idle.png'),
    offline: require('./bus-offline.png'),
  },
  moto: {
    moving: require('./moto-moving.png'),
    stopped: require('./moto-stopped.png'),
    idle: require('./moto-idle.png'),
    offline: require('./moto-offline.png'),
  },
  van: {
    moving: require('./van-moving.png'),
    stopped: require('./van-stopped.png'),
    idle: require('./van-idle.png'),
    offline: require('./van-offline.png'),
  },
  agr: {
    moving: require('./agr-moving.png'),
    stopped: require('./agr-stopped.png'),
    idle: require('./agr-idle.png'),
    offline: require('./agr-offline.png'),
  },
  eng: {
    moving: require('./eng-moving.png'),
    stopped: require('./eng-stopped.png'),
    idle: require('./eng-idle.png'),
    offline: require('./eng-offline.png'),
  },
} as const;

export type MarkerVehicleType = keyof typeof MARKER_IMAGES;
export type MarkerStatus = keyof (typeof MARKER_IMAGES)[MarkerVehicleType];
