import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { logger } from '../utils/logger';
import { api } from '../services/apiLazy';

/**
 * AppearanceContext — Applies tenant branding (colors, font, size) as CSS variables
 * on <html>, so the whole app adapts dynamically.
 *
 * CSS variables set:
 *   --brand-primary       (hex color)
 *   --brand-secondary     (hex color)
 *   --brand-font          (font-family string)
 *   --brand-font-size     ('small' | 'default' | 'large')
 *   --brand-radius        (border-radius base, e.g. '0.5rem')
 */

export interface AppearanceSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: 'small' | 'default' | 'large';
  borderRadius: 'none' | 'small' | 'default' | 'large';
  sidebarStyle: 'dark' | 'light' | 'colored';
  tableDensity: 'compact' | 'standard' | 'comfortable';
  logoUrl?: string;
}

// Empty color strings = no override, laisse le thème CSS (dark/ocean/light) gérer --brand-primary.
// Fallback orange Trackyu = #FF5C00 (défini dans src/index.css sur [data-theme='dark'/'light']).
const DEFAULT_APPEARANCE: AppearanceSettings = {
  primaryColor: '',
  secondaryColor: '',
  accentColor: '',
  fontFamily: 'Inter',
  fontSize: 'default',
  borderRadius: 'default',
  sidebarStyle: 'dark',
  tableDensity: 'standard',
};

// Font-family map for clean names
const FONT_MAP: Record<string, string> = {
  Inter: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  Roboto: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  Poppins: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  Nunito: "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  'Open Sans': "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  'DM Sans': "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  'Source Sans 3': "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// Font-size scale multipliers
const FONT_SIZE_SCALE: Record<string, string> = {
  small: '14px',
  default: '16px',
  large: '18px',
};

// Border-radius values
const RADIUS_MAP: Record<string, string> = {
  none: '0px',
  small: '0.25rem',
  default: '0.5rem',
  large: '0.75rem',
};

interface AppearanceContextType {
  appearance: AppearanceSettings;
  isLoaded: boolean;
}

const AppearanceCtx = createContext<AppearanceContextType>({
  appearance: DEFAULT_APPEARANCE,
  isLoaded: false,
});

export const useAppearance = () => useContext(AppearanceCtx);

/**
 * Dynamically loads a Google Font stylesheet if not already loaded.
 */
const loadGoogleFont = (fontName: string) => {
  if (fontName === 'Inter') return; // Already loaded in index.html
  const id = `gfont-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
};

/**
 * Apply CSS custom properties to <html>
 */

// Table density → row vertical padding
const DENSITY_MAP: Record<string, string> = {
  compact: '0.375rem',
  standard: '0.75rem',
  comfortable: '1.25rem',
};

const applyToDOM = (s: AppearanceSettings) => {
  const root = document.documentElement;

  // Couleurs de marque : on override UNIQUEMENT si le tenant a une couleur custom explicite.
  // Sinon on laisse le thème CSS (`[data-theme='dark'/'ocean'/'light']`) fixer --brand-primary.
  if (s.primaryColor) {
    root.style.setProperty('--primary', s.primaryColor);
    root.style.setProperty('--brand-primary', s.primaryColor);
  } else {
    root.style.removeProperty('--primary');
    root.style.removeProperty('--brand-primary');
  }

  if (s.secondaryColor) {
    root.style.setProperty('--brand-secondary', s.secondaryColor);
  } else {
    root.style.removeProperty('--brand-secondary');
  }

  if (s.accentColor) {
    root.style.setProperty('--brand-accent', s.accentColor);
  } else {
    root.style.removeProperty('--brand-accent');
  }

  root.style.setProperty('--brand-font', FONT_MAP[s.fontFamily] || FONT_MAP['Inter']);
  root.style.setProperty('--brand-font-size', FONT_SIZE_SCALE[s.fontSize] || '16px');
  root.style.setProperty('--brand-radius', RADIUS_MAP[s.borderRadius] || '0.75rem');

  root.style.setProperty('--brand-density-py', DENSITY_MAP[s.tableDensity] || DENSITY_MAP['standard']);

  // Sidebar colors are driven by CSS via [data-theme][data-sidebar] selectors (index.css)
  root.setAttribute('data-sidebar', s.sidebarStyle);
  root.setAttribute('data-density', s.tableDensity);

  // Load Google Font if needed
  if (s.fontFamily !== 'Inter') loadGoogleFont(s.fontFamily);
};

export const AppearanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [appearance, setAppearance] = useState<AppearanceSettings>(DEFAULT_APPEARANCE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Apply defaults immediately
  useEffect(() => {
    applyToDOM(DEFAULT_APPEARANCE);
  }, []);

  // Load tenant settings when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      // Reset to defaults on logout
      applyToDOM(DEFAULT_APPEARANCE);
      setAppearance(DEFAULT_APPEARANCE);
      setIsLoaded(false);
      return;
    }

    const load = async () => {
      try {
        const tenant = await api.tenants.getCurrent();
        const s: AppearanceSettings = {
          primaryColor: tenant?.primary_color || tenant?.settings?.primaryColor || DEFAULT_APPEARANCE.primaryColor,
          secondaryColor:
            tenant?.secondary_color || tenant?.settings?.secondaryColor || DEFAULT_APPEARANCE.secondaryColor,
          accentColor: tenant?.settings?.accentColor || DEFAULT_APPEARANCE.accentColor,
          fontFamily: tenant?.settings?.fontFamily || tenant?.font_family || DEFAULT_APPEARANCE.fontFamily,
          fontSize: tenant?.settings?.fontSize || tenant?.font_size || DEFAULT_APPEARANCE.fontSize,
          borderRadius: tenant?.settings?.borderRadius || DEFAULT_APPEARANCE.borderRadius,
          sidebarStyle: tenant?.settings?.sidebarStyle || DEFAULT_APPEARANCE.sidebarStyle,
          tableDensity: tenant?.settings?.tableDensity || DEFAULT_APPEARANCE.tableDensity,
          logoUrl: tenant?.logo_url || tenant?.logo || undefined,
        };
        setAppearance(s);
        applyToDOM(s);
      } catch (e) {
        logger.warn('[AppearanceProvider] Failed to load settings, using defaults');
        applyToDOM(DEFAULT_APPEARANCE);
      } finally {
        setIsLoaded(true);
      }
    };

    load();
  }, [isAuthenticated]);

  return <AppearanceCtx.Provider value={{ appearance, isLoaded }}>{children}</AppearanceCtx.Provider>;
};
