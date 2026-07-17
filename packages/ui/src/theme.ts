/**
 * OMD theme engine.
 *
 * A theme is data only: a small set of named design tokens plus optional local
 * assets. Themes never ship CSS, JavaScript, or layout; the app layout is fixed
 * and only the tokens change. Tokens resolve to CSS custom properties (for
 * example `accent` becomes `--omd-accent`) that the shell and player read.
 */

/** The locked v1 color, shape, and typography token vocabulary. */
export interface ThemeTokens {
  'app.background': string;
  'surface.background': string;
  'text.primary': string;
  'text.muted': string;
  accent: string;
  'transport.button': string;
  'transport.buttonActive': string;
  'progress.track': string;
  'progress.fill': string;
  'vu.low': string;
  'vu.high': string;
  'typography.uiFont': string;
  'typography.displayFont': string;
  'shape.radius': string;
  'shape.borderStyle': string;
  'shape.glow': string;
  /** Theme personality: full CSS value strings so a theme can restyle surfaces, not just recolor them. */
  'background.scene': string;
  'surface.glass': string;
  'surface.border': string;
  'surface.shadow': string;
  'surface.rim': string;
  'effect.gloss': string;
  'effect.glow': string;
  /** Control surfaces: secondary/glass buttons, nav items, selects, nested panels. */
  'control.surface': string;
  'control.border': string;
  /** Primary/active control body fill (primary button, active nav). */
  'button.primary': string;
  /** Liquid-rim mid color for secondary and primary controls (Dark Aero makes them differ). */
  'rim.secondary': string;
  'rim.primary': string;
}

/** Every token key, in a stable order. */
export const THEME_TOKEN_KEYS: readonly (keyof ThemeTokens)[] = [
  'app.background',
  'surface.background',
  'text.primary',
  'text.muted',
  'accent',
  'transport.button',
  'transport.buttonActive',
  'progress.track',
  'progress.fill',
  'vu.low',
  'vu.high',
  'typography.uiFont',
  'typography.displayFont',
  'shape.radius',
  'shape.borderStyle',
  'shape.glow',
  'background.scene',
  'surface.glass',
  'surface.border',
  'surface.shadow',
  'surface.rim',
  'effect.gloss',
  'effect.glow',
  'control.surface',
  'control.border',
  'button.primary',
  'rim.secondary',
  'rim.primary',
];

export type ThemeType = 'light' | 'dark';
export type VisualizerKind = 'bars' | 'oscilloscope' | 'none';

/** A theme as authored. */
export interface OmdTheme {
  id: string;
  name: string;
  type: ThemeType;
  /** Partial overrides; omitted tokens fall back to the base for `type`. */
  tokens?: Partial<ThemeTokens>;
  /** Optional decorative texture. A relative path or `data:` URI; remote URLs are rejected. */
  texture?: string;
  /** Now Playing visualizer style. Defaults to `bars`. */
  visualizer?: VisualizerKind;
}

/** A fully resolved theme, ready to apply to the UI. */
export interface ResolvedTheme {
  id: string;
  name: string;
  type: ThemeType;
  tokens: ThemeTokens;
  visualizer: VisualizerKind;
  texture?: string;
  /** CSS custom properties keyed by variable name (for example `--omd-accent`). */
  cssVariables: Record<string, string>;
}

/** Default light tokens: the shipped Frutiger Aero (cool aqua glass) palette. */
export const AQUA_TOKENS: ThemeTokens = {
  'app.background': '#F7FDFF',
  'surface.background': '#BEE9FB',
  'text.primary': '#0D5D80',
  'text.muted': '#4E86A0',
  accent: '#00D4E7',
  'transport.button': '#55C7F2',
  'transport.buttonActive': '#00D4E7',
  'progress.track': '#C9D3DA',
  'progress.fill': '#00D4E7',
  'vu.low': '#36D17A',
  'vu.high': '#FF5A5F',
  'typography.uiFont': "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif",
  'typography.displayFont': "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif",
  'shape.radius': '12px',
  'shape.borderStyle': 'solid',
  'shape.glow': '0 0 12px rgba(0, 212, 231, 0.35)',
  'background.scene':
    'radial-gradient(ellipse 48% 28% at 50% 18%, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.52) 20%, rgba(255, 255, 255, 0.14) 42%, transparent 68%), radial-gradient(ellipse 85% 55% at 50% 100%, rgba(255, 234, 190, 0.32) 0%, rgba(255, 223, 170, 0.18) 24%, rgba(255, 214, 150, 0.08) 42%, transparent 72%), linear-gradient(180deg, #DFF7FF 0%, #C8F0FB 20%, #BDEBF6 35%, #C7F6F7 54%, #D7FBF5 70%, #F7F3DF 100%)',
  'surface.glass':
    'linear-gradient(180deg, rgba(255, 255, 255, 0.66) 0%, rgba(255, 255, 255, 0.2) 88px, rgba(255, 255, 255, 0.04) 96px), linear-gradient(180deg, rgba(255, 255, 255, 0.62), rgba(218, 248, 255, 0.32))',
  'surface.border': 'rgba(255, 255, 255, 0.85)',
  'surface.shadow':
    'inset 0 1px 0 rgba(255, 255, 255, 0.98), inset 0 -2px 4px rgba(16, 118, 160, 0.1), 0 20px 48px -22px rgba(18, 113, 154, 0.42), 0 4px 12px -8px rgba(18, 113, 154, 0.24)',
  'surface.rim':
    'conic-gradient(from 210deg, rgba(184, 132, 247, 0.9), rgba(85, 199, 242, 0.9), rgba(0, 212, 231, 0.9), rgba(54, 209, 122, 0.9), rgba(255, 224, 122, 0.9), rgba(255, 146, 194, 0.9), rgba(184, 132, 247, 0.9))',
  'effect.gloss':
    'linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.4) 38%, rgba(255, 255, 255, 0.08) 49%, rgba(255, 255, 255, 0) 52%)',
  'effect.glow': '0 10px 26px -10px color-mix(in srgb, #00D4E7 70%, transparent)',
  'control.surface':
    'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, color-mix(in srgb, #BEE9FB 42%, #fff) 100%)',
  'control.border': 'rgba(255, 255, 255, 0.9)',
  'button.primary':
    'linear-gradient(180deg, color-mix(in srgb, #55C7F2 52%, #fff) 0%, #55C7F2 42%, #00D4E7 100%)',
  'rim.secondary': 'rgba(91, 186, 225, 0.85)',
  'rim.primary': 'rgba(91, 186, 225, 0.85)',
};

/** Default dark tokens, used as the fallback base for dark themes. */
export const MIDNIGHT_TOKENS: ThemeTokens = {
  'app.background': '#10161B',
  'surface.background': '#1B2730',
  'text.primary': '#E7F1F6',
  'text.muted': '#8CA2AE',
  accent: '#00D4E7',
  'transport.button': '#2A6F86',
  'transport.buttonActive': '#00D4E7',
  'progress.track': '#2A3A44',
  'progress.fill': '#00D4E7',
  'vu.low': '#36D17A',
  'vu.high': '#FF5A5F',
  'typography.uiFont': "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif",
  'typography.displayFont': "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif",
  'shape.radius': '12px',
  'shape.borderStyle': 'solid',
  'shape.glow': '0 0 12px rgba(0, 212, 231, 0.30)',
  'background.scene':
    'radial-gradient(1200px 700px at 10% -10%, color-mix(in srgb, #00D4E7 22%, transparent), transparent 55%), radial-gradient(1100px 700px at 115% 5%, color-mix(in srgb, #6C5CE7 22%, transparent), transparent 55%), linear-gradient(180deg, #10161B 0%, #0B1116 100%)',
  'surface.glass':
    'linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02) 92px), linear-gradient(180deg, rgba(27, 39, 48, 0.86), rgba(16, 22, 27, 0.7))',
  'surface.border': 'rgba(255, 255, 255, 0.14)',
  'surface.shadow':
    '0 1px 0 rgba(255, 255, 255, 0.12) inset, 0 0 0 1px rgba(0, 0, 0, 0.4), 0 26px 50px -26px rgba(0, 0, 0, 0.7)',
  'surface.rim':
    'conic-gradient(from 210deg, rgba(184, 132, 247, 0.9), rgba(85, 199, 242, 0.9), rgba(0, 212, 231, 0.9), rgba(54, 209, 122, 0.9), rgba(255, 224, 122, 0.9), rgba(255, 146, 194, 0.9), rgba(184, 132, 247, 0.9))',
  'effect.gloss':
    'linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.08) 45%, rgba(255, 255, 255, 0) 52%)',
  'effect.glow': '0 10px 26px -10px color-mix(in srgb, #00D4E7 55%, transparent)',
  'control.surface':
    'linear-gradient(180deg, rgba(150, 195, 225, 0.14) 0%, rgba(20, 34, 48, 0.55) 100%)',
  'control.border': 'rgba(150, 195, 225, 0.24)',
  'button.primary':
    'linear-gradient(180deg, color-mix(in srgb, #00D4E7 45%, #0B2230) 0%, color-mix(in srgb, #00D4E7 30%, #0A1A26) 100%)',
  'rim.secondary': 'rgba(150, 168, 180, 0.5)',
  'rim.primary': 'rgba(0, 200, 228, 0.85)',
};

/** DORFic: a warm orange / amber glass palette. */
export const DORFIC_TOKENS: ThemeTokens = {
  ...AQUA_TOKENS,
  'app.background': '#FFFDF7',
  'surface.background': '#FBE6BE',
  'text.primary': '#803B0D',
  'text.muted': '#A96A3A',
  accent: '#E76F00',
  'transport.button': '#F2AD55',
  'transport.buttonActive': '#E76F00',
  'progress.track': '#DAD4C9',
  'progress.fill': '#E76F00',
  'shape.glow': '0 0 12px rgba(231, 111, 0, 0.32)',
  'background.scene':
    'radial-gradient(ellipse 50% 30% at 50% 14%, rgba(255, 255, 255, 0.82) 0%, rgba(255, 250, 240, 0.38) 24%, transparent 62%), radial-gradient(ellipse 88% 58% at 50% 100%, rgba(255, 196, 138, 0.32) 0%, rgba(255, 183, 120, 0.15) 40%, transparent 74%), linear-gradient(180deg, #FFF3E4 0%, #FFE6CD 24%, #FFDDBB 46%, #FFE4C8 66%, #FFF1E0 100%)',
  'surface.glass':
    'linear-gradient(180deg, rgba(255, 255, 255, 0.66) 0%, rgba(255, 245, 225, 0.22) 88px, rgba(255, 245, 225, 0.04) 96px), linear-gradient(180deg, rgba(255, 255, 255, 0.62), rgba(255, 243, 218, 0.32))',
  'surface.shadow':
    'inset 0 1px 0 rgba(255, 255, 255, 0.98), inset 0 -2px 4px rgba(160, 78, 16, 0.1), 0 20px 48px -22px rgba(154, 76, 18, 0.42), 0 4px 12px -8px rgba(154, 76, 18, 0.24)',
  'surface.rim':
    'conic-gradient(from 210deg, rgba(247, 202, 132, 0.9), rgba(242, 173, 85, 0.9), rgba(231, 111, 0, 0.9), rgba(255, 196, 138, 0.9), rgba(247, 202, 132, 0.9))',
  'effect.glow': '0 10px 26px -10px color-mix(in srgb, #E76F00 65%, transparent)',
  'control.surface':
    'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, color-mix(in srgb, #FBE6BE 50%, #fff) 100%)',
  'button.primary':
    'linear-gradient(180deg, color-mix(in srgb, #F2AD55 52%, #fff) 0%, #F2AD55 42%, #E76F00 100%)',
  'rim.secondary': 'rgba(230, 150, 70, 0.85)',
  'rim.primary': 'rgba(230, 150, 70, 0.85)',
};

/** Technozen: a sage / matcha green palette on near-white glass. */
export const TECHNOZEN_TOKENS: ThemeTokens = {
  ...AQUA_TOKENS,
  'app.background': '#FBFCFA',
  'surface.background': '#DBE8D1',
  'text.primary': '#386726',
  'text.muted': '#5F8A4A',
  accent: '#5DB433',
  'transport.button': '#98CF78',
  'transport.buttonActive': '#5DB433',
  'progress.track': '#D1D5CE',
  'progress.fill': '#5DB433',
  'vu.low': '#58AF7E',
  'shape.glow': '0 0 12px rgba(93, 180, 51, 0.3)',
  'background.scene':
    'radial-gradient(ellipse 50% 30% at 50% 12%, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.55) 24%, transparent 62%), radial-gradient(ellipse 88% 58% at 50% 100%, rgba(206, 232, 200, 0.28) 0%, rgba(224, 240, 214, 0.12) 40%, transparent 74%), linear-gradient(180deg, #F7FBF5 0%, #EEF6EA 26%, #EAF3E4 50%, #F0F7EA 74%, #FAFCF7 100%)',
  'surface.glass':
    'linear-gradient(180deg, rgba(255, 255, 255, 0.66) 0%, rgba(240, 246, 236, 0.22) 88px, rgba(240, 246, 236, 0.04) 96px), linear-gradient(180deg, rgba(255, 255, 255, 0.62), rgba(236, 242, 231, 0.32))',
  'surface.shadow':
    'inset 0 1px 0 rgba(255, 255, 255, 0.98), inset 0 -2px 4px rgba(72, 128, 48, 0.1), 0 20px 48px -22px rgba(70, 124, 48, 0.42), 0 4px 12px -8px rgba(70, 124, 48, 0.24)',
  'surface.rim':
    'conic-gradient(from 210deg, rgba(183, 219, 160, 0.9), rgba(152, 207, 120, 0.9), rgba(93, 180, 51, 0.9), rgba(88, 175, 126, 0.9), rgba(183, 219, 160, 0.9))',
  'effect.glow': '0 10px 26px -10px color-mix(in srgb, #5DB433 60%, transparent)',
  'control.surface':
    'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, color-mix(in srgb, #DBE8D1 50%, #fff) 100%)',
  'button.primary':
    'linear-gradient(180deg, color-mix(in srgb, #98CF78 52%, #fff) 0%, #98CF78 42%, #5DB433 100%)',
  'rim.secondary': 'rgba(140, 190, 110, 0.85)',
  'rim.primary': 'rgba(140, 190, 110, 0.85)',
};

/** Dark Aero: neon-cyan glassmorphism on a deep navy canvas. */
export const DARK_AERO_TOKENS: ThemeTokens = {
  ...MIDNIGHT_TOKENS,
  'app.background': '#070D18',
  'surface.background': '#0E1B2A',
  'text.primary': '#CDE8F6',
  'text.muted': '#7E9AAC',
  accent: '#00D4E7',
  'transport.button': '#37B6DE',
  'transport.buttonActive': '#00D4E7',
  'progress.track': '#23384A',
  'progress.fill': '#00D4E7',
  'shape.glow': '0 0 14px rgba(0, 212, 231, 0.4)',
  'background.scene':
    'radial-gradient(ellipse 72% 46% at 50% 0%, rgba(22, 78, 126, 0.42) 0%, rgba(12, 42, 74, 0.18) 42%, transparent 74%), radial-gradient(ellipse 42% 30% at 82% 8%, rgba(0, 178, 222, 0.14) 0%, transparent 62%), linear-gradient(180deg, #070D18 0%, #0A1220 42%, #0A1424 72%, #0C1526 100%)',
  'surface.glass':
    'linear-gradient(180deg, rgba(160, 212, 238, 0.1) 0%, rgba(160, 212, 238, 0.03) 88px, transparent 96px), linear-gradient(180deg, rgba(18, 40, 60, 0.62), rgba(9, 18, 30, 0.5))',
  'surface.border': 'rgba(120, 180, 215, 0.28)',
  'surface.shadow':
    'inset 0 1px 0 rgba(160, 215, 240, 0.18), inset 0 -2px 4px rgba(0, 0, 0, 0.35), 0 26px 50px -26px rgba(0, 0, 0, 0.8), 0 0 30px -14px rgba(0, 190, 225, 0.35)',
  'surface.rim':
    'conic-gradient(from 210deg, rgba(0, 152, 184, 0.7), rgba(85, 199, 242, 0.7), rgba(0, 212, 231, 0.8), rgba(23, 90, 126, 0.7), rgba(0, 152, 184, 0.7))',
  'effect.gloss':
    'linear-gradient(180deg, rgba(185, 228, 246, 0.42) 0%, rgba(185, 228, 246, 0.12) 45%, rgba(185, 228, 246, 0) 52%)',
  'effect.glow': '0 0 24px -6px color-mix(in srgb, #00D4E7 55%, transparent)',
  'control.surface':
    'linear-gradient(180deg, rgba(150, 200, 228, 0.13) 0%, rgba(16, 32, 48, 0.6) 100%)',
  'control.border': 'rgba(130, 180, 210, 0.3)',
  'button.primary':
    'radial-gradient(ellipse 64% 54% at 50% 118%, rgba(36, 190, 236, 0.34) 0%, rgba(0, 70, 96, 0.16) 44%, transparent 72%), linear-gradient(180deg, rgba(11, 40, 55, 0.95) 0%, rgba(14, 50, 66, 0.9) 50%, rgba(9, 32, 46, 0.95) 100%)',
  'rim.secondary': 'rgba(150, 168, 180, 0.5)',
  'rim.primary': 'rgba(0, 200, 228, 0.85)',
};

/** Frutiger Aero: the shipped default (cool aqua glass). */
export const FRUTIGER_AERO_THEME: OmdTheme = {
  id: 'frutiger-aero',
  name: 'Frutiger Aero',
  type: 'light',
  tokens: AQUA_TOKENS,
  visualizer: 'bars',
};

/** DORFic: warm orange / amber. */
export const DORFIC_THEME: OmdTheme = {
  id: 'dorfic',
  name: 'DORFic',
  type: 'light',
  tokens: DORFIC_TOKENS,
  visualizer: 'bars',
};

/** Technozen: sage / matcha green. */
export const TECHNOZEN_THEME: OmdTheme = {
  id: 'technozen',
  name: 'Technozen',
  type: 'light',
  tokens: TECHNOZEN_TOKENS,
  visualizer: 'bars',
};

/** Dark Aero: neon cyan on dark glassmorphism. */
export const DARK_AERO_THEME: OmdTheme = {
  id: 'dark-aero',
  name: 'Dark Aero',
  type: 'dark',
  tokens: DARK_AERO_TOKENS,
  visualizer: 'bars',
};

/** Themes that ship with the app. */
export const BUILTIN_THEMES: readonly OmdTheme[] = [
  FRUTIGER_AERO_THEME,
  DORFIC_THEME,
  TECHNOZEN_THEME,
  DARK_AERO_THEME,
];

/** The theme applied when none is selected. */
export const DEFAULT_THEME: OmdTheme = FRUTIGER_AERO_THEME;

/** Look up a built-in theme by id. */
export function getBuiltinTheme(id: string): OmdTheme | undefined {
  return BUILTIN_THEMES.find((theme) => theme.id === id);
}

/** The complete fallback token set for a theme type. */
export function baseTokens(type: ThemeType): ThemeTokens {
  return type === 'dark' ? MIDNIGHT_TOKENS : AQUA_TOKENS;
}

function camelToKebab(segment: string): string {
  return segment.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/** Convert a token key such as `transport.buttonActive` to `--omd-transport-button-active`. */
export function tokenToCssVar(token: string): string {
  const kebab = token.split('.').map(camelToKebab).join('-');
  return `--omd-${kebab}`;
}

/**
 * True when an asset reference is not a local, bundle-safe path.
 *
 * Relative paths and `data:` URIs are local. Anything with a URL scheme
 * (`http:`, `https:`, `file:`, `javascript:`, ...) or a protocol-relative `//`
 * prefix is treated as remote and rejected, so a theme cannot pull assets from
 * the network inside the Electron renderer.
 */
export function isRemoteAsset(value: string): boolean {
  const v = value.trim();
  if (v === '' || v.startsWith('data:')) return false;
  return /^[a-z][a-z0-9+.-]+:/i.test(v) || v.startsWith('//');
}

/** Options for {@link resolveTheme}. */
export interface ResolveThemeOptions {
  /** Drop a remote texture instead of throwing. Defaults to `false`. */
  dropRemoteAssets?: boolean;
}

/**
 * Resolve an authored theme into a full token set and CSS variable map.
 *
 * Missing tokens fall back to the base for the theme's `type`, so a partial
 * theme always yields a complete, usable set. A remote texture throws (or is
 * dropped when `dropRemoteAssets` is set).
 */
export function resolveTheme(theme: OmdTheme, options: ResolveThemeOptions = {}): ResolvedTheme {
  const type: ThemeType = theme.type === 'dark' ? 'dark' : 'light';
  const tokens: ThemeTokens = { ...baseTokens(type), ...(theme.tokens ?? {}) };

  let texture: string | undefined;
  const rawTexture = theme.texture?.trim() ?? '';
  if (rawTexture !== '') {
    if (isRemoteAsset(rawTexture)) {
      if (!options.dropRemoteAssets) {
        throw new Error(
          `Theme "${theme.id}" texture must be a local asset, not a remote URL: ${rawTexture}`,
        );
      }
    } else {
      texture = rawTexture;
    }
  }

  const visualizer: VisualizerKind = theme.visualizer ?? 'bars';

  const cssVariables: Record<string, string> = {};
  for (const key of THEME_TOKEN_KEYS) {
    cssVariables[tokenToCssVar(key)] = tokens[key];
  }
  if (texture !== undefined) {
    cssVariables['--omd-texture'] = `url("${texture.replace(/"/g, '%22')}")`;
  }

  return {
    id: theme.id,
    name: theme.name,
    type,
    tokens,
    visualizer,
    ...(texture !== undefined ? { texture } : {}),
    cssVariables,
  };
}

/** A minimal target for {@link applyTheme}: an `HTMLElement` satisfies this. */
export interface StyleTarget {
  style: { setProperty(property: string, value: string): void };
}

/** Write a resolved theme's CSS variables onto a style target (for example `document.documentElement`). */
export function applyTheme(target: StyleTarget, resolved: ResolvedTheme): void {
  for (const [name, value] of Object.entries(resolved.cssVariables)) {
    target.style.setProperty(name, value);
  }
}

/** Report human-readable problems with an authored theme; empty when valid. */
export function validateTheme(theme: OmdTheme): string[] {
  const issues: string[] = [];
  if (!theme.id || theme.id.trim() === '') issues.push('theme id must not be empty');
  if (!theme.name || theme.name.trim() === '') issues.push('theme name must not be empty');
  if (theme.type !== 'light' && theme.type !== 'dark') {
    issues.push(`theme type must be "light" or "dark", got "${String(theme.type)}"`);
  }
  if (
    theme.visualizer !== undefined &&
    theme.visualizer !== 'bars' &&
    theme.visualizer !== 'oscilloscope' &&
    theme.visualizer !== 'none'
  ) {
    issues.push(`visualizer must be bars, oscilloscope, or none, got "${String(theme.visualizer)}"`);
  }
  if (theme.texture !== undefined && theme.texture.trim() !== '' && isRemoteAsset(theme.texture)) {
    issues.push(`texture must be a local asset, not a remote URL: ${theme.texture}`);
  }
  return issues;
}
