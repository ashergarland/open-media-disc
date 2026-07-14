/**
 * The Create Disc wizard.
 *
 * A five-step flow (Select -> Package -> Label -> Burn -> Done) over the main
 * process IPC. It owns its own state and re-renders into a host element; the
 * shell resets it whenever the Create Disc view is (re-)opened. Burning is
 * destructive and only ever runs on an explicit, confirmed click.
 */

import type { StudioBurnResult, StudioDrive, StudioPackageSummary } from '../shared/types';
import { clearChildren, el, svgIcon } from './dom';

interface WizardOptions {
  onOpenPlayer: (source: string) => void;
}

const STEPS = ['Select', 'Package', 'Label', 'Burn', 'Done'] as const;

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
  host.append(
    el('div', { class: 'view-head' }, [
      el('h1', { class: 'view-title', text: 'Create Disc' }),
      el('p', {
        class: 'view-lead',
        text: 'Turn a FLAC album folder into a verified, burned 8cm mini DVD-RW.',
      }),
    ]),
    stepper(),
    stepContent(),
  );
  if (state.error) host.append(el('p', { class: 'wizard-error', text: state.error }));
}

function stepper(): HTMLElement {
  const row = el('div', { class: 'stepper' });
  STEPS.forEach((label, index) => {
    const status = index === state.step ? 'is-active' : index < state.step ? 'is-done' : '';
    row.append(
      el('div', { class: `step ${status}` }, [
        el('span', { class: 'step-dot', text: String(index + 1) }),
        el('span', { class: 'step-label', text: label }),
      ]),
    );
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
  return el('div', {}, [
    card('Select an album', [
      el('p', { class: 'muted', text: 'Choose a folder of FLAC files, with optional cover art.' }),
      el('div', { class: 'wizard-actions' }, [
        primaryButton('Select folder...', async () => {
          const dir = await window.omd.selectAlbumFolder();
          if (!dir) return;
          state.sourceDir = dir;
          state.step = 1;
          state.error = undefined;
          render();
          await runPackage(false);
        }),
      ]),
      ...(state.sourceDir ? [el('p', { class: 'muted small', text: state.sourceDir })] : []),
    ]),
  ]);
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
    return card('Packaging', [spinner('Packaging and validating...')]);
  }
  const pkg = state.pkg;
  const cover = pkg.coverDataUri
    ? el('img', { class: 'cover', src: pkg.coverDataUri, alt: 'Cover art' })
    : el('div', { class: 'cover cover-empty' }, [svgIcon('create', 40)]);

  const meta = el('div', { class: 'pkg-meta' }, [
    el('div', { class: 'pkg-title', text: pkg.discId }),
    el('div', { class: 'muted', text: `${pkg.artist} - ${pkg.album}` }),
    el('div', {
      class: 'muted small',
      text: `${pkg.trackCount} tracks - ${formatBytes(pkg.totalSizeBytes)}`,
    }),
    el('span', {
      class: `pill ${pkg.valid ? 'pill-ok' : 'pill-bad'}`,
      text: pkg.valid ? 'VALID' : 'INVALID',
    }),
  ]);

  const tracks = el(
    'ol',
    { class: 'tracks' },
    pkg.tracks.map((track) =>
      el('li', {}, [
        el('span', { class: 'track-title', text: track.title }),
        el('span', {
          class: 'muted small',
          text: track.durationSeconds !== undefined ? formatDuration(track.durationSeconds) : '',
        }),
      ]),
    ),
  );

  const issues = [...pkg.errors, ...pkg.warnings];
  const issuesCard = issues.length
    ? card(
        'Issues',
        issues.map((issue) =>
          el('div', { class: `issue issue-${issue.severity}`, text: `[${issue.code}] ${issue.message}` }),
        ),
      )
    : undefined;

  return el('div', {}, [
    card('Package', [el('div', { class: 'pkg' }, [cover, meta]), tracks]),
    ...(issuesCard ? [issuesCard] : []),
    el('div', { class: 'wizard-actions' }, [
      secondaryButton('Back', () => setState({ step: 0 })),
      primaryButton(
        'Continue',
        () => {
          setState({ step: 2 });
          void runLabel();
        },
        { disabled: !pkg.valid },
      ),
    ]),
  ]);
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
      el('img', {
        class: 'label-preview',
        src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(state.labelSvg)}`,
        alt: 'Label sheet preview',
      }),
    );
  }

  const actions: HTMLElement[] = [secondaryButton('Back', () => setState({ step: 1 }))];
  if (state.labelSvg) {
    actions.push(
      secondaryButton('Save label sheet...', async () => {
        const saved = await window.omd.saveLabel(state.pkg!.outDir);
        if (saved) setState({ notice: `Saved to ${saved}` });
      }),
    );
  }
  actions.push(primaryButton('Continue', () => setState({ step: 3 })));

  return el('div', {}, [
    card('Label', body),
    ...(state.notice ? [el('p', { class: 'muted small', text: state.notice })] : []),
    el('div', { class: 'wizard-actions' }, actions),
  ]);
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
  if (state.burnResult && !state.burnResult.ok) return burnFailedCard();
  if (state.burning) {
    return card('Burning', [
      spinner(state.burnLog[state.burnLog.length - 1] ?? 'Working...'),
      el(
        'ul',
        { class: 'burn-log' },
        state.burnLog.map((line) => el('li', { text: line })),
      ),
    ]);
  }

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
  return el('div', {}, [
    card('Burn to Disc', [
      el('label', { class: 'field' }, [
        el('span', { class: 'muted small', text: 'Drive' }),
        driveSelect,
      ]),
      el('div', { class: 'burn-opts' }, [
        toggle('Blank a rewritable disc first', state.blank, (v) => (state.blank = v)),
        toggle('Verify after writing', state.verify, (v) => (state.verify = v)),
        toggle('Eject when done', state.eject, (v) => (state.eject = v)),
      ]),
      el('p', {
        class: 'muted small',
        text: 'Burning erases a rewritable disc, writes this package, then verifies it. Windows (IMAPI2) only.',
      }),
    ]),
    el('div', { class: 'wizard-actions' }, [
      secondaryButton('Back', () => setState({ step: 2 })),
      primaryButton('Burn to Disc', () => void runBurn(), { disabled: !canBurn, danger: true }),
    ]),
  ]);
}

function burnFailedCard(): HTMLElement {
  const result = state.burnResult;
  return el('div', {}, [
    card('Burn failed', [
      el('span', { class: 'pill pill-bad', text: 'FAILED' }),
      el('p', {
        class: 'muted',
        text: result?.error ?? 'Verification did not pass. The disc was left in the drive.',
      }),
    ]),
    el('div', { class: 'wizard-actions' }, [
      secondaryButton('Back', () => setState({ step: 2, burnResult: undefined, burnLog: [] })),
      primaryButton('Try again', () => setState({ burnResult: undefined, burnLog: [] })),
    ]),
  ]);
}

/* Step 5: Done */
function doneStep(): HTMLElement {
  const result = state.burnResult;
  const detail = result
    ? `${result.verified ? 'Burned and verified.' : 'Burned.'}${result.ejected ? ' Ejected.' : ''}`
    : 'Package ready.';
  return el('div', {}, [
    card('Done', [
      el('div', { class: 'done-hero' }, [
        el('span', { class: 'done-check' }, [svgIcon('check', 34)]),
        el('div', {}, [
          el('div', { class: 'pkg-title', text: state.pkg?.discId ?? 'Disc created' }),
          el('div', { class: 'muted', text: detail }),
        ]),
      ]),
    ]),
    el('div', { class: 'wizard-actions' }, [
      secondaryButton('Create another', () => {
        state = initialState();
        render();
        void loadDrives();
      }),
      primaryButton('Open in Player', () => options.onOpenPlayer(state.pkg?.outDir ?? '')),
    ]),
  ]);
}

/* Shared bits */
function card(title: string, children: (Node | string)[]): HTMLElement {
  return el('section', { class: 'card' }, [el('h2', { class: 'card-title', text: title }), ...children]);
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
