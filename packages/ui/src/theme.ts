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

/** Default light tokens: the shipped Aqua (Y2K / Frutiger Aero) palette. */
export const AQUA_TOKENS: ThemeTokens = {
  'app.background': '#F7FDFF',
  'surface.background': '#BEE9FB',
  'text.primary': '#2B3A42',
  'text.muted': '#6E8794',
  accent: '#00D4E7',
  'transport.button': '#55C7F2',
  'transport.buttonActive': '#00D4E7',
  'progress.track': '#C9D3DA',
  'progress.fill': '#00D4E7',
  'vu.low': '#36D17A',
  'vu.high': '#FF5A5F',
  'typography.uiFont': "'Inter', system-ui, sans-serif",
  'typography.displayFont': "'Poppins', 'Inter', sans-serif",
  'shape.radius': '12px',
  'shape.borderStyle': 'solid',
  'shape.glow': '0 0 12px rgba(0, 212, 231, 0.35)',
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
  'typography.uiFont': "'Inter', system-ui, sans-serif",
  'typography.displayFont': "'Poppins', 'Inter', sans-serif",
  'shape.radius': '12px',
  'shape.borderStyle': 'solid',
  'shape.glow': '0 0 12px rgba(0, 212, 231, 0.30)',
};

/** The shipped default theme. */
export const AQUA_THEME: OmdTheme = {
  id: 'aqua',
  name: 'Aqua',
  type: 'light',
  tokens: AQUA_TOKENS,
  visualizer: 'bars',
};

/** A built-in dark counterpart to Aqua. */
export const MIDNIGHT_THEME: OmdTheme = {
  id: 'midnight',
  name: 'Midnight',
  type: 'dark',
  tokens: MIDNIGHT_TOKENS,
  visualizer: 'bars',
};

/** Themes that ship with the app. */
export const BUILTIN_THEMES: readonly OmdTheme[] = [AQUA_THEME, MIDNIGHT_THEME];

/** The theme applied when none is selected. */
export const DEFAULT_THEME: OmdTheme = AQUA_THEME;

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
