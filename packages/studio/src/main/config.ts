/**
 * OMD Studio runtime configuration.
 *
 * Parses app-specific flags (and matching environment variables) that select the
 * data source, drive the headless screenshot harness, and enable appliance
 * (kiosk) mode. Flags are prefixed `--omd-` so they never collide with
 * Chromium/Electron's own switches.
 *
 * This module is intentionally free of any Electron or Node filesystem imports
 * so it can be unit-tested as pure logic.
 */

import type { StudioDataMode } from '../shared/types';

/** Every navigable view, in the order screenshots are captured for `all`. */
export const ALL_VIEWS = ['home', 'disc', 'catalog', 'burn', 'labels', 'themes', 'settings'] as const;
export type StudioView = (typeof ALL_VIEWS)[number];

/** Fully-resolved runtime configuration for the main process. */
export interface StudioRuntimeConfig {
  /** `real` = live core + optical drives; `fixtures` = deterministic demo data. */
  dataMode: StudioDataMode;
  /** Run without showing an interactive window (implied by screenshots). */
  headless: boolean;
  /** Views to screenshot; empty means "don't capture, just run". */
  screenshotViews: StudioView[];
  /** Folder screenshots are written to. */
  outDir: string;
  /** Theme id to apply on boot, if any. */
  themeId?: string;
  /** View to open on boot (for non-screenshot headless sessions). */
  initialView?: StudioView;
  /** Window size used for the (hidden) capture surface. */
  windowSize: { width: number; height: number };
  /** Appliance mode: launch full-screen with no window chrome (opt-in). */
  kiosk: boolean;
  /** Regenerate the fixture library even if it already exists. */
  resetFixtures: boolean;
}

function isView(value: string): value is StudioView {
  return (ALL_VIEWS as readonly string[]).includes(value);
}

/** Read `--omd-<name>` (with optional `=value`) from argv; `null` when absent. */
function flag(argv: string[], name: string): string | null {
  const prefix = `--omd-${name}`;
  for (const arg of argv) {
    if (arg === prefix) return '';
    if (arg.startsWith(`${prefix}=`)) return arg.slice(prefix.length + 1);
  }
  return null;
}

/** Coerce a flag/env string to a boolean; empty string (bare flag) is true. */
function truthy(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (value === '') return true;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

/** Prefer the argv flag, falling back to the environment variable. */
function pick(argv: string[], flagName: string, envValue: string | undefined): string | null {
  const fromFlag = flag(argv, flagName);
  if (fromFlag !== null) return fromFlag;
  return envValue !== undefined ? envValue : null;
}

/** Parse a `<width>x<height>` string, or return null when malformed. */
function parseSize(value: string | null): { width: number; height: number } | null {
  if (!value) return null;
  const match = /^(\d+)\s*[xX]\s*(\d+)$/.exec(value.trim());
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

/** Expand a screenshots value (`all`, a CSV list, or empty) into concrete views. */
function parseScreenshotViews(value: string | null): StudioView[] {
  if (value === null) return [];
  if (value === '' || value.toLowerCase() === 'all') return [...ALL_VIEWS];
  const views = value
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0)
    .filter(isView);
  return views;
}

/**
 * Resolve the runtime configuration from process arguments and environment.
 * Argv flags take precedence over the matching `OMD_STUDIO_*` variables.
 */
export function parseRuntimeConfig(
  argv: string[] = [],
  env: NodeJS.ProcessEnv = {},
): StudioRuntimeConfig {
  const dataRaw = (pick(argv, 'data', env.OMD_STUDIO_DATA) ?? 'real').toLowerCase();
  const dataMode: StudioDataMode = dataRaw === 'fixtures' ? 'fixtures' : 'real';

  const screenshotViews = parseScreenshotViews(pick(argv, 'screenshots', env.OMD_STUDIO_SCREENSHOTS));

  // Screenshots require a headless capture surface, so they imply headless.
  const headless = screenshotViews.length > 0 || truthy(pick(argv, 'headless', env.OMD_STUDIO_HEADLESS));

  const outDir = pick(argv, 'out', env.OMD_STUDIO_OUT) || 'screenshots';
  const themeId = pick(argv, 'theme', env.OMD_STUDIO_THEME) || undefined;

  const viewRaw = (pick(argv, 'view', env.OMD_STUDIO_VIEW) ?? '').toLowerCase();
  const initialView = isView(viewRaw) ? viewRaw : undefined;

  const windowSize = parseSize(pick(argv, 'size', env.OMD_STUDIO_SIZE)) ?? { width: 1440, height: 900 };
  // Kiosk is never implied: a desktop session must not lose its window chrome.
  const kiosk = !headless && truthy(pick(argv, 'kiosk', env.OMD_STUDIO_KIOSK));
  const resetFixtures = truthy(pick(argv, 'reset-fixtures', env.OMD_STUDIO_RESET_FIXTURES));

  return {
    dataMode,
    headless,
    screenshotViews,
    outDir,
    ...(themeId ? { themeId } : {}),
    ...(initialView ? { initialView } : {}),
    windowSize,
    kiosk,
    resetFixtures,
  };
}
