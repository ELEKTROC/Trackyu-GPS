/**
 * TrackYu Mobile — ThemeContext
 *
 * Usage :
 *   const { theme } = useTheme();
 *   style={{ backgroundColor: theme.bg.surface }}
 *
 * White label :
 *   ThemeProvider charge la config revendeur depuis l'API (preset + primaryOverride)
 *   et expose le thème résolu à toute l'app.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveTheme, THEMES, type Theme, type ThemePreset } from './themes';

// ─── Config revendeur (chargée depuis l'API au login) ────────────────────────
export interface ResellerThemeConfig {
  preset: ThemePreset; // 'dark' | 'ocean' | 'light'
  primaryOverride?: string; // '#RRGGBB' optionnel
  appName?: string;
  logoUrl?: string;
}

// ─── Context type ─────────────────────────────────────────────────────────────
interface ThemeContextValue {
  theme: Theme;
  preset: ThemePreset;
  resellerConfig: ResellerThemeConfig | null;
  setTheme: (preset: ThemePreset) => void;
  applyResellerConfig: (config: ResellerThemeConfig) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = '@trackyu:theme_preset';
const DEFAULT_PRESET: ThemePreset = 'light';

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preset, setPreset] = useState<ThemePreset>(DEFAULT_PRESET);
  const [resellerConfig, setResellerConfig] = useState<ResellerThemeConfig | null>(null);
  const [theme, setThemeState] = useState<Theme>(() => resolveTheme(DEFAULT_PRESET));

  // Charger le preset persisté au démarrage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && saved in THEMES) {
        const savedPreset = saved as ThemePreset;
        setPreset(savedPreset);
        setThemeState(resolveTheme(savedPreset));
      }
    });
  }, []);

  // Changer le thème manuellement (settings utilisateur)
  const setTheme = useCallback(
    (newPreset: ThemePreset) => {
      setPreset(newPreset);
      setThemeState(resolveTheme(newPreset, resellerConfig?.primaryOverride));
      AsyncStorage.setItem(STORAGE_KEY, newPreset);
    },
    [resellerConfig]
  );

  // Appliquer la config revendeur après login (depuis l'API)
  const applyResellerConfig = useCallback((config: ResellerThemeConfig) => {
    setResellerConfig(config);
    setPreset(config.preset);
    setThemeState(resolveTheme(config.preset, config.primaryOverride));
    AsyncStorage.setItem(STORAGE_KEY, config.preset);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, preset, resellerConfig, setTheme, applyResellerConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
