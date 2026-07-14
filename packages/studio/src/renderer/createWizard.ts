/**
 * The Create Disc wizard.
 *
 * A five-step flow (Select Album -> Package -> Label -> Burn -> Done) over the
 * main process IPC. It owns its own state and re-renders into a host element;
 * the shell resets it whenever the Create Disc view is (re-)opened. Burning is
 * destructive and only ever runs on an explicit, confirmed click.
 */

import type { StudioBurnResult, StudioDrive, StudioPackageSummary } from '../shared/types';
import { clearChildren, el, svgIcon, type IconName } from './dom';

interface WizardOptions {
  onOpenPlayer: (source: string) => void;
}

const STEPS = ['Select Album', 'Package', 'Label', 'Burn', 'Done'] as const;

interface WizardState {
  step: number;
  busy: boolean;
  error?: string;
  notice?: string;
  sourceDir?: string;
  pkg?: StudioPackageSummary;
  labelSvg?: string;
  labelUnavailable: boolean;
  drives: StudioDrive[];
  selectedDrive?: string;
  blank: boolean;
  verify: boolean;
  eject: boolean;
  burning: boolean;
  burnLog: string[];
  burnResult?: StudioBurnResult;
}

let state: WizardState;
let host: HTMLElement;
let options: WizardOptions;

function initialState(): WizardState {
  return {
    step: 0,
    busy: false,
    labelUnavailable: false,
    drives: [],
    blank: true,
    verify: true,
    eject: true,
    burning: false,
    burnLog: [],
  };
}

/** Build (and reset) the Create Disc wizard. */
export function renderCreateWizard(opts: WizardOptions): HTMLElement {
  options = opts;
  state = initialState();
  host = el('div', { class: 'view wizard' });
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
  if (state.step === 3) render();
}

function setState(patch: Partial<WizardState>): void {
  Object.assign(state, patch);
  render();
}

function render(): void {
  clearChildren(host);
  host.append(stepper(), stepContent());
  if (state.error) host.append(el('p', { class: 'wizard-error', text: state.error }));
}

function stepper(): HTMLElement {
  const row = el('div', { class: 'stepper' });
  STEPS.forEach((label, index) => {
    const status = index === state.step ? 'is-active' : index < state.step ? 'is-done' : 'is-future';
    const dot = el('span', { class: 'step-dot' }, [el('span', { class: 'step-num', text: String(index + 1) })]);
    if (index < state.step) dot.append(el('span', { class: 'step-check' }, [svgIcon('check', 12)]));
    row.append(el('div', { class: `step ${status}` }, [dot, el('span', { class: 'step-label', text: label })]));
  });
  return row;
}

function stepContent(): HTMLElement {
  switch (state.step) {
    case 0:
      return selectStep();
    case 1:
      return packageStep();
    case 2:
      return labelStep();
    case 3:
      return burnStep();
    default:
      return doneStep();
  }
}

/* Step 1: Select */
function selectStep(): HTMLElement {
  return stepPanel({
    title: 'Select an album',
    lead: 'Turn a FLAC album folder into a verified, burned 8cm mini DVD-RW.',
    body: [
      el('div', { class: 'select-hero' }, [
        el('span', { class: 'select-icon' }, [svgIcon('create', 46)]),
        el('p', {
          class: 'muted',
          text: 'Choose a folder of FLAC files, with optional cover art. It will be packaged and validated into an OMD build.',
        }),
        primaryButton('Select folder...', async () => {
          const dir = await window.omd.selectAlbumFolder();
          if (!dir) return;
          state.sourceDir = dir;
          state.step = 1;
          state.error = undefined;
          render();
          await runPackage(false);
        }),
        ...(state.sourceDir ? [el('p', { class: 'muted small', text: state.sourceDir })] : []),
      ]),
    ],
  });
}

/* Step 2: Package */
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
      setState({ step: 0 });
      return;
    }
    setState({ pkg: response, busy: false, labelSvg: undefined, labelUnavailable: false });
  } catch (err) {
    setState({ busy: false, step: 0, error: `Packaging failed: ${(err as Error).message}` });
  }
}

function packageStep(): HTMLElement {
  if (state.busy || !state.pkg) {
    return stepPanel({
      title: 'Packaging',
      lead: 'Packaging and validating your album.',
      body: [spinner('Packaging and validating...')],
      back: { onClick: () => setState({ step: 0 }) },
    });
  }
  const pkg = state.pkg;
  const issues = [...pkg.errors, ...pkg.warnings];
  const issuesBlock = issues.length
    ? el(
        'div',
        { class: 'wizard-issues' },
        issues.map((issue) =>
          el('div', { class: `issue issue-${issue.severity}`, text: `[${issue.code}] ${issue.message}` }),
        ),
      )
    : undefined;

  return stepPanel({
    title: 'Review package',
    lead: `${pkg.artist} - ${pkg.album}`,
    body: [cols([albumSummary(pkg)], [trackTable(pkg)]), ...(issuesBlock ? [issuesBlock] : [])],
    back: { onClick: () => setState({ step: 0 }) },
    next: {
      label: 'Continue',
      disabled: !pkg.valid,
      onClick: () => {
        setState({ step: 2 });
        void runLabel();
      },
    },
  });
}

/* Step 3: Label */
async function runLabel(): Promise<void> {
  if (!state.pkg) return;
  setState({ busy: true, labelSvg: undefined, labelUnavailable: false, notice: undefined });
  try {
    const label = await window.omd.buildLabel(state.pkg.outDir);
    setState({ labelSvg: label.svg, busy: false });
  } catch {
    setState({ labelUnavailable: true, busy: false });
  }
}

function labelStep(): HTMLElement {
  const body: (Node | string)[] = [];
  if (state.busy) {
    body.push(spinner('Rendering label...'));
  } else if (state.labelUnavailable) {
    body.push(
      el('p', {
        class: 'muted',
        text: 'No cover art in this album, so a label sheet is not available. You can skip this step.',
      }),
    );
  } else if (state.labelSvg) {
    body.push(
      el('div', { class: 'label-stage' }, [
        el('img', {
          class: 'label-preview',
          src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(state.labelSvg)}`,
          alt: 'Label sheet preview',
        }),
      ]),
    );
  }
  if (state.labelSvg) {
    body.push(
      el('div', { class: 'label-actions' }, [
        secondaryButton('Save label sheet...', async () => {
          const saved = await window.omd.saveLabel(state.pkg!.outDir);
          if (saved) setState({ notice: `Saved to ${saved}` });
        }),
        ...(state.notice ? [el('span', { class: 'muted small', text: state.notice })] : []),
      ]),
    );
  }

  return stepPanel({
    title: 'Label sheet',
    lead: 'Print-ready artwork for your disc and case.',
    body,
    back: { onClick: () => setState({ step: 1 }) },
    next: { label: 'Continue', onClick: () => setState({ step: 3 }) },
  });
}

/* Step 4: Burn */
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
    setState({ burning: false, burnResult: result, step: result.ok ? 4 : 3 });
  } catch (err) {
    setState({ burning: false, error: `Burn failed: ${(err as Error).message}` });
  }
}

function burnStep(): HTMLElement {
  const left: (Node | string)[] = state.pkg ? [albumSummary(state.pkg), trackTable(state.pkg, 4)] : [];

  if (state.burnResult && !state.burnResult.ok) {
    const failed = [
      el('div', { class: 'burn-console' }, [
        el('div', { class: 'console-title', text: 'Burn console' }),
        el('span', { class: 'pill pill-bad', text: 'FAILED' }),
        el('p', {
          class: 'muted',
          text: state.burnResult.error ?? 'Verification did not pass. The disc was left in the drive.',
        }),
      ]),
    ];
    return stepPanel({
      title: 'Burn failed',
      lead: 'The disc was left in the drive.',
      body: [cols(left, failed)],
      back: { onClick: () => setState({ step: 2, burnResult: undefined, burnLog: [] }) },
      next: { label: 'Try again', onClick: () => setState({ burnResult: undefined, burnLog: [] }) },
    });
  }

  return stepPanel({
    title: 'Burn to Disc',
    lead: 'Writing your album to 8cm mini DVD-RW.',
    body: [cols(left, [state.burning ? burnConsoleActive() : burnConsoleIdle()])],
    back: state.burning ? undefined : { onClick: () => setState({ step: 2 }) },
    next: { label: 'Next', onClick: () => undefined, disabled: true },
  });
}

function burnConsoleIdle(): HTMLElement {
  const driveSelect = el('select', {
    class: 'drive-select',
    onchange: (event: Event) => {
      state.selectedDrive = (event.target as HTMLSelectElement).value;
    },
  }) as HTMLSelectElement;
  if (state.drives.length === 0) {
    driveSelect.append(el('option', { value: '', text: 'No optical drive detected' }));
  }
  for (const drive of state.drives) {
    driveSelect.append(
      el('option', {
        value: drive.mountPath,
        text: drive.description ? `${drive.mountPath} - ${drive.description}` : drive.mountPath,
      }),
    );
  }
  if (state.selectedDrive) driveSelect.value = state.selectedDrive;

  const canBurn = state.drives.length > 0 && Boolean(state.selectedDrive);
  return el('div', { class: 'burn-console' }, [
    el('div', { class: 'console-title', text: 'Burn console' }),
    el('div', { class: 'console-drive' }, [
      el('span', { class: 'console-drive-icon' }, [svgIcon('drive', 24)]),
      el('div', { class: 'console-drive-info' }, [
        el('div', { class: 'console-label', text: 'DRIVE' }),
        driveSelect,
        el('div', { class: 'muted small', text: '8cm mini DVD-RW' }),
      ]),
    ]),
    el('div', { class: 'console-opts' }, [
      toggle('Blank a rewritable disc first', state.blank, (v) => (state.blank = v)),
      toggle('Verify after writing', state.verify, (v) => (state.verify = v)),
      toggle('Eject when done', state.eject, (v) => (state.eject = v)),
    ]),
    el('p', {
      class: 'muted small console-note',
      text: 'Burning erases a rewritable disc, writes this package, then verifies it. Windows (IMAPI2) only.',
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
    el('div', { class: 'console-drive console-drive-static' }, [
      el('span', { class: 'console-drive-icon' }, [svgIcon('drive', 24)]),
      el('div', { class: 'console-drive-info' }, [
        el('div', { class: 'console-label', text: 'DRIVE' }),
        el('div', { class: 'console-drive-name', text: state.selectedDrive ?? '' }),
        el('div', { class: 'muted small', text: '8cm mini DVD-RW' }),
      ]),
    ]),
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

/* Step 5: Done */
function doneStep(): HTMLElement {
  const result = state.burnResult;
  const detail = result
    ? `${result.verified ? 'Burned and verified.' : 'Burned.'}${result.ejected ? ' Ejected.' : ''}`
    : 'Package ready.';
  return stepPanel({
    title: 'All done',
    lead: 'Your OMD disc is ready to play.',
    body: [
      el('div', { class: 'done-hero' }, [
        el('span', { class: 'done-check' }, [svgIcon('check', 40)]),
        el('div', { class: 'done-info' }, [
          el('div', { class: 'pkg-title', text: state.pkg?.discId ?? 'Disc created' }),
          el('div', { class: 'muted', text: detail }),
        ]),
      ]),
    ],
    back: {
      label: 'Create another',
      onClick: () => {
        state = initialState();
        render();
        void loadDrives();
      },
    },
    next: { label: 'Open in Player', onClick: () => options.onOpenPlayer(state.pkg?.outDir ?? '') },
  });
}

/* Shared bits */
interface GuideNext {
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  danger?: boolean;
}

interface GuideBack {
  label?: string;
  onClick: () => void | Promise<void>;
}

/** A step's glass content panel: header, body, and Back/Next guide buttons. */
function stepPanel(opts: {
  title: string;
  lead: string;
  body: (Node | string)[];
  back?: GuideBack;
  next?: GuideNext;
}): HTMLElement {
  const children: (Node | string)[] = [
    el('div', { class: 'wizard-head' }, [
      el('div', { class: 'wizard-step-count', text: `Step ${state.step + 1} of ${STEPS.length}` }),
      el('h1', { class: 'wizard-title', text: opts.title }),
      el('p', { class: 'wizard-lead', text: opts.lead }),
    ]),
    el('div', { class: 'wizard-body' }, opts.body),
  ];
  if (opts.back || opts.next) {
    children.push(
      el('div', { class: 'wizard-guide' }, [
        opts.back
          ? guideButton(opts.back.label ?? 'Back', 'back', opts.back.onClick)
          : el('span', { class: 'guide-spacer' }),
        opts.next
          ? guideButton(opts.next.label, 'next', opts.next.onClick, {
              disabled: opts.next.disabled,
              danger: opts.next.danger,
              primary: true,
            })
          : el('span', { class: 'guide-spacer' }),
      ]),
    );
  }
  return el('section', { class: 'wizard-panel' }, children);
}

function guideButton(
  label: string,
  dir: 'back' | 'next',
  onClick: () => void | Promise<void>,
  opts: { disabled?: boolean; danger?: boolean; primary?: boolean } = {},
): HTMLElement {
  const cls = `btn guide-btn guide-${dir}${opts.primary ? ' btn-primary' : ''}${opts.danger ? ' btn-danger' : ''}`;
  const text = el('span', { class: 'guide-label', text: label });
  const children =
    dir === 'back' ? [svgIcon('chevron-left', 18), text] : [text, svgIcon('chevron-right', 18)];
  return el(
    'button',
    { class: cls, disabled: opts.disabled ? true : null, onclick: () => void onClick() },
    children,
  );
}

function cols(left: (Node | string)[], right: (Node | string)[]): HTMLElement {
  return el('div', { class: 'wizard-cols' }, [
    el('div', { class: 'wizard-col' }, left),
    el('div', { class: 'wizard-col' }, right),
  ]);
}

/** Cover art + album facts, shared by the Package and Burn steps. */
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

function trackTable(pkg: StudioPackageSummary, max?: number): HTMLElement {
  const rows: HTMLElement[] = [
    el('div', { class: 'track-row track-row-head' }, [
      el('span', { class: 'track-num', text: '#' }),
      el('span', { class: 'track-name', text: 'TRACK TITLE' }),
      el('span', { class: 'track-dur', text: 'DURATION' }),
    ]),
  ];
  const shown = max ? pkg.tracks.slice(0, max) : pkg.tracks;
  shown.forEach((track, index) => {
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
  if (max && pkg.tracks.length > max) {
    const remaining = pkg.tracks.length - max;
    rows.push(
      el('div', { class: 'track-row track-row-more' }, [
        el('span', { class: 'track-num', text: '' }),
        el('span', { class: 'track-name', text: `+ ${remaining} more track${remaining === 1 ? '' : 's'}` }),
        el('span', { class: 'track-dur', text: '' }),
      ]),
    );
  }
  return el('div', { class: 'track-table' }, rows);
}

function primaryButton(
  label: string,
  onClick: () => void | Promise<void>,
  opts: { disabled?: boolean; danger?: boolean } = {},
): HTMLElement {
  return el(
    'button',
    {
      class: `btn btn-primary${opts.danger ? ' btn-danger' : ''}`,
      disabled: opts.disabled ? true : null,
      onclick: () => void onClick(),
    },
    [label],
  );
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
