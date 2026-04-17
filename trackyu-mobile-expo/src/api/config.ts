/**
 * TrackYu Mobile - API Configuration
 *
 * Les URLs sont injectees par app.config.js selon APP_ENV (preview -> staging,
 * production -> prod). Fallback sur la prod si Constants.expoConfig est absent
 * (edge case : bundle sans Expo, test Jest).
 */
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  wsUrl?: string;
  appEnv?: string;
};

export const API_URL: string = extra.apiUrl ?? 'https://trackyugps.com/api';
export const WS_URL: string = extra.wsUrl ?? 'wss://trackyugps.com';
export const APP_ENV: string = extra.appEnv ?? 'production';

export default {
  API_URL,
  WS_URL,
  APP_ENV,
};
