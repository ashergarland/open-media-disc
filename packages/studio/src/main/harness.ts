/**
 * Headless screenshot harness.
 *
 * Drives the renderer through `webContents.executeJavaScript` (calling the
 * `window.__omdHarness` surface the renderer installs in harness mode), settles
 * each view, and captures a PNG. Runs against a hidden window, so an agent can
 * generate documentation/debug screenshots without a visible app.
 */

import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import type { BrowserWindow } from 'electron';

export interface ScreenshotHarnessOptions {
  /** Views to capture, in order. */
  views: string[];
  /** Absolute folder screenshots are written to. */
  outDir: string;
  /** `fixtures` mode loads the demo disc into the transport before capturing. */
  dataMode: 'real' | 'fixtures';
  /** Milliseconds to let each view settle before capture. */
  settleMs?: number;
}

const readyScript = 'Boolean(window.__omdHarness)';

/** Poll until the renderer has installed `window.__omdHarness`. */
async function waitForHarness(win: BrowserWindow, timeoutMs = 15000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const ready = (await win.webContents.executeJavaScript(readyScript)) as boolean;
    if (ready) {
      await win.webContents.executeJavaScript('window.__omdHarness.ready()');
      return;
    }
    if (Date.now() > deadline) {
      throw new Error('Timed out waiting for the renderer harness to boot.');
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

/**
 * Capture the current page. Grabs two frames a beat apart and keeps the second,
 * because compositor timing can return a stale/blank first frame for glassy
 * (backdrop-filter) panels right after a view change.
 */
async function captureStable(win: BrowserWindow): Promise<Buffer> {
  await win.webContents.capturePage();
  await new Promise((resolve) => setTimeout(resolve, 120));
  const image = await win.webContents.capturePage();
  return image.toPNG();
}

/**
 * Run the capture loop and return the paths written. The caller is responsible
 * for quitting the app afterward.
 */
export async function runScreenshotHarness(
  win: BrowserWindow,
  options: ScreenshotHarnessOptions,
): Promise<string[]> {
  const settleMs = options.settleMs ?? 900;
  await mkdir(options.outDir, { recursive: true });
  await waitForHarness(win);

  // Populate the transport so the Now Playing dock and Home hub look "live".
  if (options.dataMode === 'fixtures') {
    try {
      await win.webContents.executeJavaScript('window.__omdHarness.loadFixtureDisc()');
    } catch {
      // Best-effort; a bare dock is still a valid screenshot.
    }
  }

  const saved: string[] = [];
  for (const view of options.views) {
    await win.webContents.executeJavaScript(
      `window.__omdHarness.goto(${JSON.stringify(view)}, ${settleMs})`,
    );
    const png = await captureStable(win);
    const file = path.join(options.outDir, `${view}.png`);
    await writeFile(file, png);
    saved.push(file);
    console.log(`[omd-studio] captured ${view} -> ${file}`);
  }
  return saved;
}
