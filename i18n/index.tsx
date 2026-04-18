import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import frCommon from './locales/fr.json';
import enCommon from './locales/en.json';
import esCommon from './locales/es.json';

export type Lang = 'fr' | 'en' | 'es';
export const SUPPORTED_LANGS: Lang[] = ['fr', 'en', 'es'];
export const DEFAULT_LANG: Lang = 'fr';
const STORAGE_KEY = 'trackyu-lang';

const dictionaries: Record<Lang, Record<string, unknown>> = {
  fr: frCommon as Record<string, unknown>,
  en: enCommon as Record<string, unknown>,
  es: esCommon as Record<string, unknown>,
};

let currentLang: Lang = (() => {
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored && (['fr', 'en', 'es'] as Lang[]).includes(stored as Lang)) return stored as Lang;
  } catch {
    /* noop */
  }
  return DEFAULT_LANG;
})();

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGS.includes(stored as Lang)) return stored as Lang;
  } catch {
    /* SSR or storage blocked */
  }
  return DEFAULT_LANG;
}

function resolveKey(dict: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split('.');
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name) => {
    const v = params[name];
    return v == null ? '' : String(v);
  });
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => readStoredLang());

  useEffect(() => {
    try {
      document.documentElement.lang = lang;
    } catch {
      /* noop */
    }
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    if (!SUPPORTED_LANGS.includes(next)) return;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* noop */
    }
    currentLang = next;
    setLangState(next);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const found = resolveKey(dictionaries[lang], key) ?? resolveKey(dictionaries[DEFAULT_LANG], key);
      return interpolate(found ?? key, params);
    },
    [lang]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      t,
      dir: 'ltr',
    }),
    [lang, setLang, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used inside <I18nProvider>');
  return ctx;
}

export function getStoredLang(): Lang {
  return readStoredLang();
}

export function tGlobal(key: string, params?: Record<string, string | number>): string {
  const found = resolveKey(dictionaries[currentLang], key) ?? resolveKey(dictionaries[DEFAULT_LANG], key);
  return interpolate(found ?? key, params);
}
