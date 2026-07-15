/**
 * The Burn view.
 *
 * A single adaptive panel: pick a FLAC album folder, review the packaged album,
 * then burn it to an 8cm mini DVD-RW. Packaging and validation happen inline;
 * burning is destructive and only ever runs on an explicit, confirmed click.
 */

import type { StudioBurnResult, StudioDrive, StudioPackageSummary } from '../shared/types';
import { clearChildren, el, svgIcon, type IconName } from './dom';

interface BurnViewOptions {
  onOpenPlayer: (source: string) => void;
}

interface BurnState {
  busy: boolean;
  error?: string;
  sourceDir?: string;
  pkg?: StudioPackageSummary;
  drives: StudioDrive[];
  selectedDrive?: string;
  blank: boolean;
  verify: boolean;
  eject: boolean;
  burning: boolean;
  burnLog: string[];
  burnResult?: StudioBurnResult;
}

let state: BurnState;
let host: HTMLElement;
let options: BurnViewOptions;

function initialState(): BurnState {
  return {
    busy: false,
    drives: [],
    blank: true,
    verify: true,
    eject: true,
    burning: false,
    burnLog: [],
  };
}

/** Build (and reset) the Burn view. */
export function renderBurnView(opts: BurnViewOptions): HTMLElement {
  options = opts;
  state = initialState();
  host = el('div', { class: 'view burn-view' });
  render();
  void loadDrives();
  return host;
}

async function loadDrives(): Promise<void> {
  try {
    state.drives = await window.omd.listDrives();
  } catch {
    state.drives = [];
  }
  const first = state.drives[0];
  if (first && !state.selectedDrive) state.selectedDrive = first.mountPath;
  if (state.pkg) render();
}

function setState(patch: Partial<BurnState>): void {
  Object.assign(state, patch);
  render();
}

function render(): void {
  clearChildren(host);
  host.append(
    el('div', { class: 'view-head' }, [
      el('h1', { class: 'view-title', text: 'Burn a Disc' }),
      el('p', {
        class: 'view-lead',
        text: 'Load a FLAC album folder, then burn it to a verified 8cm mini DVD-RW.',
      }),
    ]),
    panel(),
  );
  if (state.error) host.append(el('p', { class: 'wizard-error', text: state.error }));
}

function panel(): HTMLElement {
  if (state.busy && !state.pkg) {
    return el('section', { class: 'wizard-panel' }, [spinner('Packaging and validating...')]);
  }
  if (!state.pkg) {
    return el('section', { class: 'wizard-panel' }, [
      el('div', { class: 'select-hero' }, [
        el('span', { class: 'select-icon' }, [svgIcon('create', 46)]),
        el('p', {
          class: 'muted',
          text: 'Choose a folder of FLAC files, with optional cover art. It will be packaged and validated, then you can burn it to disc.',
        }),
        primaryButton('Select album folder...', pickAlbum),
      ]),
    ]);
  }

  const pkg = state.pkg;
  const issues = [...pkg.errors, ...pkg.warnings];
  const left: (Node | string)[] = [albumSummary(pkg), trackTable(pkg)];
  if (issues.length) {
    left.push(
      el(
        'div',
        { class: 'wizard-issues' },
        issues.map((issue) =>
          el('div', { class: `issue issue-${issue.severity}`, text: `[${issue.code}] ${issue.message}` }),
        ),
      ),
    );
  }

  return el('section', { class: 'wizard-panel' }, [
    el('div', { class: 'burn-source' }, [
      el('span', { class: 'burn-source-path muted small', text: state.sourceDir ?? '' }),
      secondaryButton('Change album...', pickAlbum),
    ]),
    cols(left, [burnConsole()]),
  ]);
}

async function pickAlbum(): Promise<void> {
  const dir = await window.omd.selectAlbumFolder();
  if (!dir) return;
  state.sourceDir = dir;
  state.error = undefined;
  state.burnResult = undefined;
  state.burnLog = [];
  await runPackage(false);
}

async function runPackage(overwrite: boolean): Promise<void> {
  if (!state.sourceDir) return;
  setState({ busy: true, error: undefined, pkg: undefined });
  try {
    const response = await window.omd.createPackage(state.sourceDir, overwrite);
    if (response.kind === 'exists') {
      state.busy = false;
      const proceed = window.confirm(`A build already exists at:\n${response.outDir}\n\nOverwrite it?`);
      if (proceed) {
        await runPackage(true);
        return;
      }
      setState({ busy: false, sourceDir: undefined });
      return;
    }
    setState({ pkg: response, busy: false });
  } catch (err) {
    setState({ busy: false, sourceDir: undefined, error: `Packaging failed: ${(err as Error).message}` });
  }
}

/* Burn console (right column) */
function burnConsole(): HTMLElement {
  if (state.burnResult && !state.burnResult.ok) return burnConsoleFailed();
  if (state.burnResult && state.burnResult.ok) return burnConsoleDone();
  if (state.burning) return burnConsoleActive();
  return burnConsoleIdle();
}

function driveSelectEl(): HTMLSelectElement {
  const select = el('select', {
    class: 'drive-select',
    onchange: (event: Event) => {
      state.selectedDrive = (event.target as HTMLSelectElement).value;
    },
  }) as HTMLSelectElement;
  if (state.drives.length === 0) {
    select.append(el('option', { value: '', text: 'No optical drive detected' }));
  }
  for (const drive of state.drives) {
    select.append(
      el('option', {
        value: drive.mountPath,
        text: drive.description ? `${drive.mountPath} - ${drive.description}` : drive.mountPath,
      }),
    );
  }
  if (state.selectedDrive) select.value = state.selectedDrive;
  return select;
}

function consoleDrive(detail: Node | string): HTMLElement {
  return el('div', { class: 'console-drive' }, [
    el('span', { class: 'console-drive-icon' }, [svgIcon('drive', 24)]),
    el('div', { class: 'console-drive-info' }, [
      el('div', { class: 'console-label', text: 'DRIVE' }),
      detail,
      el('div', { class: 'muted small', text: '8cm mini DVD-RW' }),
    ]),
  ]);
}

function burnConsoleIdle(): HTMLElement {
  const valid = Boolean(state.pkg?.valid);
  const canBurn = state.drives.length > 0 && Boolean(state.selectedDrive) && valid;
  return el('div', { class: 'burn-console' }, [
    el('div', { class: 'console-title', text: 'Burn console' }),
    consoleDrive(driveSelectEl()),
    el('div', { class: 'console-opts' }, [
      toggle('Blank a rewritable disc first', state.blank, (v) => (state.blank = v)),
      toggle('Verify after writing', state.verify, (v) => (state.verify = v)),
      toggle('Eject when done', state.eject, (v) => (state.eject = v)),
    ]),
    el('p', {
      class: 'muted small console-note',
      text: valid
        ? 'Burning erases a rewritable disc, writes this package, then verifies it. Windows (IMAPI2) only.'
        : 'Fix the validation issues before burning.',
    }),
    el(
      'button',
      { class: 'btn btn-primary btn-burn', disabled: canBurn ? null : true, onclick: () => void runBurn() },
      [svgIcon('create', 20), el('span', { text: 'Burn to Disc' })],
    ),
  ]);
}

function burnConsoleActive(): HTMLElement {
  const status = state.burnLog[state.burnLog.length - 1] ?? 'Working...';
  return el('div', { class: 'burn-console' }, [
    el('div', { class: 'console-title', text: 'Burn console' }),
    consoleDrive(el('div', { class: 'console-drive-name', text: state.selectedDrive ?? '' })),
    el('div', { class: 'console-section' }, [
      el('div', { class: 'console-label', text: 'STATUS' }),
      el('div', { class: 'console-status', text: status }),
      el('div', { class: 'muted small', text: 'Please do not eject or close the application.' }),
    ]),
    el('div', { class: 'console-section' }, [
      el('div', { class: 'console-label', text: 'PROGRESS' }),
      el('div', { class: 'progress' }, [el('div', { class: 'progress-fill' })]),
    ]),
    el(
      'ul',
      { class: 'burn-log' },
      state.burnLog.map((line) => el('li', { text: line })),
    ),
  ]);
}

function burnConsoleDone(): HTMLElement {
  const result = state.burnResult!;
  const detail = `${result.verified ? 'Burned and verified.' : 'Burned.'}${result.ejected ? ' Ejected.' : ''}`;
  return el('div', { class: 'burn-console' }, [
    el('div', { class: 'console-title', text: 'Burn console' }),
    el('div', { class: 'console-done' }, [
      el('span', { class: 'done-check' }, [svgIcon('check', 34)]),
      el('div', { class: 'done-info' }, [
        el('div', { class: 'pkg-title', text: state.pkg?.discId ?? 'Disc created' }),
        el('div', { class: 'muted', text: detail }),
      ]),
    ]),
    el('div', { class: 'console-actions' }, [
      primaryButton('Open in Player', () => options.onOpenPlayer(state.pkg?.outDir ?? '')),
      secondaryButton('Burn another copy', () => setState({ burnResult: undefined, burnLog: [] })),
    ]),
  ]);
}

function burnConsoleFailed(): HTMLElement {
  return el('div', { class: 'burn-console' }, [
    el('div', { class: 'console-title', text: 'Burn console' }),
    el('span', { class: 'pill pill-bad', text: 'FAILED' }),
    el('p', {
      class: 'muted',
      text: state.burnResult?.error ?? 'Verification did not pass. The disc was left in the drive.',
    }),
    el('div', { class: 'console-actions' }, [
      primaryButton('Try again', () => setState({ burnResult: undefined, burnLog: [] })),
    ]),
  ]);
}

async function runBurn(): Promise<void> {
  if (!state.pkg || !state.selectedDrive) return;
  const drive = state.selectedDrive;
  const confirmed = window.confirm(
    `Burn "${state.pkg.discId}" to ${drive}?\n\nA rewritable disc will be erased first.`,
  );
  if (!confirmed) return;
  setState({ burning: true, burnLog: ['Starting...'], error: undefined, burnResult: undefined });
  try {
    const result = await window.omd.burn(
      {
        packageDir: state.pkg.outDir,
        driveMountPath: drive,
        blank: state.blank,
        verify: state.verify,
        eject: state.eject,
      },
      (progress) => {
        state.burnLog.push(phaseLabel(progress.phase));
        if (state.burning) render();
      },
    );
    setState({ burning: false, burnResult: result });
  } catch (err) {
    setState({ burning: false, error: `Burn failed: ${(err as Error).message}` });
  }
}

/* Shared bits */
function cols(left: (Node | string)[], right: (Node | string)[]): HTMLElement {
  return el('div', { class: 'wizard-cols' }, [
    el('div', { class: 'wizard-col' }, left),
    el('div', { class: 'wizard-col' }, right),
  ]);
}

function albumSummary(pkg: StudioPackageSummary): HTMLElement {
  const cover = pkg.coverDataUri
    ? el('img', { class: 'album-cover', src: pkg.coverDataUri, alt: 'Cover art' })
    : el('div', { class: 'album-cover album-cover-empty' }, [svgIcon('create', 44)]);
  return el('div', { class: 'album-summary' }, [
    cover,
    el('div', { class: 'album-meta' }, [
      el('div', { class: 'album-title', text: pkg.album }),
      el('div', { class: 'album-artist', text: pkg.artist }),
      metaLine('catalog', pkg.discId),
      metaLine('note', `${pkg.trackCount} tracks`),
      metaLine('wave', `FLAC - ${formatBytes(pkg.totalSizeBytes)}`),
      el('span', {
        class: `pill ${pkg.valid ? 'pill-ok' : 'pill-bad'}`,
        text: pkg.valid ? 'VALID' : 'INVALID',
      }),
    ]),
  ]);
}

function metaLine(icon: IconName, text: string): HTMLElement {
  return el('div', { class: 'meta-line' }, [
    el('span', { class: 'meta-line-icon' }, [svgIcon(icon, 15)]),
    el('span', { class: 'meta-line-text', text }),
  ]);
}

function trackTable(pkg: StudioPackageSummary): HTMLElement {
  const rows: HTMLElement[] = [
    el('div', { class: 'track-row track-row-head' }, [
      el('span', { class: 'track-num', text: '#' }),
      el('span', { class: 'track-name', text: 'TRACK TITLE' }),
      el('span', { class: 'track-dur', text: 'DURATION' }),
    ]),
  ];
  pkg.tracks.forEach((track, index) => {
    rows.push(
      el('div', { class: 'track-row' }, [
        el('span', { class: 'track-num', text: String(index + 1) }),
        el('span', { class: 'track-name', text: track.title }),
        el('span', {
          class: 'track-dur',
          text: track.durationSeconds !== undefined ? formatDuration(track.durationSeconds) : '',
        }),
      ]),
    );
  });
  return el('div', { class: 'track-table' }, rows);
}

function primaryButton(label: string, onClick: () => void | Promise<void>): HTMLElement {
  return el('button', { class: 'btn btn-primary', onclick: () => void onClick() }, [label]);
}

function secondaryButton(label: string, onClick: () => void | Promise<void>): HTMLElement {
  return el('button', { class: 'btn', onclick: () => void onClick() }, [label]);
}

function toggle(label: string, checked: boolean, onChange: (value: boolean) => void): HTMLElement {
  const input = el('input', { type: 'checkbox', checked: checked ? true : null }) as HTMLInputElement;
  input.addEventListener('change', () => onChange(input.checked));
  return el('label', { class: 'toggle' }, [input, el('span', { class: 'toggle-label', text: label })]);
}

function spinner(text: string): HTMLElement {
  return el('div', { class: 'spinner-row' }, [
    el('span', { class: 'spinner', 'aria-hidden': 'true' }),
    el('span', { text }),
  ]);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

function formatDuration(seconds: number): string {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function phaseLabel(phase: string): string {
  switch (phase) {
    case 'building':
      return 'Building disc image...';
    case 'probing':
      return 'Probing media...';
    case 'blanking':
      return 'Blanking disc...';
    case 'writing':
      return 'Writing to disc...';
    case 'remounting':
      return 'Remounting disc...';
    case 'verifying':
      return 'Verifying...';
    case 'ejecting':
      return 'Ejecting...';
    default:
      return 'Working...';
  }
}
