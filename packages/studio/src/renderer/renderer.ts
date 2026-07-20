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
  StudioImportProgress,
  StudioImportResult,
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
  /** The physically inserted OMD disc (Disc view). */
  disc?: StudioDiscInfo;
  discLoading: boolean;
  discError?: string;
  /** The catalog album opened for detail/playback (Catalog view). */
  album?: StudioDiscInfo;
  albumLoading: boolean;
  albumError?: string;
  /** In-progress metadata edit for the opened catalog album. */
  albumEdit?: {
    discId: string;
    artist: string;
    album: string;
    year: string;
    tracks: { number: number; title: string }[];
    coverSourcePath?: string;
    coverPreview?: string;
    saving?: boolean;
    error?: string;
    /** True once a save has been attempted, so all invalid fields highlight. */
    showErrors?: boolean;
  };
  /** Which album is loaded in the shared transport, identified by its source. */
  nowPlaying?: { disc: StudioDiscInfo; source: 'disc' | 'album' };
  verify?: StudioVerifyResult;
  reverifying?: boolean;
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
  importStatus?: { busy: boolean; progress?: StudioImportProgress; result?: StudioImportResult };
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

/** The cartridge image path for a theme id (each theme ships assets/<id>/cartridge.png). */
function cartridgeFor(id: string): string {
  const themeId = THEME_OPTIONS.some((entry) => entry.id === id) ? id : DEFAULT_THEME_ID;
  return `assets/${themeId}/cartridge.png`;
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
  albumLoading: false,
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
  // Entering the Catalog re-scans the library folder so newly ripped/burned
  // packages appear without a manual refresh.
  if (view === 'catalog' && state.libraryDir && !state.album) void rescanLibrary();
  renderMain();
}

function renderMain(): void {
  clearChildren(mainEl);
  mainEl.append(viewFor(state.view));
}

/** Whether the album loaded in the transport passed verification (undefined when none). */
function discVerified(): boolean | undefined {
  const np = state.nowPlaying;
  if (!np) return undefined;
  if (np.source === 'disc') return state.verify ? state.verify.valid : np.disc.valid;
  return np.disc.valid;
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
  const np = state.nowPlaying;
  nowPlayingHost.append(
    renderNowPlaying(pstate, NOW_PLAYING_HANDLERS, {
      verified: discVerified(),
      ...(np?.disc.audioCodec ? { fileType: np.disc.audioCodec } : {}),
      ...(np?.disc.coverDataUri ? { coverDataUri: np.disc.coverDataUri } : {}),
    }),
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
  const showsAlbum =
    state.view === 'disc' ||
    (state.view === 'catalog' && state.album !== undefined && state.albumEdit === undefined);
  if (showsAlbum && key !== lastPlayerKey) {
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
  const classes = ['btn', 'btn--sm', options.primary ? 'btn--primary' : 'btn--secondary'];
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

function queueFor(disc: StudioDiscInfo) {
  return disc.tracks.map((track) => ({
    number: track.number,
    title: track.title,
    src: track.src,
    artist: disc.artist,
    ...(track.durationSeconds !== undefined ? { durationSeconds: track.durationSeconds } : {}),
  }));
}

/**
 * Play an album through the shared transport. If it is not already the loaded
 * album, load its queue first; then start (or toggle) playback, optionally at a
 * specific track. This is how both the Disc and Catalog views drive the player.
 */
function playFrom(disc: StudioDiscInfo, source: 'disc' | 'album', trackIndex?: number): void {
  if (state.nowPlaying?.disc.source !== disc.source) {
    state.nowPlaying = { disc, source };
    player.loadDisc(queueFor(disc));
  }
  if (trackIndex !== undefined) player.playTrack(trackIndex);
  else player.togglePlayPause();
}

/** Set the physical disc and kick off a background verify. Does not touch the transport. */
function setDisc(disc: StudioDiscInfo): void {
  state.disc = disc;
  state.verify = undefined;
  state.ripStatus = undefined;
  void reverify();
}

/**
 * React to a live optical-drive change pushed from the main process: show a
 * freshly inserted OMD disc in the Disc view, or clear an ejected one (stopping
 * playback only if that disc was the one playing).
 */
function onDiscChanged(disc: StudioDiscInfo | null): void {
  if (disc) {
    setDisc(disc);
  } else {
    if (!state.disc) return;
    state.disc = undefined;
    state.verify = undefined;
    state.ripStatus = undefined;
    if (state.nowPlaying?.source === 'disc') {
      state.nowPlaying = undefined;
      player.loadDisc([]);
      renderNowPlayingBar();
    }
  }
  if (state.view === 'disc') renderMain();
}

async function detectDisc(): Promise<void> {
  state.discLoading = true;
  state.discError = undefined;
  renderMain();
  try {
    const disc = await window.omd.detectDisc();
    if (disc) setDisc(disc);
    else state.discError = 'No OMD disc detected. Insert a burned OMD disc to play it here.';
  } catch (err) {
    state.discError = (err as Error).message;
  }
  state.discLoading = false;
  if (state.view === 'disc') renderMain();
}

/** Open a catalog package for detail/playback inside the Catalog view. */
async function openAlbum(source: string): Promise<void> {
  setView('catalog');
  if (!source) return;
  state.albumLoading = true;
  state.albumError = undefined;
  renderMain();
  try {
    const disc = await window.omd.openDisc(source);
    if (disc) state.album = disc;
    else state.albumError = 'Could not open the package.';
  } catch (err) {
    state.albumError = (err as Error).message;
  }
  state.albumLoading = false;
  if (state.view === 'catalog') renderMain();
}

/** Enter edit mode for the opened catalog album, seeded from its current data. */
function startEditAlbum(disc: StudioDiscInfo): void {
  state.albumEdit = {
    discId: disc.discId,
    artist: disc.artist,
    album: disc.album,
    year: disc.releaseYear ? String(disc.releaseYear) : '',
    tracks: disc.tracks.map((t) => ({ number: t.number, title: t.title })),
  };
  renderMain();
}

/** Pick a replacement cover image and preview it in the edit form. */
async function chooseCover(): Promise<void> {
  const picked = await window.omd.chooseCoverImage(state.album?.source);
  if (!picked || !state.albumEdit) return;
  state.albumEdit.coverSourcePath = picked.path;
  state.albumEdit.coverPreview = picked.dataUri;
  renderMain();
}

/** Save the edited album metadata (and cover) back to the package. */
async function saveEdit(): Promise<void> {
  const edit = state.albumEdit;
  const album = state.album;
  if (!edit || !album) return;
  // Field-level validation (matches the manifest schema); highlight on failure.
  const fieldKeys = ['discId', 'artist', 'album', 'year'] as const;
  const hasFieldError = fieldKeys.some((k) => fieldError(k, edit[k]) !== undefined);
  const hasTrackError = edit.tracks.some((t) => t.title.trim().length === 0);
  if (hasFieldError || hasTrackError) {
    edit.showErrors = true;
    edit.error = 'Please fix the highlighted fields.';
    renderMain();
    return;
  }
  const year = edit.year.trim() ? Number.parseInt(edit.year.trim(), 10) : null;
  edit.saving = true;
  edit.error = undefined;
  renderMain();
  try {
    const updated = await window.omd.updatePackage({
      source: album.source,
      discId: edit.discId.trim(),
      artist: edit.artist.trim(),
      album: edit.album.trim(),
      releaseYear: year,
      trackTitles: edit.tracks.map((t) => ({ number: t.number, title: t.title.trim() })),
      ...(edit.coverSourcePath ? { coverSourcePath: edit.coverSourcePath } : {}),
    });
    if (updated) {
      state.album = updated;
      if (state.nowPlaying?.disc.source === updated.source) {
        state.nowPlaying = { disc: updated, source: 'album' };
        renderNowPlayingBar();
      }
    }
    state.albumEdit = undefined;
  } catch (err) {
    edit.saving = false;
    edit.error = (err as Error).message;
  }
  if (state.view === 'catalog') renderMain();
}

async function reverify(): Promise<void> {
  if (!state.disc) return;
  const source = state.disc.source;
  state.verify = undefined;
  state.reverifying = true;
  if (state.view === 'disc') renderMain();
  try {
    state.verify = await window.omd.verifyDisc(source);
  } catch (err) {
    state.discError = (err as Error).message;
  }
  state.reverifying = false;
  if (state.nowPlaying?.source === 'disc') renderNowPlayingBar();
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
  if (state.view === 'catalog') renderMain();
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
  if (!ab || !ab.selectedDrive || !state.album) return;
  const album = state.album;
  const drive = ab.selectedDrive;
  const confirmed = window.confirm(
    `Burn "${album.discId}" to ${drive}?\n\nA rewritable disc will be erased first.`,
  );
  if (!confirmed) return;
  ab.burning = true;
  ab.phase = 'Starting...';
  renderMain();
  try {
    const result = await window.omd.burn(
      { packageDir: album.source, driveMountPath: drive, blank: true, verify: true, eject: true },
      (progress) => {
        if (state.albumBurn) {
          state.albumBurn.phase = burnPhaseLabel(progress.phase);
          if (state.view === 'catalog') renderMain();
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
  if (state.view === 'catalog') renderMain();
}

function formatClock(seconds: number): string {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function trackPanel(
  disc: StudioDiscInfo,
  currentIndex: number,
  onPlay: (index: number) => void,
): HTMLElement {
  const list = el('ol', { class: 'track-list' });
  disc.tracks.forEach((track, index) => {
    const selected = index === currentIndex;
    const row = el(
      'button',
      {
        class: `track-row${selected ? ' selected' : ''}`,
        type: 'button',
        onclick: () => onPlay(index),
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

/** The shared album detail (art | info | track list [+ usage]) used by Disc and Catalog. */
function albumDetail(disc: StudioDiscInfo, source: 'disc' | 'album'): HTMLElement[] {
  const pstate = player.getState();
  lastPlayerKey = `${pstate.order[pstate.position] ?? -1}|${pstate.status}`;
  const active = state.nowPlaying?.disc.source === disc.source;
  const currentIndex = active ? (pstate.order[pstate.position] ?? -1) : -1;
  const playing = active && pstate.status === 'playing';

  const rows: HTMLElement[] = [];
  if (disc.releaseYear) rows.push(kvRow('Year', String(disc.releaseYear)));
  rows.push(
    kvRow('Disc ID', disc.discId),
    kvRow('Tracks', String(disc.trackCount)),
    kvRow('Total time', formatClock(disc.totalDurationSeconds)),
    kvRow('Format', disc.audioCodec),
  );
  if (disc.audioBitDepth) rows.push(kvRow('Bit depth', `${disc.audioBitDepth}-bit`));
  if (disc.audioSampleRate) rows.push(kvRow('Sample rate', `${formatKHz(disc.audioSampleRate)} kHz`));
  if (disc.discFormat) rows.push(kvRow('Disc', disc.discFormat));

  const verifying = source === 'disc' && state.reverifying === true;
  const verified = source === 'disc' && state.verify ? state.verify.valid : disc.valid;
  const badge = verifying
    ? el('span', { class: 'npd-chip' }, [
        el('span', { class: 'spinner', 'aria-hidden': 'true' }),
        'Verifying...',
      ])
    : el('span', { class: `npd-chip${verified ? ' verified' : ''}` }, [
        svgIcon('check'),
        verified ? 'Verified' : 'Not verified',
      ]);

  const actions: HTMLElement[] = [
    btn(playing ? 'Pause' : 'Play', () => playFrom(disc, source), {
      primary: true,
      small: true,
      icon: playing ? 'pause' : 'play',
    }),
  ];
  if (source === 'disc') {
    actions.push(btn('Rip to Catalog', () => void ripToCatalog(), { icon: 'rip', small: true }));
  } else {
    actions.push(
      btn('Burn to Disc', () => void openAlbumBurn(), {
        icon: 'create',
        small: true,
        disabled: !disc.valid,
      }),
      btn('Edit', () => startEditAlbum(disc), { icon: 'label', small: true }),
      btn('Show in folder', () => void window.omd.revealInFolder(disc.source), { small: true }),
    );
  }

  const albumCol = el('div', { class: 'album-col' }, [
    el('div', { class: 'album-art' }, [
      disc.coverDataUri
        ? el('img', { src: disc.coverDataUri, alt: 'Cover art' })
        : el('span', { class: 'album-art-empty' }, [svgIcon('note', 64)]),
    ]),
    el('div', { class: 'album-heading' }, [
      el('div', { class: 'album-title', text: disc.album }),
      el('div', { class: 'album-artist', text: disc.artist }),
    ]),
  ]);

  const meta = el('div', { class: 'album-meta' }, [
    el('dl', { class: 'kv-list' }, rows),
    el('div', { class: 'player-badges' }, [
      badge,
      el('span', { class: 'npd-chip flac' }, [svgIcon('wave'), 'FLAC lossless']),
    ]),
  ]);

  const actionsRow = el('div', { class: 'disc-actions' }, [
    el('div', { class: 'bc-actions' }, actions),
    ...(source === 'disc' && state.ripStatus ? [ripStatusEl(state.ripStatus)] : []),
  ]);

  const discMain = el('div', { class: 'disc-main' }, [albumCol, meta, actionsRow]);

  const layout = el('div', { class: 'disc-layout' }, [
    discMain,
    trackPanel(disc, currentIndex, (index) => playFrom(disc, source, index)),
  ]);

  return [
    el('section', { class: 'card' }, [layout]),
    ...(source === 'album' && state.albumBurn
      ? [el('section', { class: 'card' }, [albumBurnPanel()])]
      : []),
    ...(disc.discCapacityBytes ? [discUsageCard(disc)] : []),
  ];
}

function playerView(): HTMLElement {
  const pstate = player.getState();
  lastPlayerKey = `${pstate.order[pstate.position] ?? -1}|${pstate.status}`;

  if (!state.disc) {
    const hero: (Node | string)[] = [
      el('span', { class: 'select-icon disc-empty-icon' }, [svgIcon('disc', 56)]),
      el('h2', { class: 'select-title', text: 'No disc inserted' }),
      el('p', {
        class: 'select-lead',
        text: 'Insert a burned OMD disc and it will load here automatically.',
      }),
      state.discLoading ? spinnerRow('Reading disc\u2026') : spinnerRow('Watching the drive\u2026'),
      el('div', { class: 'bc-actions' }, [btn('Scan again', () => void detectDisc(), { small: true })]),
    ];
    if (state.discError) hero.push(el('p', { class: 'select-lead muted', text: state.discError }));
    return el('div', { class: 'view' }, [
      el('section', { class: 'card' }, [el('div', { class: 'select-hero disc-empty' }, hero)]),
    ]);
  }

  return el('div', { class: 'view' }, albumDetail(state.disc, 'disc'));
}

function formatKHz(hz: number): string {
  const khz = hz / 1000;
  return Number.isInteger(khz) ? String(khz) : khz.toFixed(1);
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

/** Derive the media family (CD/DVD/BD) and writability (R/RW/RE) for the badge. */
function mediaBadge(disc: StudioDiscInfo): { family: string; write: string } | null {
  const type = (disc.discMediaType ?? disc.discFormat ?? '').toUpperCase();
  const family = type.includes('BD') || type.includes('BLU')
    ? 'BD'
    : type.includes('DVD')
      ? 'DVD'
      : type.includes('CD')
        ? 'CD'
        : '';
  if (!family) return null;
  const write = type.includes('RE')
    ? 'RE'
    : type.includes('RW')
      ? 'RW'
      : disc.discRewritable === true
        ? 'RW'
        : 'R';
  return { family, write };
}

function cartridgeVisual(disc: StudioDiscInfo): HTMLElement {
  const badge = mediaBadge(disc);
  const children: (Node | string)[] = [
    el('img', { class: 'cartridge-img', src: cartridgeFor(state.themeId), alt: 'OMD cartridge' }),
  ];
  if (badge || disc.discCapacityBytes) {
    const rows: HTMLElement[] = [];
    if (badge) {
      rows.push(el('span', { class: 'cartridge-type', text: `${badge.family}\u2011${badge.write}` }));
    }
    if (disc.discCapacityBytes) {
      rows.push(el('span', { class: 'cartridge-size', text: formatBytes(disc.discCapacityBytes) }));
    }
    children.push(el('span', { class: 'cartridge-badge' }, rows));
  }
  return el('div', { class: 'cartridge' }, children);
}

function discUsageCard(disc: StudioDiscInfo): HTMLElement {
  const capacity = disc.discCapacityBytes ?? 0;
  const used = disc.totalSizeBytes;
  const free = Math.max(0, capacity - used);
  const pct = capacity > 0 ? Math.min(100, (used / capacity) * 100) : 0;
  const fill = el('div', { class: 'meter-fill' });
  fill.style.width = `${pct.toFixed(1)}%`;
  return el('section', { class: 'card' }, [
    el('div', { class: 'disc-media' }, [
      cartridgeVisual(disc),
      el('div', { class: 'disc-usage' }, [
        el('div', { class: 'storage-stat' }, [
          el('div', { class: 'label', text: 'Used' }),
          el('div', { class: 'value', text: formatBytes(used) }),
        ]),
        el('div', { class: 'meter-wrap' }, [
          el('div', { class: 'meter', role: 'progressbar', 'aria-label': 'Disc usage' }, [fill]),
          el('div', {
            class: 'meter-caption',
            text: `${disc.discFormat ?? 'Disc'} \u00b7 ${formatBytes(capacity)} capacity`,
          }),
        ]),
        el('div', { class: 'storage-stat' }, [
          el('div', { class: 'label', text: 'Free' }),
          el('div', { class: 'value', text: formatBytes(free) }),
        ]),
      ]),
    ]),
  ]);
}

function spinnerRow(text: string): HTMLElement {
  return el('div', { class: 'spinner-row' }, [
    el('span', { class: 'spinner', 'aria-hidden': 'true' }),
    el('span', { text }),
  ]);
}

/** A reusable "in progress" badge: a spinner inside a neutral status pill. */
function busyPill(label: string): HTMLElement {
  return el('span', { class: 'status-pill neutral busy' }, [
    el('span', { class: 'spinner', 'aria-hidden': 'true' }),
    label,
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

/** Import FLAC album folder(s) from disk into the catalog library. */
async function runImport(): Promise<void> {
  let dir = state.libraryDir;
  if (!dir) {
    const chosen = await window.omd.chooseLibraryFolder();
    if (!chosen) return;
    setCatalogDir(chosen);
    dir = chosen;
  }
  state.importStatus = { busy: true };
  if (state.view === 'catalog') renderMain();
  try {
    const result = await window.omd.importToCatalog({ destDir: dir }, (progress) => {
      if (state.importStatus?.busy) {
        state.importStatus.progress = progress;
        if (state.view === 'catalog' && !state.album) renderMain();
      }
    });
    if (result.canceled) {
      state.importStatus = undefined;
    } else {
      state.importStatus = { busy: false, result };
      await rescanLibrary();
    }
  } catch (err) {
    state.importStatus = {
      busy: false,
      result: {
        total: 0,
        imported: 0,
        skipped: 0,
        failed: 1,
        items: [{ album: 'Import', ok: false, error: (err as Error).message }],
      },
    };
  }
  if (state.view === 'catalog') renderMain();
}

function importStatusEl(status: NonNullable<AppState['importStatus']>): HTMLElement {
  if (status.busy) {
    const p = status.progress;
    const text = p
      ? `Importing ${p.index + 1} of ${p.total}: ${p.album}`
      : 'Scanning for FLAC albums\u2026';
    return el('div', { class: 'rip-status' }, [busyPill('IMPORTING'), el('span', { class: 'rip-status-text', text })]);
  }
  const result = status.result;
  if (!result) return el('div');
  const ok = result.failed === 0 && result.total > 0;
  const summary =
    result.total === 0
      ? 'No FLAC albums found in that folder.'
      : `Imported ${result.imported}` +
        (result.skipped ? `, skipped ${result.skipped} already in catalog` : '') +
        (result.failed ? `, ${result.failed} failed` : '') +
        '.';
  return el('div', { class: 'rip-status' }, [
    el('span', { class: `status-pill ${ok ? 'ok' : result.total === 0 ? 'neutral' : 'bad'}` }, [
      el('span', { class: 'status-dot', 'aria-hidden': 'true' }),
      result.total === 0 ? 'NOTHING' : ok ? 'IMPORTED' : 'PARTIAL',
    ]),
    el('span', { class: 'rip-status-text', text: summary }),
    el(
      'button',
      {
        class: 'link-btn',
        type: 'button',
        onclick: () => {
          state.importStatus = undefined;
          renderMain();
        },
      },
      ['Dismiss'],
    ),
  ]);
}

/** Play a catalog package immediately (loads the full package, then plays). */
async function playCatalogEntry(entry: CatalogEntry): Promise<void> {
  try {
    const disc = await window.omd.openDisc(entry.source);
    if (disc) playFrom(disc, 'album');
  } catch {
    // Ignore; a failed open just does nothing.
  }
}

/** Delete a catalog package from disk after confirmation. */
async function deleteCatalogEntry(entry: CatalogEntry): Promise<void> {
  const ok = window.confirm(
    `Delete "${entry.discId}" from your catalog?\n\nThis permanently removes the package folder:\n${entry.source}`,
  );
  if (!ok) return;
  try {
    await window.omd.deletePackage(entry.source);
  } catch (err) {
    state.catalogError = (err as Error).message;
  }
  if (state.album?.source === entry.source) state.album = undefined;
  if (state.nowPlaying?.disc.source === entry.source) {
    state.nowPlaying = undefined;
    player.loadDisc([]);
    renderNowPlayingBar();
  }
  await rescanLibrary();
}

function catalogCard(entry: CatalogEntry): HTMLElement {
  const cover = entry.coverDataUri
    ? el('img', {
        class: 'ct-cover',
        src: entry.coverDataUri,
        alt: 'Cover art',
        onclick: () => void openAlbum(entry.source),
      })
    : el(
        'span',
        { class: 'ct-cover ct-cover-empty', onclick: () => void openAlbum(entry.source) },
        [svgIcon('note', 34)],
      );
  const body = el('div', { class: 'ct-body', onclick: () => void openAlbum(entry.source) }, [
    el('div', { class: 'ct-title', text: entry.discId }),
    el('div', { class: 'ct-sub', text: `${entry.artist} \u2014 ${entry.album}` }),
    el('div', { class: 'ct-sub', text: `${entry.trackCount} tracks` }),
  ]);
  const playIcon = svgIcon('play', 16);
  const trashIcon = svgIcon('trash', 16);
  const actions = el('div', { class: 'ct-actions' }, [
    el(
      'button',
      { class: 'ct-btn play', type: 'button', onclick: () => void playCatalogEntry(entry) },
      [playIcon, 'Play'],
    ),
    el('button', { class: 'ct-btn ghost', type: 'button', onclick: () => void openAlbum(entry.source) }, [
      'Open',
    ]),
    el(
      'button',
      {
        class: 'ct-btn danger ct-icon',
        type: 'button',
        title: 'Delete from catalog',
        'aria-label': 'Delete from catalog',
        onclick: () => void deleteCatalogEntry(entry),
      },
      [trashIcon],
    ),
  ]);
  return el('div', { class: 'catalog-tile' }, [cover, body, actions]);
}

/** A reusable inline notice banner (error/warning/info). */
function notice(kind: 'error' | 'warning' | 'info', text: string): HTMLElement {
  return el('div', { class: `notice notice-${kind}`, role: 'alert' }, [
    el('span', { class: 'notice-dot', 'aria-hidden': 'true' }),
    el('span', { class: 'notice-text', text }),
  ]);
}

/** Validate one metadata field against the manifest schema; returns a message or undefined. */
function fieldError(key: 'discId' | 'artist' | 'album' | 'year', value: string): string | undefined {
  const v = value.trim();
  if (key === 'discId') {
    if (!v) return 'Required.';
    if (v.length > 200) return 'Must be 200 characters or fewer.';
    return undefined;
  }
  if (key === 'artist' || key === 'album') {
    return v ? undefined : 'Required.';
  }
  // year
  if (!v) return undefined;
  if (!/^\d{1,4}$/.test(v)) return 'Use a 4-digit year.';
  const n = Number.parseInt(v, 10);
  if (n < 1900 || n > 2200) return 'Must be between 1900 and 2200.';
  return undefined;
}

function editField(label: string, key: 'discId' | 'artist' | 'album' | 'year'): HTMLElement {
  const edit = state.albumEdit!;
  const extra: Record<string, string> =
    key === 'year'
      ? { inputmode: 'numeric', placeholder: 'e.g. 2009', maxlength: '4' }
      : key === 'discId'
        ? { maxlength: '200' }
        : {};
  const initialErr = edit.showErrors ? fieldError(key, edit[key]) : undefined;
  const input = el('input', {
    class: `edit-input${initialErr ? ' invalid' : ''}`,
    type: 'text',
    value: edit[key],
    ...extra,
  }) as HTMLInputElement;
  const errorSpan = el('span', { class: 'edit-error', text: initialErr ?? '' });
  const apply = (msg: string | undefined): void => {
    errorSpan.textContent = msg ?? '';
    input.classList.toggle('invalid', Boolean(msg));
  };
  input.addEventListener('input', () => {
    edit[key] = input.value;
    // Clear a shown error as soon as the field becomes valid again.
    if (input.classList.contains('invalid')) apply(fieldError(key, edit[key]));
  });
  input.addEventListener('blur', () => apply(fieldError(key, edit[key])));
  return el('label', { class: 'edit-field' }, [
    el('span', { class: 'edit-label', text: label }),
    input,
    errorSpan,
  ]);
}

function editTrackRow(index: number): HTMLElement {
  const edit = state.albumEdit!;
  const track = edit.tracks[index]!;
  const initialInvalid = edit.showErrors && track.title.trim().length === 0;
  const input = el('input', {
    class: `edit-input${initialInvalid ? ' invalid' : ''}`,
    type: 'text',
    value: track.title,
    'aria-label': `Track ${track.number} title`,
  }) as HTMLInputElement;
  const mark = (): void => {
    input.classList.toggle('invalid', input.value.trim().length === 0);
  };
  input.addEventListener('input', () => {
    edit.tracks[index]!.title = input.value;
    if (input.classList.contains('invalid')) mark();
  });
  input.addEventListener('blur', mark);
  return el('div', { class: 'edit-track-row' }, [
    el('span', { class: 'edit-track-num', text: String(track.number) }),
    input,
  ]);
}

/** The metadata editor for the opened catalog album (art + fields + top Save/Cancel). */
function albumEditView(disc: StudioDiscInfo): HTMLElement {
  const edit = state.albumEdit!;
  const cover = edit.coverPreview ?? disc.coverDataUri;
  const art = el('div', { class: 'album-col' }, [
    el('div', { class: 'album-art' }, [
      cover
        ? el('img', { src: cover, alt: 'Cover art' })
        : el('span', { class: 'album-art-empty' }, [svgIcon('note', 64)]),
    ]),
    el('div', { class: 'bc-actions' }, [
      btn('Replace cover\u2026', () => void chooseCover(), { icon: 'note', small: true }),
    ]),
  ]);

  const form = el('div', { class: 'album-meta edit-form' }, [
    editField('Album', 'album'),
    editField('Artist', 'artist'),
    editField('Year', 'year'),
    editField('Disc title', 'discId'),
    el('div', { class: 'edit-tracks' }, [
      el('span', { class: 'edit-label', text: 'Track titles' }),
      ...edit.tracks.map((_track, index) => editTrackRow(index)),
    ]),
  ]);

  const cancel = (): void => {
    state.albumEdit = undefined;
    renderMain();
  };
  const topbar = el('div', { class: 'edit-topbar' }, [
    btn('Back to album', cancel, { small: true, icon: 'chevron-left' }),
    el('div', { class: 'edit-topbar-actions' }, [
      btn(edit.saving ? 'Saving\u2026' : 'Save', () => void saveEdit(), {
        primary: true,
        icon: 'check',
        disabled: edit.saving,
      }),
      btn('Cancel', cancel, { small: true }),
    ]),
  ]);

  const children: (Node | string)[] = [topbar];
  if (edit.error) children.push(notice('error', edit.error));
  children.push(el('section', { class: 'card' }, [el('div', { class: 'disc-main' }, [art, form])]));
  return el('div', { class: 'view' }, children);
}

function catalogView(): HTMLElement {
  if (state.albumLoading) {
    return el('div', { class: 'view' }, [
      el('section', { class: 'card' }, [spinnerRow('Opening album\u2026')]),
    ]);
  }
  if (state.album && state.albumEdit) {
    return albumEditView(state.album);
  }
  if (state.album) {
    const back = el('div', { class: 'bc-actions' }, [
      btn(
        'Back to catalog',
        () => {
          state.album = undefined;
          state.albumBurn = undefined;
          renderMain();
        },
        { small: true, icon: 'chevron-left' },
      ),
    ]);
    return el('div', { class: 'view' }, [back, ...albumDetail(state.album, 'album')]);
  }

  const actions = el('div', { class: 'bc-actions' }, [
    btn('Choose library folder\u2026', () => void chooseLibrary(), { primary: true, icon: 'catalog' }),
    btn('Import music\u2026', () => void runImport(), { icon: 'note' }),
  ]);
  const body: (Node | string)[] = [actions];
  if (state.libraryDir) body.push(el('p', { class: 'burn-source-path', text: state.libraryDir }));
  if (state.importStatus) body.push(importStatusEl(state.importStatus));
  if (state.albumError) body.push(el('p', { class: 'select-lead muted', text: state.albumError }));

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

  return el('div', { class: 'view' }, [el('section', { class: 'card' }, body)]);
}

function viewFor(view: ViewId): HTMLElement {
  switch (view) {
    case 'burn':
      return renderBurnView({ onOpenPlayer: (source) => void openAlbum(source) });
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
  window.omd.onDiscChanged(onDiscChanged);
  window.omd.onLibraryChanged(() => {
    // The library folder changed on disk; refresh the grid when it is showing.
    if (state.view === 'catalog' && !state.album) void rescanLibrary();
  });
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
