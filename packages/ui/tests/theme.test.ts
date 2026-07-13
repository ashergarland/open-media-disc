import { describe, expect, it } from 'vitest';
import {
  AQUA_THEME,
  AQUA_TOKENS,
  MIDNIGHT_TOKENS,
  applyTheme,
  getBuiltinTheme,
  isRemoteAsset,
  resolveTheme,
  tokenToCssVar,
  validateTheme,
  type OmdTheme,
  type StyleTarget,
} from '../src/index.js';

describe('tokenToCssVar', () => {
  it('maps dotted and camelCase tokens to --omd- kebab variables', () => {
    expect(tokenToCssVar('accent')).toBe('--omd-accent');
    expect(tokenToCssVar('app.background')).toBe('--omd-app-background');
    expect(tokenToCssVar('transport.buttonActive')).toBe('--omd-transport-button-active');
    expect(tokenToCssVar('vu.low')).toBe('--omd-vu-low');
  });
});

describe('resolveTheme', () => {
  it('produces CSS variables for the Aqua palette', () => {
    const resolved = resolveTheme(AQUA_THEME);
    expect(resolved.cssVariables['--omd-accent']).toBe('#00D4E7');
    expect(resolved.cssVariables['--omd-app-background']).toBe('#F7FDFF');
    expect(resolved.cssVariables['--omd-transport-button-active']).toBe('#00D4E7');
    expect(resolved.visualizer).toBe('bars');
  });

  it('falls back to the base tokens for omitted values', () => {
    const resolved = resolveTheme({
      id: 'partial',
      name: 'Partial',
      type: 'light',
      tokens: { accent: '#123456' },
    });
    expect(resolved.tokens.accent).toBe('#123456');
    expect(resolved.tokens['surface.background']).toBe(AQUA_TOKENS['surface.background']);
  });

  it('uses the dark base for dark themes', () => {
    const resolved = resolveTheme({ id: 'd', name: 'D', type: 'dark' });
    expect(resolved.tokens['app.background']).toBe(MIDNIGHT_TOKENS['app.background']);
  });

  it('accepts a local texture and emits a url() variable', () => {
    const resolved = resolveTheme({
      id: 't',
      name: 'T',
      type: 'light',
      texture: 'textures/aqua.png',
    });
    expect(resolved.texture).toBe('textures/aqua.png');
    expect(resolved.cssVariables['--omd-texture']).toBe('url("textures/aqua.png")');
  });

  it('rejects a remote texture by default', () => {
    expect(() =>
      resolveTheme({ id: 't', name: 'T', type: 'light', texture: 'https://cdn.example/x.png' }),
    ).toThrow(/remote URL/);
  });

  it('drops a remote texture when asked', () => {
    const resolved = resolveTheme(
      { id: 't', name: 'T', type: 'light', texture: 'https://cdn.example/x.png' },
      { dropRemoteAssets: true },
    );
    expect(resolved.texture).toBeUndefined();
    expect(resolved.cssVariables['--omd-texture']).toBeUndefined();
  });
});

describe('isRemoteAsset', () => {
  it('treats URL schemes and protocol-relative paths as remote', () => {
    expect(isRemoteAsset('http://a/b.png')).toBe(true);
    expect(isRemoteAsset('https://a/b.png')).toBe(true);
    expect(isRemoteAsset('//a/b.png')).toBe(true);
    expect(isRemoteAsset('file:///a/b.png')).toBe(true);
    expect(isRemoteAsset('javascript:alert(1)')).toBe(true);
  });

  it('treats relative paths, data URIs, and Windows paths as local', () => {
    expect(isRemoteAsset('textures/a.png')).toBe(false);
    expect(isRemoteAsset('data:image/png;base64,AAAA')).toBe(false);
    expect(isRemoteAsset('C:/themes/a.png')).toBe(false);
    expect(isRemoteAsset('')).toBe(false);
  });
});

describe('applyTheme', () => {
  it('writes every CSS variable onto the target', () => {
    const set: Record<string, string> = {};
    const target: StyleTarget = { style: { setProperty: (k, v) => (set[k] = v) } };
    const resolved = resolveTheme(AQUA_THEME);
    applyTheme(target, resolved);
    expect(set['--omd-accent']).toBe('#00D4E7');
    expect(Object.keys(set).length).toBe(Object.keys(resolved.cssVariables).length);
  });
});

describe('validateTheme', () => {
  it('accepts a valid theme', () => {
    expect(validateTheme(AQUA_THEME)).toEqual([]);
  });

  it('reports empty id, bad type, and remote texture', () => {
    const bad = {
      id: '',
      name: 'X',
      type: 'neon',
      texture: 'https://cdn.example/x.png',
    } as unknown as OmdTheme;
    const issues = validateTheme(bad);
    expect(issues.length).toBeGreaterThanOrEqual(3);
  });
});

describe('getBuiltinTheme', () => {
  it('finds Aqua and returns undefined for unknown ids', () => {
    expect(getBuiltinTheme('aqua')).toBe(AQUA_THEME);
    expect(getBuiltinTheme('nope')).toBeUndefined();
  });
});
