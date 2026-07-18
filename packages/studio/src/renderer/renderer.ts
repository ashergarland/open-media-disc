/**
 * OMD Studio renderer: the app shell.
 *
 * Builds the fixed layout (left sidebar, main content, persistent Now Playing
 * bar), applies a theme by writing the shared UI kit's `--omd-*` CSS variables
 * onto the document, and swaps the main view per navigation. Playback and disc
 * flows are stubbed here; later increments fill in the wizard and player.
 */

import type {
  CatalogEntry,
  OmdStudioApi,
  StudioBurnResult,
  StudioDiscInfo,
  StudioDrive,
  StudioInfo,
  StudioVerifyResult,
} from '../shared/types';
import { clearChildren, el, svgIcon, type IconName } from './dom';
import { renderNowPlaying, updateNowPlaying } from './nowPlaying';
import { renderBurnView } from './burnView';
import { renderLabelsView } from './labelsView';
import * as player from './audioController';

declare global {
  interface Window {
    omd: OmdStudioApi;
  }
}

type ViewId = 'burn' | 'labels' | 'disc' | 'catalog' | 'themes' | 'settings';

interface NavItem {
  id: ViewId;
  label: string;
  icon: IconName;
}

const NAV: NavItem[] = [
  { id: 'disc', label: 'Disc', icon: 'disc' },
  { id: 'catalog', label: 'Catalog', icon: 'catalog' },
  { id: 'burn', label: 'Burn', icon: 'create' },
  { id: 'labels', label: 'Labels', icon: 'label' },
  { id: 'themes', label: 'Themes', icon: 'themes' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

interface AppState {
  view: ViewId;
  themeId: string;
  info?: StudioInfo;
  drives?: StudioDrive[];
  disc?: StudioDiscInfo;
  discSourceKind?: 'disc' | 'package';
  discLoading: boolean;
  discError?: string;
  verify?: StudioVerifyResult;
  ripStatus?: { busy: boolean; text: string; ok?: boolean; outDir?: string };
  albumBurn?: {
    drives: StudioDrive[];
    selectedDrive?: string;
    burning: boolean;
    phase?: string;
    result?: StudioBurnResult;
  };
  libraryDir?: string;
  catalog?: CatalogEntry[];
  catalogLoading: boolean;
  catalogError?: string;
  themeError?: string;
}

const THEME_STORAGE_KEY = 'omd.themeId';

interface ThemeOption {
  id: string;
  name: string;
  type: 'Light' | 'Dark';
  swatches: string[];
}

/** The four visual themes, matching the showcase theme-picker swatches. */
const THEME_OPTIONS: ThemeOption[] = [
  { id: 'frutiger-aero', name: 'Frutiger Aero', type: 'Light', swatches: ['#00d4e7', '#55c7f2', '#bee9fb', '#2b3a42', '#36d17a'] },
  { id: 'dorfic', name: 'DORFic', type: 'Light', swatches: ['#ff6a00', '#ff8c00', '#ffc400', '#1e1e1e', '#36d17a'] },
  { id: 'technozen', name: 'Technozen', type: 'Light', swatches: ['#9edb7a', '#9fe8e2', '#dff5b3', '#3c3f42', '#58af7e'] },
  { id: 'dark-aero', name: 'Dark Aero', type: 'Dark', swatches: ['#00d4e7', '#1a7bff', '#0b3d6b', '#0f141a', '#00c896'] },
];

const DEFAULT_THEME_ID = 'frutiger-aero';

/** The brand disc image path for a theme id (each theme ships assets/<id>/logo.png). */
function logoFor(id: string): string {
  const themeId = THEME_OPTIONS.some((entry) => entry.id === id) ? id : DEFAULT_THEME_ID;
  return `assets/${themeId}/logo.png`;
}

/** The persisted theme id, or the default when none is stored. */
function loadThemeId(): string {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) ?? DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

const CATALOG_STORAGE_KEY = 'omd.catalogDir';

/** The persisted catalog folder, if the user has chosen one. */
function loadCatalogDir(): string | undefined {
  try {
    return localStorage.getItem(CATALOG_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Remember the catalog folder (shared by the Disc rip action and the Catalog view). */
function setCatalogDir(dir: string): void {
  state.libraryDir = dir;
  try {
    localStorage.setItem(CATALOG_STORAGE_KEY, dir);
  } catch {
    // Persisting the catalog folder is best-effort.
  }
}

const state: AppState = {
  view: 'disc',
  themeId: loadThemeId(),
  libraryDir: loadCatalogDir(),
  discLoading: false,
  catalogLoading: false,
};

const navButtons = new Map<ViewId, HTMLElement>();
let mainEl: HTMLElement;
let nowPlayingHost: HTMLElement;
let versionLabel: HTMLElement;
let brandDisc: HTMLImageElement;
let lastPlayerKey = '';
let lastDockKey = '';

function applyThemeById(id: string): void {
  const themeId = THEME_OPTIONS.some((entry) => entry.id === id) ? id : DEFAULT_THEME_ID;
  // Every theme stylesheet stays loaded and parsed; a non-matching `media` keeps
  // the inactive ones from applying. Switching just flips `media`, which applies
  // an already-parsed sheet instantly — no fetch/parse gap, so no unstyled flash.
  document.querySelectorAll<HTMLLinkElement>('link[data-theme]').forEach((link) => {
    link.media = link.dataset.theme === themeId ? 'all' : 'not all';
  });
  document.documentElement.setAttribute('data-theme', themeId);
  state.themeId = themeId;
  if (brandDisc) brandDisc.src = logoFor(themeId);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch {
    // Persisting the theme choice is best-effort.
  }
}

function setView(view: ViewId): void {
  state.view = view;
  // Rebuild each nav item so the active-marker/selected-glare spans (which only
  // belong to the selected item) follow the current view.
  for (const item of NAV) {
    const oldButton = navButtons.get(item.id);
    const newButton = navItemEl(item, item.id === view, () => setView(item.id));
    oldButton?.replaceWith(newButton);
    navButtons.set(item.id, newButton);
  }
  renderMain();
}

function renderMain(): void {
  clearChildren(mainEl);
  mainEl.append(viewFor(state.view));
}

/** Whether the loaded disc passed verification (undefined when no disc is loaded). */
function discVerified(): boolean | undefined {
  if (!state.disc) return undefined;
  return state.verify ? state.verify.valid : state.disc.valid;
}

/** A key over the structural dock state; when unchanged, the dock updates in place. */
function dockKey(p: ReturnType<typeof player.getState>): string {
  return `${p.order[p.position] ?? -1}|${p.status}|${p.shuffle}|${p.repeat}|${discVerified() ?? ''}`;
}

const NOW_PLAYING_HANDLERS = {
  onTogglePlay: () => player.togglePlayPause(),
  onNext: () => player.next(),
  onPrevious: () => player.previous(),
  onToggleShuffle: () => player.toggleShuffle(),
  onCycleRepeat: () => player.cycleRepeat(),
  onVolume: (value: number) => player.setVolume(value),
  onSeek: (fraction: number) => player.seekFraction(fraction),
};

function renderNowPlayingBar(): void {
  const pstate = player.getState();
  lastDockKey = dockKey(pstate);
  clearChildren(nowPlayingHost);
  nowPlayingHost.append(
    renderNowPlaying(pstate, NOW_PLAYING_HANDLERS, { verified: discVerified() }),
  );
}

function onPlayerChange(): void {
  const pstate = player.getState();
  if (dockKey(pstate) !== lastDockKey) {
    renderNowPlayingBar();
  } else {
    updateNowPlaying(nowPlayingHost, pstate);
  }
  const key = `${pstate.order[pstate.position] ?? -1}|${pstate.status}`;
  if (state.view === 'disc' && key !== lastPlayerKey) {
    renderMain();
  }
}

function card(title: string, children: (Node | string)[]): HTMLElement {
  return el('section', { class: 'card' }, [
    el('p', { class: 'eyebrow', text: title }),
    ...children,
  ]);
}

/** A showcase glass button (primary gel or secondary glass). */
function btn(
  label: string,
  onClick: () => void | Promise<void>,
  options: { primary?: boolean; small?: boolean; icon?: IconName; disabled?: boolean } = {},
): HTMLElement {
  const classes = ['btn', options.primary ? 'btn--primary' : 'btn--secondary'];
  if (options.small) classes.push('btn--sm');
  const kids: (Node | string)[] = [el('span', { class: 'liquid-rim', 'aria-hidden': 'true' })];
  if (!options.primary) kids.push(el('span', { class: 'button-surface', 'aria-hidden': 'true' }));
  if (options.icon) {
    const glyph = svgIcon(options.icon, 20);
    glyph.setAttribute('class', 'btn__icon');
    kids.push(glyph);
  }
  kids.push(el('span', { class: 'btn__label', text: label }));
  return el(
    'button',
    {
      class: classes.join(' '),
      type: 'button',
      disabled: options.disabled ? true : null,
      onclick: () => void onClick(),
    },
    kids,
  );
}

/** A full-size player-control glass button (showcase .pc-button). */
function pcButton(
  icon: IconName,
  label: string,
  onClick: () => void,
  options: { primary?: boolean; active?: boolean; disabled?: boolean } = {},
): HTMLElement {
  const glyph = svgIcon(icon);
  glyph.setAttribute('class', 'pc-icon');
  const classes = ['pc-button'];
  if (options.primary) classes.push('primary');
  if (options.active) classes.push('is-active');
  return el(
    'button',
    {
      class: classes.join(' '),
      type: 'button',
      'aria-label': label,
      title: label,
      disabled: options.disabled ? true : null,
      onclick: onClick,
    },
    [
      el('span', { class: 'pc-rim', 'aria-hidden': 'true' }),
      el('span', { class: 'pc-surface', 'aria-hidden': 'true' }),
      el('span', { class: 'pc-content' }, [glyph]),
    ],
  );
}

function stepList(steps: string[]): HTMLElement {
  return el(
    'ol',
    { class: 'steps' },
    steps.map((step) => el('li', { text: step })),
  );
}

function placeholderView(title: string, lead: string, steps: string[]): HTMLElement {
  return el('div', { class: 'view' }, [
    el('div', { class: 'view-head' }, [
      el('h1', { class: 'view-title', text: title }),
      el('p', { class: 'view-lead', text: lead }),
    ]),
    card('Coming next', [
      el('p', {
        class: 'muted',
        text: 'This screen is part of the OMD Studio alpha and is being built out.',
      }),
      stepList(steps),
    ]),
  ]);
}

function rawSvg(markup: string): SVGElement {
  const wrap = document.createElement('div');
  wrap.innerHTML = markup.trim();
  return wrap.firstElementChild as SVGElement;
}

function checkGlyph(): SVGElement {
  return rawSvg(
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  );
}

function themesView(): HTMLElement {
  const cards = el('div', { class: 'theme-cards' });
  for (const theme of THEME_OPTIONS) {
    const active = theme.id === state.themeId;
    const swatches = el('span', { class: 'tc-swatches', 'aria-hidden': 'true' });
    for (const color of theme.swatches) {
      const chip = el('span');
      chip.style.setProperty('background', color);
      swatches.append(chip);
    }
    cards.append(
      el(
        'button',
        {
          class: `theme-card${active ? ' is-active' : ''}`,
          type: 'button',
          onclick: () => {
            applyThemeById(theme.id);
            renderMain();
          },
        },
        [
          swatches,
          el('span', { class: 'tc-meta' }, [
            el('span', { class: 'tc-name', text: theme.name }),
            el('span', { class: 'tc-type', text: theme.type }),
          ]),
          el('span', { class: 'tc-check' }, [checkGlyph()]),
        ],
      ),
    );
  }
  return el('div', { class: 'view' }, [
    el('div', { class: 'view-head' }, [
      el('h1', { class: 'view-title', text: 'Themes' }),
      el('p', {
        class: 'view-lead',
        text: 'Pick a look. Themes change styling only; the layout never changes.',
      }),
    ]),
    el('section', { class: 'card' }, [cards]),
  ]);
}

function kvRow(label: string, value: string): HTMLElement {
  return el('div', { class: 'kv-row' }, [el('dt', { text: label }), el('dd', { text: value })]);
}

function settingsView(): HTMLElement {
  const info = state.info;
  const about = info
    ? card('About', [
        el('dl', { class: 'kv-list' }, [
          kvRow('OMD Studio', `${info.studioVersion} (alpha)`),
          kvRow('Disc format', `${info.omdFormat} v${info.omdVersion}`),
          kvRow('Electron', info.electron),
          kvRow('Node', info.node),
          kvRow(
            'Active theme',
            THEME_OPTIONS.find((t) => t.id === state.themeId)?.name ?? state.themeId,
          ),
        ]),
      ])
    : card('About', [el('p', { class: 'select-lead', text: 'Loading version info...' })]);

  const drives = state.drives;
  const driveBody: (Node | string)[] =
    drives === undefined
      ? [el('p', { class: 'select-lead', text: 'Scanning...' })]
      : drives.length === 0
        ? [el('p', { class: 'select-lead', text: 'No optical drives detected (burning is Windows-only).' })]
        : [
            el(
              'dl',
              { class: 'kv-list' },
              drives.map((drive) => kvRow(drive.mountPath, drive.description ?? 'Optical drive')),
            ),
          ];

  return el('div', { class: 'view' }, [
    el('div', { class: 'view-head' }, [
      el('h1', { class: 'view-title', text: 'Settings' }),
      el('p', { class: 'view-lead', text: 'Environment and detected hardware.' }),
    ]),
    about,
    card('Optical drives', [
      ...driveBody,
      el('div', { class: 'bc-actions' }, [btn('Rescan drives', () => void rescanDrives())]),
    ]),
  ]);
}

function loadDiscIntoPlayer(disc: StudioDiscInfo, kind: 'disc' | 'package'): void {
  state.disc = disc;
  state.discSourceKind = kind;
  state.verify = undefined;
  state.discError = undefined;
  state.ripStatus = undefined;
  player.loadDisc(
    disc.tracks.map((track) => ({
      number: track.number,
      title: track.title,
      src: track.src,
      artist: disc.artist,
      ...(track.durationSeconds !== undefined ? { durationSeconds: track.durationSeconds } : {}),
    })),
  );
}

async function detectDisc(): Promise<void> {
  state.discLoading = true;
  state.discError = undefined;
  renderMain();
  try {
    const disc = await window.omd.detectDisc();
    if (disc) loadDiscIntoPlayer(disc, 'disc');
    else state.discError = 'No OMD disc detected. Insert a disc or open a package folder.';
  } catch (err) {
    state.discError = (err as Error).message;
  }
  state.discLoading = false;
  if (state.view === 'disc') renderMain();
}

async function openFolder(): Promise<void> {
  state.discLoading = true;
  state.discError = undefined;
  renderMain();
  try {
    const disc = await window.omd.openPackageFolder();
    if (disc) loadDiscIntoPlayer(disc, 'package');
    else state.discError = 'That folder is not an OMD package.';
  } catch (err) {
    state.discError = (err as Error).message;
  }
  state.discLoading = false;
  if (state.view === 'disc') renderMain();
}

async function openDiscByPath(source: string): Promise<void> {
  setView('disc');
  if (!source) return;
  state.discLoading = true;
  state.discError = undefined;
  renderMain();
  try {
    const disc = await window.omd.openDisc(source);
    if (disc) loadDiscIntoPlayer(disc, 'package');
    else state.discError = 'Could not open the package.';
  } catch (err) {
    state.discError = (err as Error).message;
  }
  state.discLoading = false;
  if (state.view === 'disc') renderMain();
}

async function reverify(): Promise<void> {
  if (!state.disc) return;
  state.verify = undefined;
  renderMain();
  try {
    state.verify = await window.omd.verifyDisc(state.disc.source);
  } catch (err) {
    state.discError = (err as Error).message;
  }
  if (state.view === 'disc') renderMain();
}

/** Rip the loaded disc into the catalog folder (choosing one the first time). */
async function ripToCatalog(): Promise<void> {
  if (!state.disc) return;
  let dir = state.libraryDir;
  if (!dir) {
    const chosen = await window.omd.chooseRipDestination();
    if (!chosen) return;
    setCatalogDir(chosen);
    dir = chosen;
  }
  await runRip(dir, false);
}

async function runRip(destDir: string, overwrite: boolean): Promise<void> {
  if (!state.disc) return;
  state.ripStatus = { busy: true, text: 'Ripping and verifying...' };
  if (state.view === 'disc') renderMain();
  try {
    const result = await window.omd.rip({
      source: state.disc.source,
      destDir,
      mode: 'package',
      overwrite,
    });
    if (result.exists) {
      const proceed = window.confirm(`A copy already exists at:\n${result.outDir}\n\nOverwrite it?`);
      if (proceed) {
        await runRip(destDir, true);
        return;
      }
      state.ripStatus = undefined;
      if (state.view === 'disc') renderMain();
      return;
    }
    if (!result.ok) {
      state.ripStatus = { busy: false, ok: false, text: result.error ?? 'Rip failed.' };
    } else {
      state.ripStatus = {
        busy: false,
        ok: true,
        text: `${result.verified ? 'Verified' : 'Copied'} ${result.filesMatched ?? 0}/${result.filesTotal ?? 0} tracks to your catalog.`,
        ...(result.outDir ? { outDir: result.outDir } : {}),
      };
      if (state.libraryDir) void rescanLibrary();
    }
  } catch (err) {
    state.ripStatus = { busy: false, ok: false, text: `Rip failed: ${(err as Error).message}` };
  }
  if (state.view === 'disc') renderMain();
}

function ripStatusEl(status: NonNullable<AppState['ripStatus']>): HTMLElement {
  if (status.busy) return spinnerRow(status.text);
  const children: (Node | string)[] = [
    el('span', { class: `status-pill ${status.ok ? 'ok' : 'bad'}` }, [
      el('span', { class: 'status-dot', 'aria-hidden': 'true' }),
      status.ok ? 'RIPPED' : 'FAILED',
    ]),
    el('span', { class: 'rip-status-text', text: status.text }),
  ];
  if (status.ok && status.outDir) {
    const outDir = status.outDir;
    children.push(
      el(
        'button',
        { class: 'link-btn', type: 'button', onclick: () => void window.omd.revealInFolder(outDir) },
        ['Show in folder'],
      ),
    );
  }
  return el('div', { class: 'rip-status' }, children);
}

/* Burn the loaded catalog package to a disc, inline in the album view. */
const RESULT_CHECK_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M8 12.4l2.6 2.6L16 9.5" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const RESULT_CROSS_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M9 9l6 6M15 9l-6 6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>';

function statusPill(kind: 'ok' | 'bad' | 'neutral', label: string): HTMLElement {
  return el('span', { class: `status-pill ${kind}` }, [
    el('span', { class: 'status-dot', 'aria-hidden': 'true' }),
    label,
  ]);
}

function burnPhaseLabel(phase: string): string {
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

async function openAlbumBurn(): Promise<void> {
  state.albumBurn = { drives: [], burning: false };
  renderMain();
  let drives: StudioDrive[] = [];
  try {
    drives = await window.omd.listDrives();
  } catch {
    drives = [];
  }
  state.albumBurn = { drives, burning: false, ...(drives[0] ? { selectedDrive: drives[0].mountPath } : {}) };
  if (state.view === 'disc') renderMain();
}

function driveSelectAlbum(ab: NonNullable<AppState['albumBurn']>): HTMLSelectElement {
  const select = el('select', {
    class: 'drive-select',
    onchange: (event: Event) => {
      ab.selectedDrive = (event.target as HTMLSelectElement).value;
    },
  }) as HTMLSelectElement;
  for (const drive of ab.drives) {
    select.append(
      el('option', {
        value: drive.mountPath,
        text: drive.description ? `${drive.mountPath} - ${drive.description}` : drive.mountPath,
      }),
    );
  }
  if (ab.selectedDrive) select.value = ab.selectedDrive;
  return select;
}

function albumBurnPanel(): HTMLElement {
  const ab = state.albumBurn!;

  if (ab.result) {
    const good = ab.result.ok;
    const detail = `${ab.result.verified ? 'Burned and verified.' : 'Burned.'}${ab.result.ejected ? ' Ejected.' : ''}`;
    return el('div', { class: 'burn-console' }, [
      el('div', { class: 'bc-head' }, [
        el('span', { class: 'bc-title', text: 'Burn to Disc' }),
        statusPill(good ? 'ok' : 'bad', good ? 'DONE' : 'FAILED'),
      ]),
      el('div', { class: 'bc-results' }, [
        el('div', { class: `bc-result ${good ? 'done' : 'failed'}` }, [
          rawSvg(good ? RESULT_CHECK_SVG : RESULT_CROSS_SVG),
          el('span', { class: 'bc-result-text' }, [
            el('span', {
              class: 'bc-result-title',
              text: good ? 'Burned and verified' : 'Burn failed',
            }),
            el('span', {
              class: 'bc-result-sub',
              text: good ? detail : ab.result.error ?? 'The disc was left in the drive.',
            }),
          ]),
        ]),
      ]),
      el('div', { class: 'bc-actions' }, [
        btn('Burn another copy', () => void openAlbumBurn()),
        btn('Done', () => {
          state.albumBurn = undefined;
          renderMain();
        }),
      ]),
    ]);
  }

  if (ab.burning) {
    return el('div', { class: 'burn-console' }, [
      el('div', { class: 'bc-head' }, [
        el('span', { class: 'bc-title', text: 'Burn to Disc' }),
        statusPill('neutral', 'WRITING'),
      ]),
      el('div', { class: 'bc-status', text: ab.phase ?? 'Working...' }),
      el('div', { class: 'bc-progress', role: 'progressbar', 'aria-label': 'Burn progress' }, [
        el('span', { class: 'bc-progress-fill' }),
      ]),
    ]);
  }

  const noDrive = ab.drives.length === 0;
  return el('div', { class: 'burn-console' }, [
    el('div', { class: 'bc-head' }, [el('span', { class: 'bc-title', text: 'Burn to Disc' })]),
    el('div', { class: 'bc-drive' }, [
      svgIcon('drive', 22),
      noDrive
        ? el('span', { class: 'bc-drive-name', text: 'No optical drive detected' })
        : driveSelectAlbum(ab),
      el('span', { class: 'bc-media', text: 'DVD-RW · 1.4 GB' }),
    ]),
    el('div', {
      class: 'bc-status',
      text: noDrive
        ? 'Insert a rewritable disc in an optical drive. Burning is Windows-only.'
        : 'Blanks a rewritable disc, writes this album, then verifies it.',
    }),
    el('div', { class: 'bc-actions' }, [
      btn('Burn to Disc', () => void runAlbumBurn(), {
        primary: true,
        icon: 'create',
        disabled: noDrive || !ab.selectedDrive,
      }),
      btn('Cancel', () => {
        state.albumBurn = undefined;
        renderMain();
      }),
    ]),
  ]);
}

async function runAlbumBurn(): Promise<void> {
  const ab = state.albumBurn;
  if (!ab || !ab.selectedDrive || !state.disc) return;
  const drive = ab.selectedDrive;
  const confirmed = window.confirm(
    `Burn "${state.disc.discId}" to ${drive}?\n\nA rewritable disc will be erased first.`,
  );
  if (!confirmed) return;
  ab.burning = true;
  ab.phase = 'Starting...';
  renderMain();
  try {
    const result = await window.omd.burn(
      { packageDir: state.disc.source, driveMountPath: drive, blank: true, verify: true, eject: true },
      (progress) => {
        if (state.albumBurn) {
          state.albumBurn.phase = burnPhaseLabel(progress.phase);
          if (state.view === 'disc') renderMain();
        }
      },
    );
    if (state.albumBurn) {
      state.albumBurn.burning = false;
      state.albumBurn.result = result;
    }
  } catch (err) {
    if (state.albumBurn) {
      state.albumBurn.burning = false;
      state.albumBurn.result = {
        ok: false,
        verified: false,
        blanked: false,
        ejected: false,
        backend: 'unknown',
        drive,
        error: (err as Error).message,
      };
    }
  }
  if (state.view === 'disc') renderMain();
}

function formatClock(seconds: number): string {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/* Analog VU meter (ported from the showcase): build the scale + set the needle. */
const VU_NS = 'http://www.w3.org/2000/svg';
const VU_CFG = {
  labels: [-20, -10, -6, -3, 0, 3],
  subs: 4,
  start: -57,
  end: 57,
  pivot: { x: 210, y: 214 },
  r: { label: 181, tickOuter: 153, major: 126, minor: 136 },
  zones: [
    { max: -6, color: '#2788c6' },
    { max: 0, color: '#35c98b' },
    { max: 2, color: '#d5d844' },
    { max: Infinity, color: '#eb3541' },
  ],
};
function vuPoint(deg: number, rad: number): { x: number; y: number } {
  const r = (deg * Math.PI) / 180;
  return { x: VU_CFG.pivot.x + Math.sin(r) * rad, y: VU_CFG.pivot.y - Math.cos(r) * rad };
}
function vuColor(v: number): string {
  return (VU_CFG.zones.find((z) => v <= z.max) ?? VU_CFG.zones[VU_CFG.zones.length - 1]!).color;
}
function vuAngLabel(i: number): number {
  return VU_CFG.start + (i / (VU_CFG.labels.length - 1)) * (VU_CFG.end - VU_CFG.start);
}
function vuAngVal(v: number): number {
  const L = VU_CFG.labels;
  const first = L[0]!;
  const last = L[L.length - 1]!;
  if (v <= first) return VU_CFG.start;
  if (v >= last) return VU_CFG.end;
  for (let i = 0; i < L.length - 1; i++) {
    const lo = L[i]!;
    const hi = L[i + 1]!;
    if (v >= lo && v <= hi) {
      const p = (v - lo) / (hi - lo);
      return vuAngLabel(i) + p * (vuAngLabel(i + 1) - vuAngLabel(i));
    }
  }
  return VU_CFG.start;
}
function vuLine(attrs: Record<string, string>): SVGElement {
  const node = document.createElementNS(VU_NS, 'line');
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}
function buildVuScale(meter: HTMLElement, level: number): void {
  const layer = meter.querySelector('.scale-layer');
  if (!layer) return;
  for (let s = 0; s < VU_CFG.labels.length - 1; s++) {
    const lo = VU_CFG.labels[s]!;
    const hi = VU_CFG.labels[s + 1]!;
    const la = vuAngLabel(s);
    const ha = vuAngLabel(s + 1);
    for (let d = 0; d < VU_CFG.subs; d++) {
      const p = d / VU_CFG.subs;
      const a = la + p * (ha - la);
      const v = lo + p * (hi - lo);
      const o = vuPoint(a, VU_CFG.r.tickOuter);
      const inr = vuPoint(a, d === 0 ? VU_CFG.r.major : VU_CFG.r.minor);
      layer.appendChild(
        vuLine({
          x1: inr.x.toFixed(2),
          y1: inr.y.toFixed(2),
          x2: o.x.toFixed(2),
          y2: o.y.toFixed(2),
          stroke: vuColor(v),
          'stroke-width': d === 0 ? '4.2' : '2.8',
          class: 'scale-tick',
        }),
      );
    }
  }
  const end = VU_CFG.labels[VU_CFG.labels.length - 1]!;
  const oe = vuPoint(VU_CFG.end, VU_CFG.r.tickOuter);
  const ie = vuPoint(VU_CFG.end, VU_CFG.r.major);
  layer.appendChild(
    vuLine({
      x1: ie.x.toFixed(2),
      y1: ie.y.toFixed(2),
      x2: oe.x.toFixed(2),
      y2: oe.y.toFixed(2),
      stroke: vuColor(end),
      'stroke-width': '4.2',
      class: 'scale-tick',
    }),
  );
  VU_CFG.labels.forEach((v, i) => {
    const pnt = vuPoint(vuAngLabel(i), VU_CFG.r.label);
    const t = document.createElementNS(VU_NS, 'text');
    t.setAttribute('x', pnt.x.toFixed(2));
    t.setAttribute('y', pnt.y.toFixed(2));
    t.setAttribute('fill', v > 0 ? '#d73342' : '#176795');
    t.setAttribute('class', 'scale-number');
    t.textContent = v > 0 ? `+${v}` : `${v}`;
    layer.appendChild(t);
  });
  const needle = meter.querySelector('.needle-group');
  if (needle instanceof SVGElement) needle.style.transform = `rotate(${vuAngVal(level)}deg)`;
}

function vuMeter(channel: 'left' | 'right', badge: string, level: number): HTMLElement {
  const meter = el(
    'section',
    { class: 'vu-meter', 'data-meter': channel, 'aria-label': `${badge} channel VU meter` },
    [
      el('span', { class: 'vu-rim', 'aria-hidden': 'true' }),
      el('span', { class: 'vu-surface', 'aria-hidden': 'true' }),
      rawSvg(
        '<svg class="vu-dial" viewBox="0 0 420 230" aria-hidden="true"><g class="scale-layer"></g><g class="needle-group"><path class="needle-body" d="M208.35 216 L209.46 77 Q210 68 210.54 77 L211.65 216 Z"/><path class="needle-highlight" d="M209.82 209 L209.82 78"/></g></svg>',
      ),
      el('span', { class: 'vu-pivot', 'aria-hidden': 'true' }),
      el('span', { class: 'vu-badge', 'aria-hidden': 'true', text: badge }),
    ],
  );
  buildVuScale(meter, level);
  return meter;
}

function vuMeters(active: boolean): HTMLElement {
  return el('div', { class: 'stereo-vu' }, [
    vuMeter('left', 'L', active ? -2.1 : -20),
    vuMeter('right', 'R', active ? -4.3 : -20),
  ]);
}

function trackPanel(disc: StudioDiscInfo, currentIndex: number): HTMLElement {
  const list = el('ol', { class: 'track-list' });
  disc.tracks.forEach((track, index) => {
    const selected = index === currentIndex;
    const row = el(
      'button',
      {
        class: `track-row${selected ? ' selected' : ''}`,
        type: 'button',
        onclick: () => player.playTrack(index),
      },
      [
        el('span', { class: 'track-position' }, [
          el('span', { class: 'track-index', text: String(track.number) }),
          rawSvg('<svg class="play-icon" viewBox="0 0 24 24"><path d="M7 4.8L19 12L7 19.2Z" fill="currentColor"/></svg>'),
        ]),
        el('span', { class: 'track-name', text: track.title }),
        el('span', {
          class: 'track-time',
          text: track.durationSeconds !== undefined ? formatClock(track.durationSeconds) : '',
        }),
        el('span', { class: 'equalizer' }, [
          el('span'),
          el('span'),
          el('span'),
          el('span'),
          el('span'),
        ]),
      ],
    );
    if (selected) row.setAttribute('aria-current', 'true');
    list.append(el('li', {}, [row]));
  });
  const summary = `${disc.trackCount} Tracks \u00b7 ${formatClock(disc.totalDurationSeconds)}`;
  return el('div', { class: 'track-panel' }, [
    el('span', { class: 'glass-rim', 'aria-hidden': 'true' }),
    el('span', { class: 'glass-seam', 'aria-hidden': 'true' }),
    el('span', { class: 'panel-surface', 'aria-hidden': 'true' }),
    el('div', { class: 'panel-content' }, [
      el('header', { class: 'panel-header' }, [
        el('h3', { class: 'panel-title', text: 'Track List' }),
        el('span', { class: 'track-summary', text: summary }),
      ]),
      list,
    ]),
  ]);
}

function playerView(): HTMLElement {
  const pstate = player.getState();
  lastPlayerKey = `${pstate.order[pstate.position] ?? -1}|${pstate.status}`;

  const head = el('div', { class: 'view-head' }, [
    el('h1', { class: 'view-title', text: 'Disc' }),
    el('p', { class: 'view-lead', text: 'Play a mounted OMD disc with verified, lossless FLAC.' }),
  ]);

  if (!state.disc) {
    const hero: (Node | string)[] = [
      el('span', { class: 'select-icon' }, [svgIcon('drive', 54)]),
      el('p', {
        class: 'select-lead',
        text: 'Insert a burned OMD disc and detect it, or open a package folder on disk.',
      }),
      el('div', { class: 'bc-actions' }, [
        btn('Detect disc', () => void detectDisc(), { primary: true, icon: 'drive' }),
        btn('Open folder...', () => void openFolder(), { icon: 'folder' }),
      ]),
    ];
    if (state.discLoading) hero.push(spinnerRow('Looking for a disc...'));
    if (state.discError) hero.push(el('p', { class: 'select-lead', text: state.discError }));
    return el('div', { class: 'view' }, [
      head,
      el('section', { class: 'card' }, [el('div', { class: 'select-hero' }, hero)]),
    ]);
  }

  const disc = state.disc;
  const currentIndex = pstate.order[pstate.position] ?? -1;
  const playing = pstate.status === 'playing';

  const cover = disc.coverDataUri
    ? el('img', { class: 'album-cover', src: disc.coverDataUri, alt: 'Cover art' })
    : el('div', { class: 'album-cover album-cover-empty' }, [svgIcon('note', 46)]);

  const verified = state.verify ? state.verify.valid : disc.valid;
  const hero = el('div', { class: 'player-hero' }, [
    cover,
    el('div', { class: 'album-meta' }, [
      el('div', { class: 'album-title', text: disc.album }),
      el('div', { class: 'album-artist', text: disc.artist }),
      el('dl', { class: 'kv-list' }, [
        kvRow('Disc ID', disc.discId),
        kvRow('Tracks', `${disc.trackCount} \u00b7 ${formatClock(disc.totalDurationSeconds)}`),
        kvRow('Format', 'FLAC \u00b7 8cm mini DVD-RW'),
      ]),
      el('div', { class: 'player-badges' }, [
        el('span', { class: `npd-chip${verified ? ' verified' : ''}` }, [
          svgIcon('check'),
          verified ? 'Verified' : 'Not verified',
        ]),
        el('span', { class: 'npd-chip flac' }, [svgIcon('wave'), 'FLAC lossless']),
      ]),
      el('div', { class: 'bc-actions' }, [
        btn(playing ? 'Pause' : 'Play', () => player.togglePlayPause(), {
          primary: true,
          icon: playing ? 'pause' : 'play',
        }),
        ...(state.discSourceKind === 'disc'
          ? [btn('Rip to Catalog', () => void ripToCatalog(), { icon: 'rip' })]
          : []),
        ...(state.discSourceKind === 'package'
          ? [
              btn('Burn to Disc', () => void openAlbumBurn(), {
                icon: 'create',
                disabled: !disc.valid,
              }),
            ]
          : []),
        btn('Re-verify', () => void reverify()),
        btn('Close', () => {
          state.disc = undefined;
          state.verify = undefined;
          state.discSourceKind = undefined;
          state.ripStatus = undefined;
          state.albumBurn = undefined;
          renderMain();
        }),
      ]),
      ...(state.ripStatus ? [ripStatusEl(state.ripStatus)] : []),
    ]),
  ]);

  const controls = el('div', { class: 'stack' }, [
    el('div', {}, [
      el('p', { class: 'eyebrow', text: 'Player Controls' }),
      el('div', { class: 'player-controls' }, [
        pcButton('shuffle', 'Shuffle', () => player.toggleShuffle(), { active: pstate.shuffle }),
        pcButton('prev', 'Previous', () => player.previous()),
        pcButton(playing ? 'pause' : 'play', playing ? 'Pause' : 'Play', () =>
          player.togglePlayPause(), { primary: true }),
        pcButton('next', 'Next', () => player.next()),
        pcButton('repeat', `Repeat: ${pstate.repeat}`, () => player.cycleRepeat(), {
          active: pstate.repeat !== 'off',
        }),
      ]),
    ]),
    el('div', {}, [el('p', { class: 'eyebrow', text: 'VU Meters' }), vuMeters(playing)]),
  ]);

  return el('div', { class: 'view' }, [
    head,
    el('section', { class: 'card' }, [hero]),
    ...(state.albumBurn ? [el('section', { class: 'card' }, [albumBurnPanel()])] : []),
    el('section', { class: 'card' }, [
      el('div', { class: 'grid cols-2' }, [trackPanel(disc, currentIndex), controls]),
    ]),
  ]);
}

function spinnerRow(text: string): HTMLElement {
  return el('div', { class: 'spinner-row' }, [
    el('span', { class: 'spinner', 'aria-hidden': 'true' }),
    el('span', { text }),
  ]);
}

async function rescanDrives(): Promise<void> {
  state.drives = undefined;
  renderMain();
  try {
    state.drives = await window.omd.listDrives();
  } catch {
    state.drives = [];
  }
  if (state.view === 'settings') renderMain();
}

async function chooseLibrary(): Promise<void> {
  const dir = await window.omd.chooseLibraryFolder();
  if (!dir) return;
  setCatalogDir(dir);
  await rescanLibrary();
}

async function rescanLibrary(): Promise<void> {
  if (!state.libraryDir) return;
  state.catalogLoading = true;
  state.catalogError = undefined;
  renderMain();
  try {
    state.catalog = await window.omd.scanLibrary(state.libraryDir);
  } catch (err) {
    state.catalogError = (err as Error).message;
  }
  state.catalogLoading = false;
  if (state.view === 'catalog') renderMain();
}

function catalogCard(entry: CatalogEntry): HTMLElement {
  const cover = entry.coverDataUri
    ? el('img', { class: 'ct-cover', src: entry.coverDataUri, alt: 'Cover art' })
    : el('span', { class: 'ct-cover ct-cover-empty' }, [svgIcon('note', 34)]);
  return el('div', { class: 'catalog-tile' }, [
    cover,
    el('div', { class: 'ct-body' }, [
      el('div', { class: 'ct-title', text: entry.discId }),
      el('div', { class: 'ct-sub', text: `${entry.artist} \u2014 ${entry.album}` }),
      el('div', { class: 'ct-sub', text: `${entry.trackCount} tracks` }),
    ]),
    el('div', { class: 'ct-actions' }, [
      el(
        'button',
        { class: 'ct-btn', type: 'button', onclick: () => void openDiscByPath(entry.source) },
        ['Open'],
      ),
      el(
        'button',
        {
          class: 'ct-btn ghost',
          type: 'button',
          onclick: () => void window.omd.revealInFolder(entry.source),
        },
        ['Show'],
      ),
    ]),
  ]);
}

function catalogView(): HTMLElement {
  const actions = el('div', { class: 'bc-actions' }, [
    btn('Choose library folder...', () => void chooseLibrary(), { primary: true, icon: 'catalog' }),
    ...(state.libraryDir ? [btn('Rescan', () => void rescanLibrary())] : []),
  ]);
  const body: (Node | string)[] = [actions];
  if (state.libraryDir) body.push(el('p', { class: 'burn-source-path', text: state.libraryDir }));

  if (state.catalogLoading) {
    body.push(spinnerRow('Scanning...'));
  } else if (state.catalogError) {
    body.push(el('p', { class: 'select-lead', text: state.catalogError }));
  } else if (state.catalog && state.catalog.length > 0) {
    const grid = el('div', { class: 'catalog-grid' });
    for (const entry of state.catalog) grid.append(catalogCard(entry));
    body.push(grid);
  } else {
    body.push(
      el('p', {
        class: 'select-lead',
        text: state.catalog
          ? 'No OMD packages here. Choose a folder that contains package subfolders (for example your build output).'
          : 'Choose a folder that contains OMD package subfolders to list them here.',
      }),
    );
  }

  return el('div', { class: 'view' }, [
    el('div', { class: 'view-head' }, [
      el('h1', { class: 'view-title', text: 'Catalog' }),
      el('p', { class: 'view-lead', text: 'Browse the OMD packages you have created and ripped.' }),
    ]),
    el('section', { class: 'card' }, body),
  ]);
}

function viewFor(view: ViewId): HTMLElement {
  switch (view) {
    case 'burn':
      return renderBurnView({ onOpenPlayer: (source) => void openDiscByPath(source) });
    case 'labels':
      return renderLabelsView();
    case 'disc':
      return playerView();
    case 'catalog':
      return catalogView();
    case 'themes':
      return themesView();
    case 'settings':
      return settingsView();
    default:
      return placeholderView('OMD Studio', '', []);
  }
}

/** A sidebar nav item in the showcase structure (rim + surface + glare spans). */
function navItemEl(item: NavItem, active: boolean, onClick: () => void): HTMLElement {
  const icon = svgIcon(item.icon);
  icon.setAttribute('class', 'nav-icon');
  const chevron = svgIcon('chevron-right');
  chevron.setAttribute('class', 'nav-chevron');
  // Only the selected (primary) item carries the active marker and glare.
  const layers: (Node | string)[] = active
    ? [el('span', { class: 'active-marker', 'aria-hidden': 'true' })]
    : [];
  layers.push(
    el('span', { class: 'nav-rim', 'aria-hidden': 'true' }),
    el('span', { class: 'nav-surface', 'aria-hidden': 'true' }),
  );
  if (active) layers.push(el('span', { class: 'selected-glare', 'aria-hidden': 'true' }));
  layers.push(
    el('span', { class: 'nav-content' }, [
      icon,
      el('span', { class: 'nav-label', text: item.label }),
      chevron,
    ]),
  );
  return el(
    'button',
    {
      class: `nav-item ${active ? 'primary' : 'secondary'}`,
      type: 'button',
      'aria-current': active ? 'page' : null,
      onclick: onClick,
    },
    layers,
  );
}

function buildShell(): void {
  const root = document.getElementById('app');
  if (!root) return;
  clearChildren(root);

  // Decorative theme wallpaper (recolored per theme by the active stylesheet).
  const backdrop = el('div', { class: 'aqua-backdrop', 'aria-hidden': 'true' }, [
    el('div', { class: 'glow-layer' }, [
      el('span', { class: 'glow g1' }),
      el('span', { class: 'glow g2' }),
      el('span', { class: 'glow g3' }),
    ]),
    el(
      'div',
      { class: 'bubble-layer' },
      Array.from({ length: 12 }, (_, i) => el('span', { class: `bubble b${i + 1}` })),
    ),
  ]);

  const brand = el('div', { class: 'app-brand' }, [
    el('div', { class: 'brand-word' }, [
      el('div', { class: 'omd', text: 'OMD' }),
      el('div', { class: 'studio', text: 'STUDIO' }),
    ]),
    (brandDisc = el('img', {
      class: 'app-brand-disc',
      src: logoFor(state.themeId),
      alt: '',
    }) as HTMLImageElement),
    el('div', {
      class: 'app-brand-tag',
      text: 'Turn FLAC albums into real, playable 8cm mini DVD-RW discs.',
    }),
  ]);

  const nav = el('nav', { class: 'nav-list', 'aria-label': 'Main navigation' });
  for (const item of NAV) {
    const button = navItemEl(item, item.id === state.view, () => setView(item.id));
    navButtons.set(item.id, button);
    nav.append(button);
  }

  versionLabel = el('div', { class: 'app-version', text: 'alpha' });
  const sidebar = el('aside', { class: 'app-sidebar' }, [
    el('div', { class: 'card' }, [brand, nav, versionLabel]),
  ]);

  mainEl = el('main', { class: 'app-main' });
  nowPlayingHost = el('div', { class: 'app-dock' });

  root.append(backdrop, el('div', { class: 'app-shell' }, [sidebar, mainEl, nowPlayingHost]));
}

async function init(): Promise<void> {
  buildShell();
  applyThemeById(state.themeId);
  player.initPlayer();
  player.subscribe(onPlayerChange);
  setView(state.view);
  renderNowPlayingBar();

  try {
    state.info = await window.omd.getInfo();
    versionLabel.textContent = `v${state.info.studioVersion} (alpha)`;
  } catch {
    versionLabel.textContent = 'alpha';
  }
  try {
    state.drives = await window.omd.listDrives();
  } catch {
    state.drives = [];
  }
  if (state.view === 'settings') renderMain();
}

void init();
