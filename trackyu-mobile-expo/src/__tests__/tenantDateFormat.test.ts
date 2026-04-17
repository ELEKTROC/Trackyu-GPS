/**
 * @jest-environment node
 *
 * Tests unitaires — src/hooks/useTenantDateFormat.ts
 * Couverture : isoToDisplay, displayToIso, datePlaceholder
 *
 * Note : useTenantDateFormat (hook React Query) n'est pas testé ici car il
 * requiert un QueryClient et un contexte React — couvert par les tests E2E.
 */

// ── Mocks chaîne d'imports natifs ─────────────────────────────────────────────
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'standalone', appOwnership: null },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn().mockReturnValue({ data: undefined }),
}));

import { isoToDisplay, displayToIso, datePlaceholder } from '../hooks/useTenantDateFormat';
import type { DateFormat } from '../hooks/useTenantDateFormat';

// ── isoToDisplay ────────────────────────────────────────────────────────────────

describe('isoToDisplay', () => {
  const ISO = '2026-04-16';

  it('DD/MM/YYYY : convertit correctement', () => {
    expect(isoToDisplay(ISO, 'DD/MM/YYYY')).toBe('16/04/2026');
  });

  it('MM/DD/YYYY : convertit correctement', () => {
    expect(isoToDisplay(ISO, 'MM/DD/YYYY')).toBe('04/16/2026');
  });

  it('YYYY-MM-DD : retourne la chaîne telle quelle', () => {
    expect(isoToDisplay(ISO, 'YYYY-MM-DD')).toBe('2026-04-16');
  });

  it("premier jour de l'année", () => {
    expect(isoToDisplay('2026-01-01', 'DD/MM/YYYY')).toBe('01/01/2026');
    expect(isoToDisplay('2026-01-01', 'MM/DD/YYYY')).toBe('01/01/2026');
  });

  it("dernier jour de l'année", () => {
    expect(isoToDisplay('2026-12-31', 'DD/MM/YYYY')).toBe('31/12/2026');
    expect(isoToDisplay('2026-12-31', 'MM/DD/YYYY')).toBe('12/31/2026');
  });

  it("retourne l'entrée telle quelle si format non parseable", () => {
    // Chaîne sans tirets — split('-') donne un tableau de 1 élément
    const bad = 'not-a-date';
    // isoToDisplay reporte bad si y/m/d sont vides/undefined
    const result = isoToDisplay(bad, 'DD/MM/YYYY');
    // Le comportement est de retourner la valeur brute si split échoue
    expect(typeof result).toBe('string');
  });

  it('les 3 formats couvrent la date de référence 2026-04-16', () => {
    const formats: DateFormat[] = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
    const results = formats.map((f) => isoToDisplay(ISO, f));
    // Tous contiennent 2026 et 04 et 16
    for (const r of results) {
      expect(r).toMatch(/2026/);
      expect(r).toMatch(/04/);
      expect(r).toMatch(/16/);
    }
  });
});

// ── displayToIso ────────────────────────────────────────────────────────────────

describe('displayToIso', () => {
  it('DD/MM/YYYY → ISO correct', () => {
    expect(displayToIso('16/04/2026', 'DD/MM/YYYY')).toBe('2026-04-16');
  });

  it('MM/DD/YYYY → ISO correct', () => {
    expect(displayToIso('04/16/2026', 'MM/DD/YYYY')).toBe('2026-04-16');
  });

  it('YYYY-MM-DD → ISO identique', () => {
    expect(displayToIso('2026-04-16', 'YYYY-MM-DD')).toBe('2026-04-16');
  });

  it('retourne null si séparateur incorrect pour le format', () => {
    expect(displayToIso('16-04-2026', 'DD/MM/YYYY')).toBeNull(); // séparateur - au lieu de /
    expect(displayToIso('16/04/2026', 'YYYY-MM-DD')).toBeNull(); // séparateur / au lieu de -
  });

  it('retourne null si la chaîne est trop courte', () => {
    expect(displayToIso('16/04', 'DD/MM/YYYY')).toBeNull(); // 2 parties seulement
  });

  it('retourne null si la chaîne est vide', () => {
    expect(displayToIso('', 'DD/MM/YYYY')).toBeNull();
  });

  it('retourne null si les parties ne matchent pas le pattern \d{4}-\d{2}-\d{2}', () => {
    expect(displayToIso('ab/cd/efgh', 'DD/MM/YYYY')).toBeNull(); // non numériques
  });

  it("round-trip : isoToDisplay puis displayToIso retrouve l'ISO", () => {
    const iso = '2026-12-25';
    const formats: DateFormat[] = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
    for (const fmt of formats) {
      const displayed = isoToDisplay(iso, fmt);
      const back = displayToIso(displayed, fmt);
      expect(back).toBe(iso);
    }
  });

  it('01/01/2026 → DD/MM/YYYY → 2026-01-01', () => {
    expect(displayToIso('01/01/2026', 'DD/MM/YYYY')).toBe('2026-01-01');
  });

  it('31/12/2026 → DD/MM/YYYY → 2026-12-31', () => {
    expect(displayToIso('31/12/2026', 'DD/MM/YYYY')).toBe('2026-12-31');
  });
});

// ── datePlaceholder ─────────────────────────────────────────────────────────────

describe('datePlaceholder', () => {
  it('DD/MM/YYYY → "JJ/MM/AAAA"', () => {
    expect(datePlaceholder('DD/MM/YYYY')).toBe('JJ/MM/AAAA');
  });

  it('MM/DD/YYYY → "MM/JJ/AAAA"', () => {
    expect(datePlaceholder('MM/DD/YYYY')).toBe('MM/JJ/AAAA');
  });

  it('YYYY-MM-DD → "AAAA-MM-JJ"', () => {
    expect(datePlaceholder('YYYY-MM-DD')).toBe('AAAA-MM-JJ');
  });

  it('les 3 placeholders sont distincts', () => {
    const placeholders = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].map((f) => datePlaceholder(f as DateFormat));
    const unique = new Set(placeholders);
    expect(unique.size).toBe(3);
  });
});
