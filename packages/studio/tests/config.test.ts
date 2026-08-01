import { describe, expect, it } from 'vitest';
import { ALL_VIEWS, parseRuntimeConfig } from '../src/main/config';

describe('parseRuntimeConfig', () => {
  it('defaults to live data with no headless capture', () => {
    const config = parseRuntimeConfig([], {});
    expect(config.dataMode).toBe('real');
    expect(config.headless).toBe(false);
    expect(config.screenshotViews).toEqual([]);
    expect(config.outDir).toBe('screenshots');
    expect(config.windowSize).toEqual({ width: 1440, height: 900 });
    expect(config.kiosk).toBe(false);
    expect(config.resetFixtures).toBe(false);
    expect(config.themeId).toBeUndefined();
    expect(config.initialView).toBeUndefined();
  });

  it('selects fixtures mode from a flag', () => {
    expect(parseRuntimeConfig(['--omd-data=fixtures'], {}).dataMode).toBe('fixtures');
  });

  it('selects fixtures mode from the environment', () => {
    expect(parseRuntimeConfig([], { OMD_STUDIO_DATA: 'fixtures' }).dataMode).toBe('fixtures');
  });

  it('prefers the flag over the environment variable', () => {
    const config = parseRuntimeConfig(['--omd-data=real'], { OMD_STUDIO_DATA: 'fixtures' });
    expect(config.dataMode).toBe('real');
  });

  it('expands a bare screenshots flag to every view and implies headless', () => {
    const config = parseRuntimeConfig(['--omd-screenshots'], {});
    expect(config.screenshotViews).toEqual([...ALL_VIEWS]);
    expect(config.headless).toBe(true);
  });

  it('expands `all` to every view', () => {
    expect(parseRuntimeConfig(['--omd-screenshots=all'], {}).screenshotViews).toEqual([
      ...ALL_VIEWS,
    ]);
  });

  it('parses a comma-separated view list and drops unknown views', () => {
    const config = parseRuntimeConfig(['--omd-screenshots=home, catalog , nope'], {});
    expect(config.screenshotViews).toEqual(['home', 'catalog']);
    expect(config.headless).toBe(true);
  });

  it('accepts composed capture scenes alongside views', () => {
    const config = parseRuntimeConfig(['--omd-screenshots=mixtape,burn-ready,home'], {});
    expect(config.screenshotViews).toEqual(['mixtape', 'burn-ready', 'home']);
    expect(config.headless).toBe(true);
  });

  it('supports headless without screenshots', () => {
    const config = parseRuntimeConfig(['--omd-headless'], {});
    expect(config.headless).toBe(true);
    expect(config.screenshotViews).toEqual([]);
  });

  it('reads the output folder, theme, initial view, and window size', () => {
    const config = parseRuntimeConfig(
      ['--omd-out=./shots', '--omd-theme=ember', '--omd-view=catalog', '--omd-size=1280x720'],
      {},
    );
    expect(config.outDir).toBe('./shots');
    expect(config.themeId).toBe('ember');
    expect(config.initialView).toBe('catalog');
    expect(config.windowSize).toEqual({ width: 1280, height: 720 });
  });

  it('ignores an unknown initial view', () => {
    expect(parseRuntimeConfig(['--omd-view=bogus'], {}).initialView).toBeUndefined();
  });

  it('ignores a malformed window size', () => {
    expect(parseRuntimeConfig(['--omd-size=huge'], {}).windowSize).toEqual({
      width: 1440,
      height: 900,
    });
  });

  it('parses the reset-fixtures flag', () => {
    expect(parseRuntimeConfig(['--omd-reset-fixtures'], {}).resetFixtures).toBe(true);
  });

  it('enables kiosk mode from a flag or the environment', () => {
    expect(parseRuntimeConfig(['--omd-kiosk'], {}).kiosk).toBe(true);
    expect(parseRuntimeConfig([], { OMD_STUDIO_KIOSK: '1' }).kiosk).toBe(true);
  });

  it('never enters kiosk mode headlessly', () => {
    expect(parseRuntimeConfig(['--omd-kiosk', '--omd-headless'], {}).kiosk).toBe(false);
    expect(parseRuntimeConfig(['--omd-kiosk', '--omd-screenshots=home'], {}).kiosk).toBe(false);
  });
});
