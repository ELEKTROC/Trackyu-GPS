import React, { createContext, useContext, useState, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ThemePreset = 'dark' | 'ocean' | 'light';

interface ThemeContextType {
  theme: ThemePreset;
  isDarkMode: boolean;           // backward compat — true pour dark + ocean
  setTheme: (preset: ThemePreset) => void;
  toggleTheme: () => void;       // backward compat — bascule dark ↔ light
}

// ─── Helpers DOM ──────────────────────────────────────────────────────────────
const applyTheme = (preset: ThemePreset) => {
  const root = document.documentElement;

  // data-theme → active les CSS variables du preset
  root.setAttribute('data-theme', preset);

  // classe dark → active les dark: utilities Tailwind (dark + ocean)
  if (preset === 'light') {
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
  }

  // meta color-scheme
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) meta.setAttribute('content', preset === 'light' ? 'light' : 'dark');

  // meta theme-color (barre navigateur mobile)
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    const colors: Record<ThemePreset, string> = {
      dark: '#0D0D0F',
      ocean: '#080E1A',
      light: '#F8FAFC',
    };
    themeColor.setAttribute('content', colors[preset]);
  }
};

// ─── Context ──────────────────────────────────────────────────────────────────
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemePreset>('dark');

  // Init depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem('trackyu-theme') as ThemePreset | null;
    // Compatibilité ancienne clé 'theme'
    const legacy = localStorage.getItem('theme');

    let preset: ThemePreset = 'dark';
    if (saved && ['dark', 'ocean', 'light'].includes(saved)) {
      preset = saved;
    } else if (legacy === 'light') {
      preset = 'light';
    }

    setThemeState(preset);
    applyTheme(preset);
  }, []);

  const setTheme = (preset: ThemePreset) => {
    setThemeState(preset);
    applyTheme(preset);
    localStorage.setItem('trackyu-theme', preset);
  };

  // Backward compat : bascule dark ↔ light
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      isDarkMode: theme !== 'light',
      setTheme,
      toggleTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
