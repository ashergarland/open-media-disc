/**
 * OMD Studio renderer: the app shell.
 *
 * Builds the fixed layout (left sidebar, main content, persistent Now Playing
 * bar), applies a theme by writing the shared UI kit's `--omd-*` CSS variables
 * onto the document, and swaps the main view per navigation. Playback and disc
 * flows are stubbed here; later increments fill in the wizard and player.
 */

import {
  AQUA_THEME,
  BUILTIN_THEMES,
  applyTheme,
  resolveTheme,
  validateTheme,
  type OmdTheme,
} from '@open-album-cartridge/ui';
import type {
  CatalogEntry,
  OmdStudioApi,
  StudioDiscInfo,
  StudioDrive,
  StudioInfo,
  StudioVerifyResult,
} from '../shared/types';
import { clearChildren, el, svgIcon, svgWordmark, type IconName } from './dom';
import { renderNowPlaying } from './nowPlaying';
import { renderBurnView } from './burnView';
import { renderLabelsView } from './labelsView';
import * as player from './audioController';

declare global {
  interface Window {
    omd: OmdStudioApi;
  }
}

type ViewId = 'burn' | 'labels' | 'player' | 'catalog' | 'themes' | 'settings';

interface NavItem {
  id: ViewId;
  label: string;
  icon: IconName;
}

const NAV: NavItem[] = [
  { id: 'burn', label: 'Burn', icon: 'create' },
  { id: 'labels', label: 'Labels', icon: 'label' },
  { id: 'player', label: 'Player', icon: 'player' },
  { id: 'catalog', label: 'Catalog', icon: 'catalog' },
  { id: 'themes', label: 'Themes', icon: 'themes' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

interface AppState {
  view: ViewId;
  themeId: string;
  info?: StudioInfo;
  drives?: StudioDrive[];
  disc?: StudioDiscInfo;
  discLoading: boolean;
  discError?: string;
  verify?: StudioVerifyResult;
  libraryDir?: string;
  catalog?: CatalogEntry[];
  catalogLoading: boolean;
  catalogError?: string;
  themeError?: string;
}

const state: AppState = {
  view: 'burn',
  themeId: AQUA_THEME.id,
  discLoading: false,
  catalogLoading: false,
};

const navButtons = new Map<ViewId, HTMLElement>();
let mainEl: HTMLElement;
let nowPlayingHost: HTMLElement;
let versionLabel: HTMLElement;
let lastPlayerKey = '';

const importedThemes: OmdTheme[] = [];

function allThemes(): OmdTheme[] {
  return [...BUILTIN_THEMES, ...importedThemes];
}

function applyThemeById(id: string): void {
  const theme = allThemes().find((entry) => entry.id === id) ?? AQUA_THEME;
  applyTheme(document.documentElement, resolveTheme(theme));
  state.themeId = theme.id;
}

function setView(view: ViewId): void {
  state.view = view;
  for (const [id, button] of navButtons) {
    button.classList.toggle('is-active', id === view);
  }
  renderMain();
}

function renderMain(): void {
  clearChildren(mainEl);
  mainEl.append(viewFor(state.view));
}

function renderNowPlayingBar(): void {
  clearChildren(nowPlayingHost);
  nowPlayingHost.append(
    renderNowPlaying(player.getState(), {
      onTogglePlay: () => player.togglePlayPause(),
      onNext: () => player.next(),
      onPrevious: () => player.previous(),
      onToggleShuffle: () => player.toggleShuffle(),
      onCycleRepeat: () => player.cycleRepeat(),
      onVolume: (value) => player.setVolume(value),
      onSeek: (fraction) => player.seekFraction(fraction),
    }),
  );
}

function onPlayerChange(): void {
  renderNowPlayingBar();
  const pstate = player.getState();
  const key = `${pstate.order[pstate.position] ?? -1}|${pstate.status}`;
  if (state.view === 'player' && key !== lastPlayerKey) {
    renderMain();
  }
}

function card(title: string, children: (Node | string)[]): HTMLElement {
  return el('section', { class: 'card' }, [
    el('h2', { class: 'card-title', text: title }),
    ...children,
  ]);
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

function themesView(): HTMLElement {
  const grid = el('div', { class: 'theme-grid' });
  for (const theme of allThemes()) {
    const resolved = resolveTheme(theme);
    const swatch = el('div', { class: 'theme-swatch', 'aria-hidden': 'true' });
    for (const token of [
      'app.background',
      'surface.background',
      'accent',
      'vu.low',
      'vu.high',
    ] as const) {
      const chip = el('span', { class: 'chip' });
      chip.style.setProperty('background', resolved.tokens[token]);
      swatch.append(chip);
    }
    const active = theme.id === state.themeId;
    grid.append(
      el(
        'button',
        {
          class: `theme-card${active ? ' is-active' : ''}`,
          onclick: () => {
            applyThemeById(theme.id);
            renderMain();
          },
        },
        [
          swatch,
          el('div', { class: 'theme-info' }, [
            el('div', { class: 'theme-name', text: theme.name }),
            el('div', { class: 'theme-type muted', text: `${theme.type} theme` }),
          ]),
          el('span', { class: 'theme-current', text: active ? 'Active' : '' }),
        ],
      ),
    );
  }
  const children: (Node | string)[] = [
    el('div', { class: 'view-head' }, [
      el('h1', { class: 'view-title', text: 'Themes' }),
      el('p', {
        class: 'view-lead',
        text: 'Pick a look. Themes are data only; the layout never changes.',
      }),
    ]),
    grid,
    el('div', { class: 'wizard-actions' }, [
      el('button', { class: 'btn', onclick: () => void importTheme() }, ['Import theme...']),
    ]),
  ];
  if (state.themeError) children.push(el('p', { class: 'wizard-error', text: state.themeError }));
  return el('div', { class: 'view' }, children);
}

function settingsRow(label: string, value: string): HTMLElement {
  return el('div', { class: 'kv' }, [
    el('span', { class: 'kv-key muted', text: label }),
    el('span', { class: 'kv-val', text: value }),
  ]);
}

function settingsView(): HTMLElement {
  const info = state.info;
  const about = info
    ? card('About', [
        settingsRow('OMD Studio', `${info.studioVersion} (alpha)`),
        settingsRow('Disc format', `${info.omdFormat} v${info.omdVersion}`),
        settingsRow('Electron', info.electron),
        settingsRow('Node', info.node),
      ])
    : card('About', [el('p', { class: 'muted', text: 'Loading version info...' })]);

  const drives = state.drives;
  const driveChildren: (Node | string)[] =
    drives === undefined
      ? [el('p', { class: 'muted', text: 'Scanning...' })]
      : drives.length === 0
        ? [el('p', { class: 'muted', text: 'No optical drives detected (burning is Windows-only).' })]
        : drives.map((drive) => settingsRow(drive.mountPath, drive.description ?? 'Optical drive'));

  return el('div', { class: 'view' }, [
    el('div', { class: 'view-head' }, [
      el('h1', { class: 'view-title', text: 'Settings' }),
      el('p', { class: 'view-lead', text: 'Environment and detected hardware.' }),
    ]),
    about,
    card('Optical drives', [
      ...driveChildren,
      el('div', { class: 'wizard-actions' }, [
        el('button', { class: 'btn', onclick: () => void rescanDrives() }, ['Rescan drives']),
      ]),
    ]),
  ]);
}

function loadDiscIntoPlayer(disc: StudioDiscInfo): void {
  state.disc = disc;
  state.verify = undefined;
  state.discError = undefined;
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
    if (disc) loadDiscIntoPlayer(disc);
    else state.discError = 'No OMD disc detected. Insert a disc or open a package folder.';
  } catch (err) {
    state.discError = (err as Error).message;
  }
  state.discLoading = false;
  if (state.view === 'player') renderMain();
}

async function openFolder(): Promise<void> {
  state.discLoading = true;
  state.discError = undefined;
  renderMain();
  try {
    const disc = await window.omd.openPackageFolder();
    if (disc) loadDiscIntoPlayer(disc);
    else state.discError = 'That folder is not an OMD package.';
  } catch (err) {
    state.discError = (err as Error).message;
  }
  state.discLoading = false;
  if (state.view === 'player') renderMain();
}

async function openDiscByPath(source: string): Promise<void> {
  setView('player');
  if (!source) return;
  state.discLoading = true;
  state.discError = undefined;
  renderMain();
  try {
    const disc = await window.omd.openDisc(source);
    if (disc) loadDiscIntoPlayer(disc);
    else state.discError = 'Could not open the package.';
  } catch (err) {
    state.discError = (err as Error).message;
  }
  state.discLoading = false;
  if (state.view === 'player') renderMain();
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
  if (state.view === 'player') renderMain();
}

function formatClock(seconds: number): string {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function playerView(): HTMLElement {
  const pstate = player.getState();
  lastPlayerKey = `${pstate.order[pstate.position] ?? -1}|${pstate.status}`;

  const head = el('div', { class: 'view-head' }, [
    el('h1', { class: 'view-title', text: 'Player' }),
    el('p', { class: 'view-lead', text: 'Play a mounted OMD disc with verified, lossless FLAC.' }),
  ]);

  if (!state.disc) {
    const body: (Node | string)[] = [
      el('p', {
        class: 'muted',
        text: 'Insert a burned OMD disc and detect it, or open a package folder on disk.',
      }),
      el('div', { class: 'wizard-actions' }, [
        el('button', { class: 'btn btn-primary', onclick: () => void detectDisc() }, ['Detect disc']),
        el('button', { class: 'btn', onclick: () => void openFolder() }, ['Open folder...']),
      ]),
    ];
    if (state.discLoading) {
      body.push(
        el('div', { class: 'spinner-row' }, [
          el('span', { class: 'spinner', 'aria-hidden': 'true' }),
          el('span', { text: 'Looking for a disc...' }),
        ]),
      );
    }
    if (state.discError) body.push(el('p', { class: 'wizard-error', text: state.discError }));
    return el('div', { class: 'view' }, [head, card('No disc loaded', body)]);
  }

  const disc = state.disc;
  const currentIndex = pstate.order[pstate.position] ?? -1;
  const playing = pstate.status === 'playing';

  const cover = disc.coverDataUri
    ? el('img', { class: 'player-cover', src: disc.coverDataUri, alt: 'Cover art' })
    : el('div', { class: 'player-cover cover-empty' }, [svgIcon('create', 64)]);

  const verified = state.verify ? state.verify.valid : disc.valid;
  const badges = el('div', { class: 'player-badges' }, [
    el('span', { class: `badge ${verified ? 'badge-verified' : 'badge-bad'}` }, [
      svgIcon('check', 14),
      el('span', { text: verified ? 'Verified' : 'Not verified' }),
    ]),
    el('span', { class: 'badge badge-flac', text: 'FLAC lossless' }),
  ]);

  const facts = el('div', { class: 'player-facts' }, [
    el('div', { class: 'meta-row' }, [svgIcon('create', 16), el('span', { text: disc.album })]),
    el('div', { class: 'meta-row' }, [
      svgIcon('note', 16),
      el('span', { text: `${disc.trackCount} tracks \u00b7 ${formatClock(disc.totalDurationSeconds)}` }),
    ]),
    el('div', { class: 'meta-row' }, [
      svgIcon('wave', 16),
      el('span', { text: 'FLAC \u00b7 8cm mini DVD-RW' }),
    ]),
  ]);

  const meta = el('div', { class: 'player-meta' }, [
    el('div', { class: 'player-title', text: disc.discId }),
    el('div', { class: 'player-subtitle', text: disc.artist }),
    facts,
    badges,
    el('div', { class: 'player-actions' }, [
      el('button', { class: 'btn btn-primary', onclick: () => player.togglePlayPause() }, [
        playing ? 'Pause' : 'Play',
      ]),
      el('button', { class: 'btn', onclick: () => void reverify() }, ['Re-verify']),
      el(
        'button',
        {
          class: 'btn',
          onclick: () => {
            state.disc = undefined;
            state.verify = undefined;
            renderMain();
          },
        },
        ['Close'],
      ),
    ]),
  ]);

  const trackList = el(
    'ol',
    { class: 'player-tracks' },
    disc.tracks.map((track, index) =>
      el(
        'li',
        {
          class: `track-row${index === currentIndex ? ' is-current' : ''}`,
          onclick: () => player.playTrack(index),
        },
        [
          el('span', {
            class: 'track-num',
            text: index === currentIndex && playing ? '\u25b6' : String(track.number),
          }),
          el('span', { class: 'track-title', text: track.title }),
          el('span', {
            class: 'muted small',
            text: track.durationSeconds !== undefined ? formatClock(track.durationSeconds) : '',
          }),
        ],
      ),
    ),
  );

  return el('div', { class: 'view' }, [
    head,
    el('div', { class: 'player-top' }, [cover, meta]),
    card('Tracks', [trackList]),
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

async function importTheme(): Promise<void> {
  state.themeError = undefined;
  const text = await window.omd.importThemeFile();
  if (!text) return;
  let theme: OmdTheme;
  try {
    theme = JSON.parse(text) as OmdTheme;
  } catch {
    state.themeError = 'That file is not valid JSON.';
    renderMain();
    return;
  }
  const issues = validateTheme(theme);
  if (issues.length > 0) {
    state.themeError = `Invalid theme: ${issues.join('; ')}`;
    renderMain();
    return;
  }
  const existing = importedThemes.findIndex((entry) => entry.id === theme.id);
  if (existing >= 0) importedThemes[existing] = theme;
  else importedThemes.push(theme);
  try {
    applyThemeById(theme.id);
  } catch (err) {
    state.themeError = (err as Error).message;
  }
  renderMain();
}

async function chooseLibrary(): Promise<void> {
  const dir = await window.omd.chooseLibraryFolder();
  if (!dir) return;
  state.libraryDir = dir;
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
    ? el('img', { class: 'catalog-cover', src: entry.coverDataUri, alt: 'Cover art' })
    : el('div', { class: 'catalog-cover cover-empty' }, [svgIcon('create', 36)]);
  return el('div', { class: 'catalog-card' }, [
    cover,
    el('div', { class: 'catalog-info' }, [
      el('div', { class: 'catalog-title', text: entry.discId }),
      el('div', { class: 'muted small', text: `${entry.artist} - ${entry.album}` }),
      el('div', { class: 'muted small', text: `${entry.trackCount} tracks` }),
    ]),
    el('div', { class: 'catalog-actions' }, [
      el('button', { class: 'btn btn-primary btn-sm', onclick: () => void openDiscByPath(entry.source) }, [
        'Open in Player',
      ]),
      el('button', { class: 'btn btn-sm', onclick: () => void window.omd.revealInFolder(entry.source) }, [
        'Show in folder',
      ]),
    ]),
  ]);
}

function catalogView(): HTMLElement {
  const children: (Node | string)[] = [
    el('div', { class: 'view-head' }, [
      el('h1', { class: 'view-title', text: 'Catalog' }),
      el('p', { class: 'view-lead', text: 'Browse the OMD packages you have created and ripped.' }),
    ]),
    el('div', { class: 'wizard-actions' }, [
      el('button', { class: 'btn btn-primary', onclick: () => void chooseLibrary() }, [
        'Choose library folder...',
      ]),
      ...(state.libraryDir
        ? [el('button', { class: 'btn', onclick: () => void rescanLibrary() }, ['Rescan'])]
        : []),
    ]),
  ];
  if (state.libraryDir) children.push(el('p', { class: 'muted small', text: state.libraryDir }));

  if (state.catalogLoading) {
    children.push(spinnerRow('Scanning...'));
  } else if (state.catalogError) {
    children.push(el('p', { class: 'wizard-error', text: state.catalogError }));
  } else if (state.catalog) {
    if (state.catalog.length === 0) {
      children.push(
        card('No packages', [
          el('p', {
            class: 'muted',
            text: 'No OMD packages here. Choose a folder that contains package subfolders (for example your build output).',
          }),
        ]),
      );
    } else {
      const grid = el('div', { class: 'catalog-grid' });
      for (const entry of state.catalog) grid.append(catalogCard(entry));
      children.push(grid);
    }
  } else {
    children.push(
      el('p', {
        class: 'muted',
        text: 'Choose a folder that contains OMD package subfolders to list them here.',
      }),
    );
  }
  return el('div', { class: 'view' }, children);
}

function viewFor(view: ViewId): HTMLElement {
  switch (view) {
    case 'burn':
      return renderBurnView({ onOpenPlayer: (source) => void openDiscByPath(source) });
    case 'labels':
      return renderLabelsView();
    case 'player':
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

function buildShell(): void {
  const root = document.getElementById('app');
  if (!root) return;
  clearChildren(root);

  const brand = el('div', { class: 'brand' }, [
    svgWordmark(),
    el('img', { class: 'brand-mark', src: 'assets/omd-disc.png', alt: '' }),
    el('div', {
      class: 'brand-tag',
      text: 'Turn FLAC albums into real, playable 8cm mini DVD-RW discs.',
    }),
  ]);

  const nav = el('nav', { class: 'nav' });
  for (const item of NAV) {
    const button = el('button', { class: 'nav-item', onclick: () => setView(item.id) }, [
      svgIcon(item.icon),
      el('span', { text: item.label }),
    ]);
    navButtons.set(item.id, button);
    nav.append(button);
  }

  versionLabel = el('div', { class: 'sidebar-footer', text: 'alpha' });
  const sidebar = el('aside', { class: 'sidebar' }, [brand, nav, versionLabel]);

  mainEl = el('main', { class: 'main' });
  nowPlayingHost = el('div', { class: 'now-playing-host' });

  root.append(el('div', { class: 'shell' }, [sidebar, mainEl, nowPlayingHost]));
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
