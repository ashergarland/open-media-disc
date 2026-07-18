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
  if (state.error) {
    host.append(
      el('div', { class: 'issue-list' }, [issueEl('error', 'Something went wrong', state.error)]),
    );
  }
}

function panel(): HTMLElement {
  if (state.busy && !state.pkg) {
    return el('section', { class: 'card' }, [spinner('Packaging and validating...')]);
  }
  if (!state.pkg) {
    return el('section', { class: 'card' }, [
      el('div', { class: 'select-hero' }, [
        el('span', { class: 'select-icon' }, [svgIcon('create', 54)]),
        el('p', {
          class: 'select-lead',
          text: 'Choose a folder of FLAC files, with optional cover art. It will be packaged and validated, then you can burn it to disc.',
        }),
        primaryButton('Select album folder...', pickAlbum, 'create'),
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
        { class: 'issue-list' },
        issues.map((issue) =>
          issueEl(issue.severity === 'error' ? 'error' : 'warning', issue.code, issue.message),
        ),
      ),
    );
  }

  return el('section', { class: 'card' }, [
    el('div', { class: 'burn-source' }, [
      el('span', { class: 'burn-source-path', text: state.sourceDir ?? '' }),
      secondaryButton('Change album...', pickAlbum),
    ]),
    el('div', { class: 'grid cols-2' }, [
      el('div', { class: 'stack' }, left),
      el('div', { class: 'stack' }, [burnConsole()]),
    ]),
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

function bcDrive(detail: Node | string): HTMLElement {
  return el('div', { class: 'bc-drive' }, [
    svgIcon('drive', 22),
    detail,
    el('span', { class: 'bc-media', text: 'DVD-RW · 1.4 GB' }),
  ]);
}

function burnConsoleIdle(): HTMLElement {
  const valid = Boolean(state.pkg?.valid);
  const canBurn = state.drives.length > 0 && Boolean(state.selectedDrive) && valid;
  return el('div', { class: 'burn-console' }, [
    el('div', { class: 'bc-head' }, [
      el('span', { class: 'bc-title', text: 'Burn Console' }),
      statusPill(valid ? 'ok' : 'bad', valid ? 'READY' : 'INVALID'),
    ]),
    bcDrive(driveSelectEl()),
    el('div', { class: 'bc-options' }, [
      toggle('Blank a rewritable disc first', state.blank, (v) => (state.blank = v)),
      toggle('Verify after writing', state.verify, (v) => (state.verify = v)),
      toggle('Eject when done', state.eject, (v) => (state.eject = v)),
    ]),
    el('div', {
      class: 'bc-status',
      text: valid
        ? 'Burning erases a rewritable disc, writes this package, then verifies it. Windows (IMAPI2) only.'
        : 'Fix the validation issues before burning.',
    }),
    primaryButton('Burn to Disc', () => void runBurn(), 'create', !canBurn),
  ]);
}

function burnConsoleActive(): HTMLElement {
  const status = state.burnLog[state.burnLog.length - 1] ?? 'Working...';
  return el('div', { class: 'burn-console' }, [
    el('div', { class: 'bc-head' }, [
      el('span', { class: 'bc-title', text: 'Burn Console' }),
      statusPill('neutral', 'WRITING'),
    ]),
    bcDrive(el('span', { class: 'bc-drive-name', text: state.selectedDrive ?? '' })),
    el('div', { class: 'bc-status', text: status }),
    el('div', { class: 'bc-progress', role: 'progressbar', 'aria-label': 'Burn progress' }, [
      el('span', { class: 'bc-progress-fill' }),
    ]),
    el('pre', { class: 'bc-log', text: state.burnLog.join('\n') }),
  ]);
}

function burnConsoleDone(): HTMLElement {
  const result = state.burnResult!;
  const sub = `${result.verified ? 'Verified.' : 'Written.'}${result.ejected ? ' Disc ejected.' : ''}`;
  return el('div', { class: 'burn-console' }, [
    el('div', { class: 'bc-head' }, [el('span', { class: 'bc-title', text: 'Burn Console' })]),
    el('div', { class: 'bc-results' }, [
      el('div', { class: 'bc-result done' }, [
        rawSvg(
          '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M8 12.4l2.6 2.6L16 9.5" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        ),
        el('span', { class: 'bc-result-text' }, [
          el('span', { class: 'bc-result-title', text: state.pkg?.discId ?? 'Disc created' }),
          el('span', { class: 'bc-result-sub', text: sub }),
        ]),
      ]),
    ]),
    el('div', { class: 'bc-actions' }, [
      primaryButton('Open in Player', () => options.onOpenPlayer(state.pkg?.outDir ?? '')),
      secondaryButton('Burn another copy', () => setState({ burnResult: undefined, burnLog: [] })),
    ]),
  ]);
}

function burnConsoleFailed(): HTMLElement {
  return el('div', { class: 'burn-console' }, [
    el('div', { class: 'bc-head' }, [
      el('span', { class: 'bc-title', text: 'Burn Console' }),
      statusPill('bad', 'FAILED'),
    ]),
    el('div', { class: 'bc-results' }, [
      el('div', { class: 'bc-result failed' }, [
        rawSvg(
          '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M9 9l6 6M15 9l-6 6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>',
        ),
        el('span', { class: 'bc-result-text' }, [
          el('span', { class: 'bc-result-title', text: 'Burn failed' }),
          el('span', {
            class: 'bc-result-sub',
            text:
              state.burnResult?.error ??
              'Verification did not pass. The disc was left in the drive.',
          }),
        ]),
      ]),
    ]),
    el('div', { class: 'bc-actions' }, [
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
function statusPill(kind: 'ok' | 'bad' | 'neutral', label: string): HTMLElement {
  return el('span', { class: `status-pill ${kind}` }, [
    el('span', { class: 'status-dot', 'aria-hidden': 'true' }),
    label,
  ]);
}

function issueEl(kind: 'error' | 'warning', title: string, desc: string): HTMLElement {
  const icon =
    kind === 'error'
      ? '<svg class="issue-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M9 9l6 6M15 9l-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      : '<svg class="issue-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l9.5 16.5H2.5z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M12 10v4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.4" r="1.05" fill="currentColor"/></svg>';
  return el('div', { class: `issue ${kind}` }, [
    rawSvg(icon),
    el('span', { class: 'issue-text' }, [
      el('span', { class: 'issue-title', text: title }),
      el('span', { class: 'issue-desc', text: desc }),
    ]),
  ]);
}

function rawSvg(markup: string): SVGElement {
  const wrap = document.createElement('div');
  wrap.innerHTML = markup.trim();
  return wrap.firstElementChild as SVGElement;
}

function albumSummary(pkg: StudioPackageSummary): HTMLElement {
  const cover = pkg.coverDataUri
    ? el('img', { class: 'album-cover', src: pkg.coverDataUri, alt: 'Cover art' })
    : el('div', { class: 'album-cover album-cover-empty' }, [svgIcon('note', 40)]);
  return el('div', { class: 'album-summary' }, [
    cover,
    el('div', { class: 'album-meta' }, [
      el('div', { class: 'album-title', text: pkg.album }),
      el('div', { class: 'album-artist', text: pkg.artist }),
      el('dl', { class: 'kv-list' }, [
        kvRow('Disc ID', pkg.discId),
        kvRow('Tracks', String(pkg.trackCount)),
        kvRow('Format', `FLAC · ${formatBytes(pkg.totalSizeBytes)}`),
      ]),
      statusPill(pkg.valid ? 'ok' : 'bad', pkg.valid ? 'VALID' : 'INVALID'),
    ]),
  ]);
}

function kvRow(label: string, value: string): HTMLElement {
  return el('div', { class: 'kv-row' }, [el('dt', { text: label }), el('dd', { text: value })]);
}

function trackTable(pkg: StudioPackageSummary): HTMLElement {
  const rows: HTMLElement[] = [
    el('div', { class: 'tt-head' }, [
      el('span', { class: 'tt-num', text: '#' }),
      el('span', { class: 'tt-title', text: 'Track Title' }),
      el('span', { class: 'tt-dur', text: 'Duration' }),
    ]),
  ];
  pkg.tracks.forEach((track, index) => {
    rows.push(
      el('div', { class: 'tt-row' }, [
        el('span', { class: 'tt-num', text: String(index + 1) }),
        el('span', { class: 'tt-title', text: track.title }),
        el('span', {
          class: 'tt-dur',
          text: track.durationSeconds !== undefined ? formatDuration(track.durationSeconds) : '',
        }),
      ]),
    );
  });
  return el('div', { class: 'track-table' }, rows);
}

function primaryButton(
  label: string,
  onClick: () => void | Promise<void>,
  icon?: IconName,
  disabled = false,
): HTMLElement {
  const kids: (Node | string)[] = [el('span', { class: 'liquid-rim', 'aria-hidden': 'true' })];
  if (icon) {
    const glyph = svgIcon(icon, 22);
    glyph.setAttribute('class', 'btn__icon');
    kids.push(glyph);
  }
  kids.push(el('span', { class: 'btn__label', text: label }));
  return el(
    'button',
    {
      class: 'btn btn--primary',
      type: 'button',
      disabled: disabled ? true : null,
      onclick: () => void onClick(),
    },
    kids,
  );
}

function secondaryButton(label: string, onClick: () => void | Promise<void>): HTMLElement {
  return el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => void onClick() }, [
    el('span', { class: 'liquid-rim', 'aria-hidden': 'true' }),
    el('span', { class: 'button-surface', 'aria-hidden': 'true' }),
    el('span', { class: 'btn__label', text: label }),
  ]);
}

function toggle(label: string, checked: boolean, onChange: (value: boolean) => void): HTMLElement {
  const input = el('input', {
    type: 'checkbox',
    role: 'switch',
    checked: checked ? true : null,
  }) as HTMLInputElement;
  input.addEventListener('change', () => onChange(input.checked));
  return el('label', { class: 'toggle bc-toggle' }, [
    input,
    el('span', { class: 'toggle-track' }, [
      el('span', { class: 'toggle-knob' }, [el('span', { class: 'status-led' })]),
    ]),
    el('span', { class: 'bc-toggle-label', text: label }),
  ]);
}

function spinner(text: string): HTMLElement {
  return el('div', { class: 'spinner-row' }, [
    el('span', { class: 'spinner', 'aria-hidden': 'true' }),
    el('span', { class: 'spinner-text', text }),
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
