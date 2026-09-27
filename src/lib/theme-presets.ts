/**
 * Premium hospitality palettes. Every token the UI uses is derived from a handful of
 * base colours per mode, so presets stay consistent and the AI assistant only ever
 * needs to touch a few values.
 */

export type ModePalette = {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  mutedInk: string;
  primary: string;
  accent: string;
  border: string;
};

export type ThemePreset = {
  value: string;
  name: string;
  description: string;
  light: ModePalette;
  dark: ModePalette;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    value: 'saffron-noir',
    name: 'Saffron Noir',
    description: 'Charcoal, ivory and warm saffron gold with a deep wine accent.',
    light: {
      bg: '#faf7f2',
      surface: '#ffffff',
      ink: '#1c1917',
      muted: '#f0eae0',
      mutedInk: '#6f655a',
      primary: '#9a6b2c',
      accent: '#6b1f2a',
      border: '#e6ddd0'
    },
    dark: {
      bg: '#14110f',
      surface: '#1c1815',
      ink: '#f3ede4',
      muted: '#2a241f',
      mutedInk: '#a89c8e',
      primary: '#c8a15a',
      accent: '#b3707b',
      border: '#342c26'
    }
  },
  {
    value: 'olive-grove',
    name: 'Olive Grove',
    description: 'Mediterranean olive green with toasted almond.',
    light: {
      bg: '#f7f6f0',
      surface: '#ffffff',
      ink: '#1f231c',
      muted: '#ebeadf',
      mutedInk: '#62675a',
      primary: '#56663a',
      accent: '#a86f38',
      border: '#dfddcf'
    },
    dark: {
      bg: '#121410',
      surface: '#1a1d17',
      ink: '#eeeee6',
      muted: '#262a21',
      mutedInk: '#a3a894',
      primary: '#9aac6a',
      accent: '#d19a5b',
      border: '#30352a'
    }
  },
  {
    value: 'terracotta',
    name: 'Terracotta',
    description: 'Sun-baked clay with a deep herb green.',
    light: {
      bg: '#fbf6f1',
      surface: '#ffffff',
      ink: '#2a1a14',
      muted: '#f1e6dc',
      mutedInk: '#7a6558',
      primary: '#a94f2b',
      accent: '#2f4a3a',
      border: '#eadbcd'
    },
    dark: {
      bg: '#17110e',
      surface: '#201814',
      ink: '#f5ebe3',
      muted: '#2e231d',
      mutedInk: '#b19d90',
      primary: '#d9794f',
      accent: '#7fa38a',
      border: '#3a2d25'
    }
  },
  {
    value: 'classic-ivory',
    name: 'Classic Ivory',
    description: 'Fine-dining ivory, bottle green and brushed brass.',
    light: {
      bg: '#fdfcf9',
      surface: '#ffffff',
      ink: '#141414',
      muted: '#f2f0ea',
      mutedInk: '#6b6b66',
      primary: '#1f3a2e',
      accent: '#9c7a45',
      border: '#e7e4dc'
    },
    dark: {
      bg: '#0f1110',
      surface: '#171a18',
      ink: '#f2f1ec',
      muted: '#232725',
      mutedInk: '#a3a69f',
      primary: '#b08d57',
      accent: '#6f9a83',
      border: '#2c302d'
    }
  }
];

export const DEFAULT_PRESET = 'saffron-noir';

export type ThemeSettings = {
  preset: string;
  /** Optional overrides applied on top of the preset (both modes). */
  primary?: string | null;
  accent?: string | null;
  radius?: number;
};

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

export function normalizeHex(input: string): string | null {
  const m = input.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let hex = m[1].toLowerCase();
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  return `#${hex}`;
}

function hexToHsl(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

/**
 * Brand guard: no neon, electric or cyberpunk colours. Saturation is capped, and
 * bright blues / cyans / purples / magentas / limes are muted heavily. Returns the
 * (possibly adjusted) colour and whether it had to be changed.
 */
export function sanitizeBrandColor(input: string): { color: string; adjusted: boolean } | null {
  const hex = normalizeHex(input);
  if (!hex) return null;
  const { h, s, l } = hexToHsl(hex);
  let ns = Math.min(s, 0.62);
  let nl = l;
  const electricHue = (h >= 75 && h <= 150) || (h >= 165 && h <= 335);
  if (electricHue && l > 0.3 && l < 0.85) ns = Math.min(ns, 0.32);
  if (ns > 0.45 && l > 0.62) nl = 0.58; // pastel-neon glow
  const adjusted = Math.abs(ns - s) > 0.01 || Math.abs(nl - l) > 0.01;
  return { color: adjusted ? hslToHex(h, ns, nl) : hex, adjusted };
}

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

const readableOn = (hex: string) => (luminance(hex) > 0.4 ? '#17130f' : '#fbf8f3');

const mix = (a: string, b: string, weight: number) =>
  `color-mix(in oklch, ${a} ${Math.round(weight * 100)}%, ${b})`;

function tokens(p: ModePalette) {
  return {
    '--background': p.bg,
    '--foreground': p.ink,
    '--card': p.surface,
    '--card-foreground': p.ink,
    '--popover': p.surface,
    '--popover-foreground': p.ink,
    '--primary': p.primary,
    '--primary-foreground': readableOn(p.primary),
    '--secondary': p.muted,
    '--secondary-foreground': p.ink,
    '--muted': p.muted,
    '--muted-foreground': p.mutedInk,
    '--accent': mix(p.primary, p.surface, 0.12),
    '--accent-foreground': p.ink,
    '--brand-accent': p.accent,
    '--brand-accent-foreground': readableOn(p.accent),
    '--destructive': '#b4412f',
    '--destructive-foreground': '#ffffff',
    '--border': p.border,
    '--input': p.border,
    '--ring': p.primary,
    '--chart-1': p.primary,
    '--chart-2': p.accent,
    '--chart-3': mix(p.primary, p.bg, 0.55),
    '--chart-4': mix(p.accent, p.bg, 0.55),
    '--chart-5': p.mutedInk,
    '--sidebar': mix(p.muted, p.bg, 0.45),
    '--sidebar-foreground': p.ink,
    '--sidebar-primary': p.primary,
    '--sidebar-primary-foreground': readableOn(p.primary),
    '--sidebar-accent': p.muted,
    '--sidebar-accent-foreground': p.ink,
    '--sidebar-border': p.border,
    '--sidebar-ring': p.primary
  };
}

export function resolvePreset(value?: string) {
  return THEME_PRESETS.find((t) => t.value === value) ?? THEME_PRESETS[0];
}

export function buildThemeCss(theme: ThemeSettings): string {
  const preset = resolvePreset(theme.preset);
  const withOverrides = (p: ModePalette): ModePalette => ({
    ...p,
    primary: (theme.primary && sanitizeBrandColor(theme.primary)?.color) || p.primary,
    accent: (theme.accent && sanitizeBrandColor(theme.accent)?.color) || p.accent
  });
  const radius = Math.min(Math.max(theme.radius ?? 0.625, 0), 1.25);
  const block = (sel: string, vars: Record<string, string>) =>
    `${sel}{${Object.entries(vars)
      .map(([k, v]) => `${k}:${v}`)
      .join(';')}}`;
  return [
    block(':root', { ...tokens(withOverrides(preset.light)), '--radius': `${radius}rem` }),
    block('.dark', tokens(withOverrides(preset.dark)))
  ].join('\n');
}
