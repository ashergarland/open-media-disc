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
  StudioAudioCodec,
  StudioBurnResult,
  StudioDiscInfo,
  StudioDrive,
  StudioImportProgress,
  StudioImportResult,
  StudioInfo,
  StudioMixtapeAlbum,
  StudioRipProgress,
  StudioSourceDraft,
  StudioVerifyResult,
} from '../shared/types';
import { STUDIO_AUDIO_CODECS } from '../shared/types';
import { clearChildren, el, svgIcon, type IconName } from './dom';
import { renderNowPlaying, updateNowPlaying } from './nowPlaying';
import { renderLabelsView } from './labelsView';
import * as player from './audioController';

declare global {
  interface Window {
    omd: OmdStudioApi;
  }
}

type ViewId = 'home' | 'burn' | 'labels' | 'disc' | 'catalog' | 'themes' | 'settings';

interface NavItem {
  id: ViewId;
  label: string;
  icon: IconName;
}

const NAV: NavItem[] = [
  { id: 'home', label: 'Home', icon: 'home' },
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
  /** True while a background integrity verify of the opened catalog album runs. */
  albumVerifying?: boolean;
  ripStatus?: { busy: boolean; text: string; ok?: boolean; outDir?: string; progress?: StudioRipProgress };
  /** The Create a Disc flow: choose a source package, then burn it. */
  createDisc?: {
    /** The package loaded to burn (a StudioDiscInfo). */
    disc?: StudioDiscInfo;
    loading?: boolean;
    error?: string;
    /** True while showing the catalog package picker. */
    picking?: boolean;
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
  /** Active catalog search query (set from the Home hub search), or undefined for all. */
  catalogQuery?: string;
  importStatus?: { busy: boolean; result?: StudioImportResult };
  /** Per-album import review: edit the metadata and pick a format before committing. */
  importReview?: {
    destDir: string;
    /** Album source folders queued for review, in order. */
    queue: string[];
    index: number;
    total: number;
    loading: boolean;
    draft?: StudioSourceDraft;
    discId: string;
    artist: string;
    album: string;
    year: string;
    tracks: { number: number; title: string; artist: string; album: string; year: string }[];
    /** Whether the per-track metadata section is expanded. */
    tracksExpanded?: boolean;
    /** True when the source folder had more than one distinct track artist. */
    multipleArtists?: boolean;
    codec: StudioAudioCodec;
    detectedCodec?: StudioAudioCodec;
    codecsPresent: StudioAudioCodec[];
    coverSourcePath?: string;
    coverPreview?: string;
    saving?: boolean;
    progress?: StudioImportProgress;
    error?: string;
    showErrors?: boolean;
    tally: { imported: number; skipped: number; failed: number };
    /** Where the flow was launched from (returns/loads there when done). */
    origin?: 'catalog' | 'burn';
    /** The most recently imported package (to burn when origin is 'burn'). */
    lastImported?: StudioDiscInfo;
  };
  /** In-progress mixtape being built from catalog tracks. */
  mixtape?: {
    name: string;
    artist: string;
    coverSourcePath?: string;
    coverPreview?: string;
    tracks: { sourcePath: string; title: string; from: string }[];
    sources?: StudioMixtapeAlbum[];
    loading?: boolean;
    saving?: boolean;
    error?: string;
    /** Where the flow was launched from (returns/loads there when done). */
    origin?: 'catalog' | 'burn';
  };
}

const THEME_STORAGE_KEY = 'omd.themeId';

interface ThemeOption {
  id: string;
  name: string;
  type: 'Light' | 'Dark';
  swatches: string[];
}

/** The available themes. Each is a token map applied by setting data-theme. */
const THEME_OPTIONS: ThemeOption[] = [
  { id: 'midnight', name: 'Midnight', type: 'Dark', swatches: ['#35c0e0', '#4a7dff', '#1d2836', '#0d131e', '#35d17a'] },
  { id: 'daylight', name: 'Daylight', type: 'Light', swatches: ['#0e9fc4', '#3a6ff0', '#ffffff', '#15212e', '#1f9d57'] },
  { id: 'ember', name: 'Ember', type: 'Dark', swatches: ['#ff8a3d', '#ffb765', '#271f17', '#15110d', '#4cc27a'] },
];

const DEFAULT_THEME_ID = 'midnight';

/** The persisted theme id, falling back to the default when unset or unknown. */
function loadThemeId(): string {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && THEME_OPTIONS.some((entry) => entry.id === saved)) return saved;
  } catch {
    // Reading the theme choice is best-effort.
  }
  return DEFAULT_THEME_ID;
}

/** The brand disc image (shared across themes). */
function logoFor(): string {
  return 'assets/brand-disc.png';
}

/** The cartridge image (a light translucent one on light themes). */
function cartridgeFor(): string {
  const theme = THEME_OPTIONS.find((entry) => entry.id === state.themeId);
  return theme?.type === 'Light' ? 'assets/brand-cartridge-light.png' : 'assets/brand-cartridge.png';
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
  view: 'home',
  themeId: loadThemeId(),
  libraryDir: loadCatalogDir(),
  discLoading: false,
  albumLoading: false,
  catalogLoading: false,
};

const navButtons = new Map<ViewId, HTMLElement>();
let mainEl: HTMLElement;
let shellEl: HTMLElement;
let nowPlayingHost: HTMLElement;
let versionLabel: HTMLElement;
let lastPlayerKey = '';
let lastDockKey = '';

function applyThemeById(id: string): void {
  const themeId = THEME_OPTIONS.some((entry) => entry.id === id) ? id : DEFAULT_THEME_ID;
  // A theme is a token map keyed on data-theme; setting it swaps the --omd-*
  // values instantly (no stylesheet fetch, so no unstyled flash).
  document.documentElement.setAttribute('data-theme', themeId);
  state.themeId = themeId;
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
  // Entering the Catalog or Labels re-scans the library folder so newly
  // ripped/burned/imported packages appear without a manual refresh.
  if ((view === 'catalog' || view === 'labels') && state.libraryDir && !state.album) void rescanLibrary();
  // Entering the Disc view auto-detects an already-inserted disc (no manual scan).
  if (view === 'disc' && !state.disc) void detectDisc(true);
  // The Home hub is full-bleed (no sidebar); every other view keeps the sidebar.
  shellEl?.classList.toggle('app-shell--home', view === 'home');
  renderMain();
}

function renderMain(): void {
  clearChildren(mainEl);
  if (state.view === 'home') {
    mainEl.append(viewFor('home'));
    return;
  }
  mainEl.append(screenFrame(state.view, viewFor(state.view)));
}

/** The title shown in a screen's top bar. */
function screenTitle(view: ViewId): string {
  switch (view) {
    case 'disc':
      return 'Disc';
    case 'catalog':
      return 'Catalog';
    case 'burn':
      return 'Create a Disc';
    case 'labels':
      return 'Labels';
    case 'themes':
      return 'Themes';
    case 'settings':
      return 'Settings';
    default:
      return 'OMD Studio';
  }
}

/** Wrap a view in a full-screen token frame: a sticky top bar plus its content. */
function screenFrame(view: ViewId, content: HTMLElement): HTMLElement {
  const home = el(
    'button',
    { class: 'omd-icon-btn', type: 'button', title: 'Home', 'aria-label': 'Home', onclick: () => setView('home') },
    [svgIcon('home', 22)],
  );
  const topbar = el('div', { class: 'omd-topbar' }, [
    home,
    el('div', { class: 'omd-topbar-title', text: screenTitle(view) }),
  ]);
  return el('div', { class: 'omd-screen' }, [topbar, el('div', { class: 'omd-screen-body' }, [content])]);
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
  if (state.view === 'catalog' && !state.album && !state.mixtape && !state.importReview) {
    updateCatalogPlayButtons();
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

function themesView(): HTMLElement {
  const cards = THEME_OPTIONS.map((theme) => {
    const active = state.themeId === theme.id;
    const swatches = el(
      'div',
      { class: 'omd-theme-swatches' },
      theme.swatches.map((hex) => {
        const chip = el('span', { class: 'omd-swatch' });
        chip.style.setProperty('background', hex);
        return chip;
      }),
    );
    const meta = el('div', { class: 'omd-theme-meta' }, [
      el('div', {}, [
        el('div', { class: 'omd-theme-name', text: theme.name }),
        el('div', { class: 'omd-theme-type', text: theme.type }),
      ]),
      ...(active ? [el('span', { class: 'omd-theme-check' }, [svgIcon('check', 20)])] : []),
    ]);
    return el(
      'button',
      {
        class: `omd-theme-card${active ? ' is-active' : ''}`,
        type: 'button',
        'aria-pressed': active ? 'true' : 'false',
        onclick: () => {
          if (state.themeId === theme.id) return;
          applyThemeById(theme.id);
          renderMain();
        },
      },
      [swatches, meta],
    );
  });
  return el('div', { class: 'omd-stack' }, [
    omdPanel('Appearance', [
      el('p', {
        class: 'omd-muted',
        text: 'Pick a theme. Your choice is saved and restored the next time you open OMD Studio.',
      }),
      el('div', { class: 'omd-theme-grid' }, cards),
    ]),
  ]);
}

/** A titled token panel (card) used by migrated views. */
function omdPanel(title: string, children: (Node | string)[]): HTMLElement {
  return el('section', { class: 'omd-panel' }, [
    el('div', { class: 'omd-panel-title', text: title }),
    ...children,
  ]);
}

/** A token key/value row. */
function omdKv(label: string, value: string): HTMLElement {
  return el('div', { class: 'omd-kv-row' }, [
    el('span', { class: 'omd-kv-label', text: label }),
    el('span', { class: 'omd-kv-value', text: value }),
  ]);
}

function settingsView(): HTMLElement {
  const info = state.info;
  const about = omdPanel(
    'About',
    info
      ? [
          el('div', { class: 'omd-kv' }, [
            omdKv('OMD Studio', `${info.studioVersion} (alpha)`),
            omdKv('Disc format', `${info.omdFormat} v${info.omdVersion}`),
            omdKv('Electron', info.electron),
            omdKv('Node', info.node),
          ]),
        ]
      : [el('p', { class: 'omd-muted', text: 'Loading version info\u2026' })],
  );

  const drives = state.drives;
  const driveBody: (Node | string)[] =
    drives === undefined
      ? [el('p', { class: 'omd-muted', text: 'Scanning\u2026' })]
      : drives.length === 0
        ? [el('p', { class: 'omd-muted', text: 'No optical drives detected (burning is Windows-only).' })]
        : [
            el(
              'div',
              { class: 'omd-kv' },
              drives.map((drive) => omdKv(drive.mountPath, drive.description ?? 'Optical drive')),
            ),
          ];

  return el('div', { class: 'omd-stack' }, [
    about,
    omdPanel('Optical drives', [
      ...driveBody,
      el('div', { class: 'omd-actions' }, [omdBtn('Rescan drives', undefined, () => void rescanDrives())]),
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

async function detectDisc(auto = false): Promise<void> {
  if (state.discLoading || state.disc) return;
  state.discLoading = true;
  if (!auto) state.discError = undefined;
  if (state.view === 'disc') renderMain();
  try {
    const disc = await window.omd.detectDisc();
    if (disc) setDisc(disc);
    else if (!auto) state.discError = 'No OMD disc detected. Insert a burned OMD disc to play it here.';
  } catch (err) {
    if (!auto) state.discError = (err as Error).message;
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
    if (disc) {
      state.album = disc;
      state.albumVerifying = true;
      void verifyOpenedAlbum(source);
    } else {
      state.albumError = 'Could not open the package.';
    }
  } catch (err) {
    state.albumError = (err as Error).message;
  }
  state.albumLoading = false;
  if (state.view === 'catalog') renderMain();
}

/** Verify the opened catalog album's integrity in the background, updating its badge. */
async function verifyOpenedAlbum(source: string): Promise<void> {
  let valid = false;
  try {
    valid = (await window.omd.verifyDisc(source)).valid;
  } catch {
    valid = false;
  }
  if (state.album?.source === source) {
    state.album = { ...state.album, valid };
    state.albumVerifying = false;
    if (state.view === 'catalog' && !state.albumEdit && !state.mixtape && !state.importReview) {
      renderMain();
    }
  } else if (state.albumVerifying) {
    state.albumVerifying = false;
  }
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
      // Refresh the catalog grid so it reflects the edited metadata (otherwise
      // the tile keeps the old name until the catalog is re-entered).
      if (state.libraryDir) void rescanLibrary();
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
  const rip = { busy: true, text: 'Ripping and verifying...' } as NonNullable<AppState['ripStatus']>;
  state.ripStatus = rip;
  if (state.view === 'disc') renderMain();
  try {
    const result = await window.omd.rip(
      {
        source: state.disc.source,
        destDir,
        mode: 'package',
        overwrite,
      },
      (progress) => {
        if (state.ripStatus !== rip) return;
        rip.progress = progress;
        if (state.view === 'disc') renderMain();
      },
    );
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
  if (status.busy) {
    const { fraction, label } = ripProgressInfo(status.progress);
    return omdProgress(fraction, label);
  }
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

async function openCreateDisc(disc?: StudioDiscInfo): Promise<void> {
  state.createDisc = { drives: [], burning: false, ...(disc ? { disc } : {}) };
  setView('burn');
  await loadCreateDiscDrives();
}

/** Ensure the Create a Disc state exists, returning it. */
function ensureCreateDisc(): NonNullable<AppState['createDisc']> {
  if (!state.createDisc) state.createDisc = { drives: [], burning: false };
  return state.createDisc;
}

async function loadCreateDiscDrives(): Promise<void> {
  const cd = state.createDisc;
  if (!cd) return;
  try {
    cd.drives = await window.omd.listDrives();
  } catch {
    cd.drives = [];
  }
  if (!cd.selectedDrive && cd.drives[0]) cd.selectedDrive = cd.drives[0].mountPath;
  if (state.view === 'burn') renderMain();
}

/** Show the catalog package picker inside the burn flow. */
function pickFromCatalogForBurn(): void {
  const cd = ensureCreateDisc();
  cd.picking = true;
  cd.error = undefined;
  renderMain();
  if (state.libraryDir && !state.catalog) void rescanLibrary();
}

/** Load a catalog package source into the burn flow. */
async function loadPackageForBurn(source: string): Promise<void> {
  const cd = ensureCreateDisc();
  cd.picking = false;
  cd.loading = true;
  cd.error = undefined;
  renderMain();
  try {
    const disc = await window.omd.openDisc(source);
    cd.loading = false;
    if (disc) {
      cd.disc = disc;
      void verifyBurnPackage(source);
    } else cd.error = 'Could not read that package.';
  } catch (err) {
    cd.loading = false;
    cd.error = (err as Error).message;
  }
  if (!cd.drives.length) await loadCreateDiscDrives();
  else renderMain();
}

/** Verify the loaded burn package's integrity in the background, updating its badge. */
async function verifyBurnPackage(source: string): Promise<void> {
  let valid = false;
  try {
    valid = (await window.omd.verifyDisc(source)).valid;
  } catch {
    valid = false;
  }
  const cd = state.createDisc;
  if (cd?.disc && cd.disc.source === source) {
    cd.disc = { ...cd.disc, valid };
    if (state.view === 'burn') renderMain();
  }
}

/** Pick an existing OMD package folder to burn. */
async function importPackageForBurn(): Promise<void> {
  const cd = ensureCreateDisc();
  let disc: StudioDiscInfo | null = null;
  try {
    disc = await window.omd.openPackageFolder();
  } catch (err) {
    cd.error = (err as Error).message;
    renderMain();
    return;
  }
  if (!disc) return;
  cd.disc = disc;
  cd.error = undefined;
  if (!cd.drives.length) await loadCreateDiscDrives();
  else renderMain();
}

async function runCreateDiscBurn(): Promise<void> {
  const cd = state.createDisc;
  if (!cd || !cd.disc || !cd.selectedDrive) return;
  const disc = cd.disc;
  const drive = cd.selectedDrive;
  const confirmed = window.confirm(
    `Burn "${disc.discId}" to ${drive}?\n\nA rewritable disc will be erased first.`,
  );
  if (!confirmed) return;
  cd.burning = true;
  cd.phase = 'Starting...';
  renderMain();
  try {
    const result = await window.omd.burn(
      { packageDir: disc.source, driveMountPath: drive, blank: true, verify: true, eject: true },
      (progress) => {
        if (state.createDisc) {
          state.createDisc.phase = burnPhaseLabel(progress.phase);
          if (state.view === 'burn') renderMain();
        }
      },
    );
    if (state.createDisc) {
      state.createDisc.burning = false;
      state.createDisc.result = result;
    }
  } catch (err) {
    if (state.createDisc) {
      state.createDisc.burning = false;
      state.createDisc.result = {
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
  if (state.view === 'burn') renderMain();
}

/** A token drive picker. */
function driveSelect(
  drives: StudioDrive[],
  selected: string | undefined,
  onChange: (value: string) => void,
): HTMLSelectElement {
  const select = el('select', {
    class: 'omd-select',
    onchange: (event: Event) => onChange((event.target as HTMLSelectElement).value),
  }) as HTMLSelectElement;
  for (const drive of drives) {
    select.append(
      el('option', {
        value: drive.mountPath,
        text: drive.description ? `${drive.mountPath} - ${drive.description}` : drive.mountPath,
      }),
    );
  }
  if (selected) select.value = selected;
  return select;
}

/** The Create a Disc source chooser. */
function createDiscChooser(): HTMLElement {
  const choice = (icon: IconName, title: string, sub: string, onClick: () => void): HTMLElement =>
    el('button', { class: 'omd-choice', type: 'button', onclick: onClick }, [
      el('span', { class: 'omd-choice-icon' }, [svgIcon(icon, 32)]),
      el('span', { class: 'omd-choice-body' }, [
        el('span', { class: 'omd-choice-title', text: title }),
        el('span', { class: 'omd-choice-sub', text: sub }),
      ]),
    ]);
  const grid = el('div', { class: 'omd-choice-grid' }, [
    choice('catalog', 'From catalog', 'Burn an album already in your library', () =>
      pickFromCatalogForBurn(),
    ),
    choice('folder', 'Import a package', 'Burn an existing OMD package folder', () =>
      void importPackageForBurn(),
    ),
    choice('note', 'Import music', 'Package a folder of audio, then burn it', () => {
      void runImport('burn');
    }),
    choice('rip', 'New mixtape', 'Compile tracks into a disc, then burn it', () => {
      void startMixtape('burn');
    }),
  ]);
  return el('div', { class: 'omd-stack' }, [
    el('p', { class: 'omd-muted', text: 'Choose what to put on the disc.' }),
    grid,
    ...(state.createDisc?.error ? [notice('error', state.createDisc.error)] : []),
  ]);
}

function burnPickCard(entry: CatalogEntry): HTMLElement {
  const load = (): void => void loadPackageForBurn(entry.source);
  const cover = entry.coverDataUri
    ? el('img', { class: 'omd-album-cover', src: entry.coverDataUri, alt: 'Cover art', onclick: load })
    : el('span', { class: 'omd-album-cover-empty', onclick: load }, [svgIcon('note', 40)]);
  const body = el('div', { class: 'omd-album-body', onclick: load }, [
    el('div', { class: 'omd-album-title', text: entry.discId }),
    el('div', { class: 'omd-album-sub', text: `${entry.artist} - ${entry.album}` }),
  ]);
  const actions = el('div', { class: 'omd-album-actions' }, [
    el('button', { class: 'omd-chip-btn', type: 'button', onclick: load }, [svgIcon('create', 15), 'Select']),
  ]);
  return el('div', { class: 'omd-album-card' }, [cover, body, actions]);
}

/** Pick a package from the catalog to burn. */
function createDiscCatalogPicker(): HTMLElement {
  const back = el('div', { class: 'omd-actions' }, [
    omdBtn('Back', 'chevron-left', () => {
      if (state.createDisc) state.createDisc.picking = false;
      renderMain();
    }),
  ]);
  let results: HTMLElement;
  if (!state.libraryDir) {
    results = el('div', { class: 'omd-scroll' }, [
      el('div', { class: 'omd-empty' }, [
        el('div', { class: 'omd-empty-title', text: 'No library folder' }),
        el('p', { class: 'omd-empty-sub', text: 'Choose your catalog folder to list packages.' }),
        el('div', { class: 'omd-actions' }, [
          omdBtn('Choose library folder', 'catalog', () => void chooseLibrary()),
        ]),
      ]),
    ]);
  } else if (state.catalogLoading) {
    results = el('div', { class: 'omd-scroll' }, [spinnerRow('Scanning\u2026')]);
  } else if (state.catalog && state.catalog.length > 0) {
    const grid = el('div', { class: 'omd-grid' });
    for (const entry of state.catalog) grid.append(burnPickCard(entry));
    results = el('div', { class: 'omd-scroll' }, [grid]);
  } else {
    results = el('div', { class: 'omd-scroll' }, [
      el('p', { class: 'omd-muted', text: 'No packages in your library yet.' }),
    ]);
  }
  return el('div', { class: 'omd-stack omd-fill' }, [back, results]);
}

function createDiscBurnPanel(): HTMLElement {
  const cd = state.createDisc!;
  if (cd.result) {
    const good = cd.result.ok;
    const detail = good
      ? `Burned and verified${cd.result.ejected ? ' and ejected' : ''}.`
      : cd.result.error ?? 'The burn failed and the disc was left in the drive.';
    return omdPanel('Burn to disc', [
      notice(good ? 'info' : 'error', detail),
      el('div', { class: 'omd-actions' }, [
        omdBtn(
          'Burn another copy',
          'create',
          () => {
            cd.result = undefined;
            cd.burning = false;
            renderMain();
          },
          { primary: true },
        ),
        omdBtn('Done', undefined, () => {
          state.createDisc = undefined;
          setView('home');
        }),
      ]),
    ]);
  }
  if (cd.burning) {
    return omdPanel('Burning', [
      el('p', { class: 'omd-muted', text: cd.phase ?? 'Working\u2026' }),
      el('div', { class: 'omd-progress', role: 'progressbar', 'aria-label': 'Burn progress' }, [
        el('span', { class: 'omd-progress-fill' }),
      ]),
    ]);
  }
  const noDrive = cd.drives.length === 0;
  return omdPanel('Burn to disc', [
    el('div', { class: 'omd-drive-row' }, [
      svgIcon('drive', 22),
      noDrive
        ? el('span', { class: 'omd-muted', text: 'No optical drive detected' })
        : driveSelect(cd.drives, cd.selectedDrive, (value) => {
            cd.selectedDrive = value;
          }),
      el('span', { class: 'omd-muted', text: 'DVD-RW \u00b7 1.4 GB' }),
    ]),
    el('p', {
      class: 'omd-muted',
      text: noDrive
        ? 'Insert a rewritable disc in an optical drive. Burning is Windows-only.'
        : 'Blanks a rewritable disc, writes this album, then verifies it.',
    }),
    el('div', { class: 'omd-actions' }, [
      omdBtn('Burn to Disc', 'create', () => void runCreateDiscBurn(), {
        primary: true,
        disabled: noDrive || !cd.selectedDrive,
      }),
    ]),
  ]);
}

/** The burn screen for a loaded package: summary + burn controls. */
function createDiscBurn(disc: StudioDiscInfo): HTMLElement {
  const cd = state.createDisc!;
  const change = el('div', { class: 'omd-actions' }, [
    omdBtn('Change source', 'chevron-left', () => {
      state.createDisc = {
        drives: cd.drives,
        burning: false,
        ...(cd.selectedDrive ? { selectedDrive: cd.selectedDrive } : {}),
      };
      renderMain();
    }),
  ]);

  const facts: string[] = [
    `${disc.trackCount} tracks`,
    formatClock(disc.totalDurationSeconds),
    disc.audioCodec,
    disc.audioLossless ? 'Lossless' : 'Lossy',
  ];
  const summary = el('div', { class: 'omd-album-head' }, [
    el('div', { class: 'omd-album-hero-art' }, [
      disc.coverDataUri
        ? el('img', { src: disc.coverDataUri, alt: 'Cover art' })
        : el('span', { class: 'omd-album-hero-empty' }, [svgIcon('note', 56)]),
    ]),
    el('div', { class: 'omd-album-info' }, [
      el('div', { class: 'omd-album-name', text: disc.album }),
      el('div', { class: 'omd-album-by', text: disc.artist }),
      el('div', { class: 'omd-facts' }, facts.map((f) => el('span', { class: 'omd-fact', text: f }))),
      el('div', { class: 'omd-badges' }, [
        el('span', { class: `omd-badge${disc.valid ? ' ok' : ''}` }, [
          svgIcon('check', 16),
          disc.valid ? 'Valid package' : 'Not valid',
        ]),
      ]),
    ]),
  ]);

  return el('div', { class: 'omd-stack' }, [change, summary, createDiscBurnPanel()]);
}

/** The Create a Disc view: source chooser, then a populated burn screen. */
function createDiscView(): HTMLElement {
  // Import-music and new-mixtape flows launched from here render in place, so
  // the user is not jarred over to the Catalog view.
  if (state.mixtape) return mixtapeView();
  if (state.importReview) return importReviewView();
  const cd = state.createDisc;
  if (!cd) return createDiscChooser();
  if (cd.loading) return el('div', { class: 'omd-stack' }, [spinnerRow('Loading package\u2026')]);
  if (cd.picking) return createDiscCatalogPicker();
  if (cd.disc) return createDiscBurn(cd.disc);
  return createDiscChooser();
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
  const summary = `${disc.trackCount} tracks \u00b7 ${formatClock(disc.totalDurationSeconds)}`;
  const rows = el('div', { class: 'omd-tracklist-rows' });
  const list = el('div', { class: 'omd-tracklist' }, [
    el('div', { class: 'omd-tracklist-head' }, [
      el('span', { text: 'Tracks' }),
      el('span', { class: 'omd-muted', text: summary }),
    ]),
    rows,
  ]);
  disc.tracks.forEach((track, index) => {
    const selected = index === currentIndex;
    const row = el(
      'button',
      {
        class: `omd-track${selected ? ' selected' : ''}`,
        type: 'button',
        onclick: () => onPlay(index),
      },
      [
        el('span', { class: 'omd-track-num', text: String(track.number) }),
        el('span', { class: 'omd-track-name', text: track.title }),
        el('span', {
          class: 'omd-track-time',
          text: track.durationSeconds !== undefined ? formatClock(track.durationSeconds) : '',
        }),
      ],
    );
    if (selected) row.setAttribute('aria-current', 'true');
    rows.append(row);
  });
  return list;
}

/** A token action button used across migrated views. */
function omdBtn(
  label: string,
  icon: IconName | undefined,
  onClick: () => void,
  opts?: { primary?: boolean; disabled?: boolean },
): HTMLButtonElement {
  const children: (Node | string)[] = [];
  if (icon) children.push(svgIcon(icon, 18));
  children.push(label);
  return el(
    'button',
    {
      class: `omd-btn${opts?.primary ? ' omd-btn--primary' : ''}`,
      type: 'button',
      disabled: opts?.disabled ? true : null,
      onclick: onClick,
    },
    children,
  ) as HTMLButtonElement;
}

/** The shared album detail (art | info | track list [+ usage]) used by Disc and Catalog. */
function albumDetail(disc: StudioDiscInfo, source: 'disc' | 'album'): HTMLElement[] {
  const pstate = player.getState();
  lastPlayerKey = `${pstate.order[pstate.position] ?? -1}|${pstate.status}`;
  const active = state.nowPlaying?.disc.source === disc.source;
  const currentIndex = active ? (pstate.order[pstate.position] ?? -1) : -1;
  const playing = active && pstate.status === 'playing';

  const facts: string[] = [
    `${disc.trackCount} tracks`,
    formatClock(disc.totalDurationSeconds),
    disc.audioCodec,
    disc.audioLossless ? 'Lossless' : 'Lossy',
  ];
  if (disc.audioSampleRate) facts.push(`${formatKHz(disc.audioSampleRate)} kHz`);
  if (disc.audioBitDepth) facts.push(`${disc.audioBitDepth}-bit`);
  if (disc.audioBitrate) facts.push(`${Math.round(disc.audioBitrate / 1000)} kbps`);
  if (disc.releaseYear) facts.push(String(disc.releaseYear));
  if (disc.discFormat) facts.push(disc.discFormat);

  const verifying =
    (source === 'disc' && state.reverifying === true) ||
    (source === 'album' && state.albumVerifying === true);
  const verified = source === 'disc' && state.verify ? state.verify.valid : disc.valid;
  const badge = verifying
    ? el('span', { class: 'omd-verify', role: 'status' }, [
        el('span', { class: 'omd-verify-label', text: 'Verifying integrity\u2026' }),
        el('span', { class: 'omd-verify-bar', 'aria-hidden': 'true' }, [
          el('span', { class: 'omd-verify-bar-fill' }),
        ]),
      ])
    : el('span', { class: `omd-badge${verified ? ' ok' : ''}` }, [
        svgIcon('check', 16),
        verified ? 'Verified' : 'Not verified',
      ]);

  const actions: HTMLElement[] = [
    omdBtn(playing ? 'Pause' : 'Play', playing ? 'pause' : 'play', () => playFrom(disc, source), {
      primary: true,
    }),
  ];
  if (source === 'disc') {
    actions.push(omdBtn('Rip to Catalog', 'rip', () => void ripToCatalog()));
  } else {
    actions.push(
      omdBtn('Burn to Disc', 'create', () => void openCreateDisc(disc), { disabled: !disc.valid }),
      omdBtn('Edit', 'label', () => startEditAlbum(disc)),
      omdBtn('Show in folder', 'folder', () => void window.omd.revealInFolder(disc.source)),
    );
  }

  const heroArt = el('div', { class: 'omd-album-hero-art' }, [
    disc.coverDataUri
      ? el('img', { src: disc.coverDataUri, alt: 'Cover art' })
      : el('span', { class: 'omd-album-hero-empty' }, [svgIcon('note', 56)]),
  ]);

  const info = el('div', { class: 'omd-album-info' }, [
    el('div', { class: 'omd-album-name', text: disc.album }),
    el('div', { class: 'omd-album-by', text: disc.artist }),
    el('div', { class: 'omd-facts' }, facts.map((f) => el('span', { class: 'omd-fact', text: f }))),
    el('div', { class: 'omd-badges' }, [badge]),
    el('div', { class: 'omd-actions' }, actions),
    ...(source === 'disc' && state.ripStatus ? [ripStatusEl(state.ripStatus)] : []),
  ]);

  const albumBlock = el('div', { class: 'omd-album' }, [
    el('div', { class: 'omd-album-head' }, [heroArt, info]),
    trackPanel(disc, currentIndex, (index) => playFrom(disc, source, index)),
  ]);

  return [
    albumBlock,
    ...(disc.discCapacityBytes ? [discUsageCard(disc)] : []),
  ];
}

function playerView(): HTMLElement {
  const pstate = player.getState();
  lastPlayerKey = `${pstate.order[pstate.position] ?? -1}|${pstate.status}`;

  if (!state.disc) {
    const hero: (Node | string)[] = [
      el('span', { class: 'omd-empty-icon' }, [svgIcon('disc', 56)]),
      el('div', { class: 'omd-empty-title', text: 'No disc inserted' }),
      el('p', {
        class: 'omd-empty-sub',
        text: 'Insert a burned OMD disc and it will load here automatically.',
      }),
      state.discLoading ? spinnerRow('Reading disc\u2026') : spinnerRow('Watching the drive\u2026'),
      el('div', { class: 'omd-actions' }, [omdBtn('Scan again', undefined, () => void detectDisc())]),
    ];
    if (state.discError) hero.push(el('p', { class: 'omd-muted', text: state.discError }));
    return el('div', { class: 'omd-stack' }, [el('div', { class: 'omd-empty' }, hero)]);
  }

  return el('div', { class: 'omd-stack omd-fill' }, albumDetail(state.disc, 'disc'));
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
    el('img', { class: 'cartridge-img', src: cartridgeFor(), alt: 'OMD cartridge' }),
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

/** A determinate progress bar (indeterminate when fraction is null). */
function omdProgress(fraction: number | null, label: string): HTMLElement {
  const track = el('div', { class: 'omd-progressbar-track' });
  if (fraction === null) {
    track.append(el('span', { class: 'omd-progressbar-fill is-indeterminate' }));
  } else {
    const fill = el('span', { class: 'omd-progressbar-fill' });
    fill.style.width = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
    track.append(fill);
  }
  return el('div', { class: 'omd-progressbar', role: 'progressbar' }, [
    el('div', { class: 'omd-progressbar-label', text: label }),
    track,
  ]);
}

/** Map an import progress update to a bar fraction (null = indeterminate) + label. */
function importProgressInfo(p: StudioImportProgress | undefined): {
  fraction: number | null;
  label: string;
} {
  if (!p || p.phase === 'reading') return { fraction: null, label: 'Reading the album\u2026' };
  if (p.phase === 'finalizing') return { fraction: 1, label: 'Writing the package\u2026' };
  const total = p.total || 1;
  return { fraction: p.done / total, label: `Importing track ${Math.min(p.done + 1, p.total)} of ${p.total}\u2026` };
}

/** Map a rip progress update to a bar fraction (null = indeterminate) + label. */
function ripProgressInfo(p: StudioRipProgress | undefined): {
  fraction: number | null;
  label: string;
} {
  if (!p || p.phase === 'validating') return { fraction: null, label: 'Verifying the source disc\u2026' };
  if (p.phase === 'finalizing') return { fraction: 1, label: 'Finishing the copy\u2026' };
  const total = p.total || 1;
  return { fraction: p.done / total, label: `Copying track ${Math.min(p.done + 1, p.total)} of ${p.total}\u2026` };
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
  if (state.view === 'catalog' || state.view === 'labels' || state.view === 'burn') renderMain();
}

/** Choose a folder to import, then review each album's metadata + format before committing. */
async function runImport(origin: 'catalog' | 'burn' = 'catalog'): Promise<void> {
  let dir = state.libraryDir;
  if (!dir) {
    const chosen = await window.omd.chooseLibraryFolder();
    if (!chosen) return;
    setCatalogDir(chosen);
    dir = chosen;
  }
  const scan = await window.omd.scanImportFolder();
  if (scan.canceled) return;
  if (scan.albums.length === 0) {
    state.importStatus = {
      busy: false,
      result: { total: 0, imported: 0, skipped: 0, failed: 0, items: [] },
    };
    renderMain();
    return;
  }
  state.importStatus = undefined;
  state.importReview = {
    destDir: dir,
    queue: scan.albums,
    index: 0,
    total: scan.albums.length,
    loading: true,
    discId: '',
    artist: '',
    album: '',
    year: '',
    tracks: [],
    codec: 'FLAC',
    codecsPresent: [],
    tally: { imported: 0, skipped: 0, failed: 0 },
    origin,
  };
  renderMain();
  await loadImportDraft();
}

/** Load the current queued album's detected metadata into the review form. */
async function loadImportDraft(): Promise<void> {
  const review = state.importReview;
  if (!review) return;
  review.loading = true;
  review.error = undefined;
  review.showErrors = false;
  renderMain();
  try {
    const draft = await window.omd.inspectImportAlbum(review.queue[review.index]!);
    review.draft = draft;
    review.discId = draft.suggestedDiscId;
    review.artist = draft.artist;
    review.album = draft.album;
    review.year = draft.releaseYear ? String(draft.releaseYear) : '';
    review.tracks = draft.tracks.map((t) => ({
      number: t.number,
      title: t.title,
      artist: t.artist ?? '',
      album: t.album ?? '',
      year: t.year ? String(t.year) : '',
    }));
    review.multipleArtists = draft.multipleArtists;
    review.tracksExpanded = draft.multipleArtists;
    review.codec = draft.detectedCodec;
    review.detectedCodec = draft.detectedCodec;
    review.codecsPresent = draft.codecsPresent;
    review.coverSourcePath = draft.coverSourcePath;
    review.coverPreview = draft.coverPreview;
  } catch (err) {
    review.error = (err as Error).message;
  }
  review.loading = false;
  renderMain();
}

/** Import the currently reviewed album with the edited metadata + chosen codec. */
async function saveImport(): Promise<void> {
  const review = state.importReview;
  if (!review || !review.draft) return;
  const fieldKeys = ['discId', 'artist', 'album', 'year'] as const;
  const hasFieldError = fieldKeys.some((k) => fieldError(k, review[k]) !== undefined);
  const hasTrackError = review.tracks.some((t) => t.title.trim().length === 0);
  if (hasFieldError || hasTrackError) {
    review.showErrors = true;
    review.error = 'Please fix the highlighted fields.';
    renderMain();
    return;
  }
  const year = review.year.trim() ? Number.parseInt(review.year.trim(), 10) : null;
  review.saving = true;
  review.progress = { phase: 'reading', done: 0, total: review.tracks.length };
  review.error = undefined;
  renderMain();
  try {
    const imported = await window.omd.importAlbum(
      {
        destDir: review.destDir,
        sourceDir: review.draft.sourceDir,
        audioCodec: review.codec,
        discId: review.discId.trim(),
        artist: review.artist.trim(),
        album: review.album.trim(),
        releaseYear: year,
        trackMeta: review.tracks.map((t) => ({
          number: t.number,
          title: t.title.trim(),
          artist: t.artist.trim(),
          album: t.album.trim(),
          ...(t.year.trim() && /^\d{1,4}$/.test(t.year.trim())
            ? { year: Number.parseInt(t.year.trim(), 10) }
            : {}),
        })),
        ...(review.coverSourcePath ? { coverSourcePath: review.coverSourcePath } : {}),
        overwrite: true,
      },
      (progress) => {
        if (state.importReview !== review) return;
        review.progress = progress;
        renderMain();
      },
    );
    if (imported) review.lastImported = imported;
    review.tally.imported += 1;
    review.saving = false;
    await advanceImport();
  } catch (err) {
    review.saving = false;
    review.error = (err as Error).message;
    renderMain();
  }
}

/** Skip the current album without importing it. */
async function skipImport(): Promise<void> {
  const review = state.importReview;
  if (!review) return;
  review.tally.skipped += 1;
  await advanceImport();
}

/** Move to the next queued album, or finish the import run. */
async function advanceImport(): Promise<void> {
  const review = state.importReview;
  if (!review) return;
  review.index += 1;
  if (review.index >= review.total) {
    const origin = review.origin ?? 'catalog';
    const lastImported = review.lastImported;
    const { imported, skipped, failed } = review.tally;
    state.importReview = undefined;
    await rescanLibrary();
    if (origin === 'burn' && lastImported) {
      const cd = ensureCreateDisc();
      cd.disc = lastImported;
      cd.picking = false;
      cd.loading = false;
      cd.error = undefined;
      setView('burn');
      if (!cd.drives.length) await loadCreateDiscDrives();
      else renderMain();
    } else {
      state.importStatus = {
        busy: false,
        result: { total: review.total, imported, skipped, failed, items: [] },
      };
      setView('catalog');
    }
    return;
  }
  await loadImportDraft();
}

/** Cancel the whole import run. */
function cancelImport(): void {
  const origin = state.importReview?.origin ?? 'catalog';
  state.importReview = undefined;
  setView(origin);
}

/** Pick a replacement cover for the album being imported. */
async function chooseImportCover(): Promise<void> {
  const review = state.importReview;
  if (!review) return;
  const picked = await window.omd.chooseCoverImage(review.draft?.sourceDir);
  if (!picked || !state.importReview) return;
  state.importReview.coverSourcePath = picked.path;
  state.importReview.coverPreview = picked.dataUri;
  renderMain();
}

/** Open the mixtape builder, loading catalog tracks as the source pool. */
async function startMixtape(origin: 'catalog' | 'burn' = 'catalog'): Promise<void> {
  let dir = state.libraryDir;
  if (!dir) {
    const chosen = await window.omd.chooseLibraryFolder();
    if (!chosen) return;
    setCatalogDir(chosen);
    dir = chosen;
  }
  state.mixtape = { name: '', artist: 'Various Artists', tracks: [], loading: true, origin };
  renderMain();
  try {
    state.mixtape.sources = await window.omd.mixtapeSources(dir);
  } catch (err) {
    state.mixtape.error = (err as Error).message;
  }
  state.mixtape.loading = false;
  renderMain();
}

function addMixtapeTrack(album: StudioMixtapeAlbum, track: StudioMixtapeAlbum['tracks'][number]): void {
  state.mixtape?.tracks.push({ sourcePath: track.path, title: track.title, from: album.album });
  renderMain();
}

function removeMixtapeTrack(index: number): void {
  state.mixtape?.tracks.splice(index, 1);
  renderMain();
}

function moveMixtapeTrack(index: number, delta: number): void {
  const tracks = state.mixtape?.tracks;
  if (!tracks) return;
  const target = index + delta;
  if (target < 0 || target >= tracks.length) return;
  [tracks[index]!, tracks[target]!] = [tracks[target]!, tracks[index]!];
  renderMain();
}

async function chooseMixtapeCover(): Promise<void> {
  const picked = await window.omd.chooseCoverImage(state.libraryDir);
  if (!picked || !state.mixtape) return;
  state.mixtape.coverSourcePath = picked.path;
  state.mixtape.coverPreview = picked.dataUri;
  renderMain();
}

async function saveMixtape(): Promise<void> {
  const m = state.mixtape;
  if (!m || !state.libraryDir) return;
  const name = m.name.trim();
  if (!name) {
    m.error = 'Give your mixtape a name.';
    renderMain();
    return;
  }
  if (m.tracks.length === 0) {
    m.error = 'Add at least one track.';
    renderMain();
    return;
  }
  m.saving = true;
  m.error = undefined;
  renderMain();
  try {
    const disc = await window.omd.createMixtape({
      destDir: state.libraryDir,
      discId: name,
      artist: m.artist.trim() || 'Various Artists',
      album: name,
      releaseYear: null,
      ...(m.coverSourcePath ? { coverSourcePath: m.coverSourcePath } : {}),
      tracks: m.tracks.map((t) => ({ sourcePath: t.sourcePath, title: t.title })),
    });
    const origin = m.origin ?? 'catalog';
    state.mixtape = undefined;
    await rescanLibrary();
    if (origin === 'burn' && disc) {
      const cd = ensureCreateDisc();
      cd.disc = disc;
      cd.picking = false;
      cd.loading = false;
      cd.error = undefined;
      setView('burn');
      if (!cd.drives.length) await loadCreateDiscDrives();
      else renderMain();
    } else {
      if (disc) state.album = disc;
      setView('catalog');
    }
  } catch (err) {
    m.saving = false;
    m.error = (err as Error).message;
    renderMain();
  }
}
/** A format selector for the import review (current codec shown, choose target). */
function importCodecField(review: NonNullable<AppState['importReview']>): HTMLElement {
  const present = new Set(review.codecsPresent);
  const options = el(
    'div',
    { class: 'omd-segment' },
    STUDIO_AUDIO_CODECS.map((codec) =>
      el(
        'button',
        {
          class: `omd-segment-btn${review.codec === codec ? ' selected' : ''}`,
          type: 'button',
          onclick: () => {
            review.codec = codec;
            renderMain();
          },
        },
        [
          el('span', { text: codec }),
          ...(present.has(codec) ? [el('span', { class: 'omd-segment-tag', text: 'in source' })] : []),
        ],
      ),
    ),
  );
  const willConvert = review.codecsPresent.some((c) => c !== review.codec);
  const detected = review.detectedCodec ? ` (source is ${review.detectedCodec})` : '';
  const note = willConvert
    ? `Tracks not already ${review.codec} will be converted to ${review.codec}.`
    : `Tracks are already ${review.codec} and will be copied as-is.`;
  return el('div', { class: 'omd-field' }, [
    el('span', { class: 'omd-field-label', text: `Format${detected}` }),
    options,
    el('p', { class: 'omd-field-hint', text: note }),
  ]);
}

/** A per-track row in the import review: title always, details when expanded. */
function importTrackRow(review: NonNullable<AppState['importReview']>, index: number): HTMLElement {
  const track = review.tracks[index]!;
  const titleInvalid = review.showErrors && track.title.trim().length === 0;
  const titleInput = el('input', {
    class: `omd-input${titleInvalid ? ' invalid' : ''}`,
    type: 'text',
    value: track.title,
    'aria-label': `Track ${track.number} title`,
  }) as HTMLInputElement;
  titleInput.addEventListener('input', () => {
    track.title = titleInput.value;
    titleInput.classList.toggle('invalid', titleInput.value.trim().length === 0);
  });

  const rowChildren: HTMLElement[] = [
    el('div', { class: 'omd-track-edit-row' }, [
      el('span', { class: 'omd-track-edit-num', text: String(track.number) }),
      titleInput,
    ]),
  ];

  if (review.tracksExpanded) {
    const detail = (label: string, key: 'artist' | 'album' | 'year'): HTMLInputElement => {
      const input = el('input', {
        class: 'omd-input',
        type: 'text',
        value: track[key],
        placeholder: label,
        'aria-label': `Track ${track.number} ${label}`,
        ...(key === 'year' ? { inputmode: 'numeric', maxlength: '4' } : {}),
      }) as HTMLInputElement;
      input.addEventListener('input', () => {
        track[key] = input.value;
      });
      return input;
    };
    rowChildren.push(
      el('div', { class: 'omd-track-edit-details' }, [
        detail('Artist', 'artist'),
        detail('Album', 'album'),
        detail('Year', 'year'),
      ]),
    );
  }

  return el('div', { class: 'omd-track-edit' }, rowChildren);
}

/** The import review view: edit the detected metadata + format, then commit. */
function importReviewView(): HTMLElement {
  const review = state.importReview!;
  const position = review.total > 1 ? ` (${review.index + 1} of ${review.total})` : '';

  const topbar = el('div', { class: 'omd-editbar' }, [
    btn('Cancel import', cancelImport, { small: true, icon: 'chevron-left' }),
    el('div', { class: 'omd-editbar-actions' }, [
      ...(review.total > 1 && !review.loading
        ? [btn('Skip', () => void skipImport(), { small: true })]
        : []),
      btn(review.saving ? 'Importing\u2026' : 'Import', () => void saveImport(), {
        primary: true,
        icon: 'note',
        disabled: review.saving || review.loading || !review.draft,
      }),
      btn('Cancel', cancelImport, { small: true }),
    ]),
  ]);

  const head = el('div', { class: 'view-head' }, [
    el('div', { class: 'view-title', text: `Review import${position}` }),
    el('div', {
      class: 'view-lead',
      text: review.loading
        ? 'Reading the album\u2026'
        : 'Confirm or edit the details and choose a format, then import.',
    }),
  ]);

  const frame = (body: (Node | string)[]): HTMLElement =>
    el('div', { class: 'omd-stack omd-fill' }, [
      topbar,
      ...(review.error ? [notice('error', review.error)] : []),
      el('div', { class: 'omd-scroll' }, [head, ...body]),
    ]);

  if (review.loading || !review.draft) {
    return frame([el('section', { class: 'card' }, [spinnerRow('Reading the album\u2026')])]);
  }

  if (review.saving) {
    const { fraction, label } = importProgressInfo(review.progress);
    return frame([el('section', { class: 'card' }, [omdProgress(fraction, label)])]);
  }
  const cover = review.coverPreview;
  const art = el('div', { class: 'album-col' }, [
    el('div', { class: 'album-art' }, [
      cover
        ? el('img', { src: cover, alt: 'Cover art' })
        : el('span', { class: 'album-art-empty' }, [svgIcon('note', 64)]),
    ]),
    el('div', { class: 'bc-actions' }, [
      btn('Replace cover\u2026', () => void chooseImportCover(), { icon: 'note', small: true }),
    ]),
  ]);

  const artistField = editField(review, 'Artist', 'artist');
  const artistBlock = review.multipleArtists
    ? el('div', { class: 'omd-field-group' }, [
        artistField,
        el('p', {
          class: 'omd-field-hint',
          text: 'The tracks list more than one artist, so "Various Artists" was suggested. Set each track\u2019s artist below.',
        }),
      ])
    : artistField;

  const tracksHeader = el('div', { class: 'omd-tracks-head' }, [
    el('span', { class: 'omd-field-label', text: `Tracks (${review.tracks.length})` }),
    el(
      'button',
      {
        class: 'link-btn',
        type: 'button',
        onclick: () => {
          review.tracksExpanded = !review.tracksExpanded;
          renderMain();
        },
      },
      [review.tracksExpanded ? 'Hide details' : 'Edit details'],
    ),
  ]);

  const form = el('div', { class: 'album-meta omd-form' }, [
    editField(review, 'Album', 'album'),
    artistBlock,
    editField(review, 'Year', 'year'),
    editField(review, 'Disc title', 'discId'),
    importCodecField(review),
    el('div', { class: 'omd-tracks' }, [
      tracksHeader,
      ...review.tracks.map((_track, index) => importTrackRow(review, index)),
    ]),
  ]);

  return frame([el('section', { class: 'card' }, [el('div', { class: 'disc-main' }, [art, form])])]);
}

function importStatusEl(status: NonNullable<AppState['importStatus']>): HTMLElement {
  if (status.busy) {
    return el('div', { class: 'rip-status' }, [
      busyPill('IMPORTING'),
      el('span', { class: 'rip-status-text', text: 'Scanning for audio albums\u2026' }),
    ]);
  }
  const result = status.result;
  if (!result) return el('div');
  const ok = result.failed === 0 && result.total > 0;
  const failures = result.items.filter((it) => !it.ok && !it.skipped);
  const summary =
    result.total === 0
      ? 'No audio albums found in that folder.'
      : `Imported ${result.imported}` +
        (result.skipped ? `, skipped ${result.skipped} already in catalog` : '') +
        (result.failed ? `, ${result.failed} failed` : '') +
        '.';
  const rows: HTMLElement[] = [
    el('div', { class: 'rip-status' }, [
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
    ]),
  ];
  for (const fail of failures) {
    rows.push(
      el('div', { class: 'import-fail' }, [
        el('span', { class: 'import-fail-name', text: fail.album }),
        el('span', { class: 'import-fail-msg', text: fail.error ?? 'Import failed.' }),
      ]),
    );
  }
  return el('div', { class: 'import-status' }, rows);
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
  const open = (): void => void openAlbum(entry.source);
  const cover = entry.coverDataUri
    ? el('img', { class: 'omd-album-cover', src: entry.coverDataUri, alt: 'Cover art', onclick: open })
    : el('span', { class: 'omd-album-cover-empty', onclick: open }, [svgIcon('note', 40)]);
  const body = el('div', { class: 'omd-album-body', onclick: open }, [
    el('div', { class: 'omd-album-title', text: entry.discId }),
    el('div', { class: 'omd-album-sub', text: `${entry.artist} - ${entry.album}` }),
    el('div', { class: 'omd-album-sub', text: `${entry.trackCount} tracks` }),
  ]);
  const isCurrent = state.nowPlaying?.disc.source === entry.source;
  const playing = isCurrent && player.getState().status === 'playing';
  const playBtn = el(
    'button',
    {
      class: 'omd-chip-btn',
      type: 'button',
      'data-play-src': entry.source,
      onclick: () => {
        if (state.nowPlaying?.disc.source === entry.source) player.togglePlayPause();
        else void playCatalogEntry(entry);
      },
    },
    [svgIcon(playing ? 'pause' : 'play', 15), playing ? 'Pause' : 'Play'],
  );
  const actions = el('div', { class: 'omd-album-actions' }, [
    playBtn,
    el(
      'button',
      {
        class: 'omd-chip-btn grow0 danger',
        type: 'button',
        title: 'Delete from catalog',
        'aria-label': 'Delete from catalog',
        onclick: () => void deleteCatalogEntry(entry),
      },
      [svgIcon('trash', 15)],
    ),
  ]);
  return el('div', { class: 'omd-album-card' }, [cover, body, actions]);
}

/** Update catalog Play/Pause buttons in place when playback state changes. */
function updateCatalogPlayButtons(): void {
  const status = player.getState().status;
  const current = state.nowPlaying?.disc.source;
  document.querySelectorAll<HTMLButtonElement>('.omd-album-card [data-play-src]').forEach((button) => {
    const src = button.getAttribute('data-play-src');
    const playing = src === current && status === 'playing';
    clearChildren(button);
    button.append(svgIcon(playing ? 'pause' : 'play', 15), document.createTextNode(playing ? 'Pause' : 'Play'));
  });
}

/** A reusable inline notice banner (error/warning/info). */
function notice(kind: 'error' | 'warning' | 'info', text: string): HTMLElement {
  return el('div', { class: `notice notice-${kind}`, role: 'alert' }, [
    el('span', { class: 'notice-dot', 'aria-hidden': 'true' }),
    el('span', { class: 'notice-text', text }),
  ]);
}

/** The editable album-metadata fields shared by the album editor and import review. */
interface EditableMeta {
  discId: string;
  artist: string;
  album: string;
  year: string;
  tracks: { number: number; title: string }[];
  /** True once a save has been attempted, so all invalid fields highlight. */
  showErrors?: boolean;
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

function editField(edit: EditableMeta, label: string, key: 'discId' | 'artist' | 'album' | 'year'): HTMLElement {
  const extra: Record<string, string> =
    key === 'year'
      ? { inputmode: 'numeric', placeholder: 'e.g. 2009', maxlength: '4' }
      : key === 'discId'
        ? { maxlength: '200' }
        : {};
  const initialErr = edit.showErrors ? fieldError(key, edit[key]) : undefined;
  const input = el('input', {
    class: `omd-input${initialErr ? ' invalid' : ''}`,
    type: 'text',
    value: edit[key],
    ...extra,
  }) as HTMLInputElement;
  const errorSpan = el('span', { class: 'omd-field-error', text: initialErr ?? '' });
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
  return el('label', { class: 'omd-field' }, [
    el('span', { class: 'omd-field-label', text: label }),
    input,
    errorSpan,
  ]);
}

function editTrackRow(edit: EditableMeta, index: number): HTMLElement {
  const track = edit.tracks[index]!;
  const initialInvalid = edit.showErrors && track.title.trim().length === 0;
  const input = el('input', {
    class: `omd-input${initialInvalid ? ' invalid' : ''}`,
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
  return el('div', { class: 'omd-track-edit-row' }, [
    el('span', { class: 'omd-track-edit-num', text: String(track.number) }),
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

  const form = el('div', { class: 'album-meta omd-form' }, [
    editField(edit, 'Album', 'album'),
    editField(edit, 'Artist', 'artist'),
    editField(edit, 'Year', 'year'),
    editField(edit, 'Disc title', 'discId'),
    el('div', { class: 'omd-tracks' }, [
      el('span', { class: 'omd-field-label', text: 'Track titles' }),
      ...edit.tracks.map((_track, index) => editTrackRow(edit, index)),
    ]),
  ]);

  const cancel = (): void => {
    state.albumEdit = undefined;
    renderMain();
  };
  const topbar = el('div', { class: 'omd-editbar' }, [
    btn('Back to album', cancel, { small: true, icon: 'chevron-left' }),
    el('div', { class: 'omd-editbar-actions' }, [
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
  children.push(
    el('div', { class: 'omd-scroll' }, [
      el('section', { class: 'card' }, [el('div', { class: 'disc-main' }, [art, form])]),
    ]),
  );
  return el('div', { class: 'omd-stack omd-fill' }, children);
}

/** The mixtape builder: a source track library on the left, your mix on the right. */
function mixtapeView(): HTMLElement {
  const m = state.mixtape!;
  const fromBurn = m.origin === 'burn';
  const cancel = (): void => {
    state.mixtape = undefined;
    setView(fromBurn ? 'burn' : 'catalog');
  };
  const topbar = el('div', { class: 'omd-editbar' }, [
    btn(fromBurn ? 'Back to Create a Disc' : 'Back to catalog', cancel, {
      small: true,
      icon: 'chevron-left',
    }),
    el('div', { class: 'omd-editbar-actions' }, [
      btn(m.saving ? 'Saving\u2026' : 'Save mixtape', () => void saveMixtape(), {
        primary: true,
        icon: 'check',
        disabled: m.saving,
      }),
      btn('Cancel', cancel, { small: true }),
    ]),
  ]);

  const sourcesCol = el('div', { class: 'mixtape-sources' }, []);
  if (m.loading) {
    sourcesCol.append(spinnerRow('Loading your library\u2026'));
  } else if (!m.sources || m.sources.length === 0) {
    sourcesCol.append(
      el('p', { class: 'select-lead', text: 'No catalog albums to pull tracks from yet.' }),
    );
  } else {
    for (const album of m.sources) {
      const list = el('ol', { class: 'mixtape-src-list' });
      album.tracks.forEach((track) => {
        list.append(
          el('li', { class: 'mixtape-src-row' }, [
            el('span', { class: 'mixtape-src-title', text: `${track.number}. ${track.title}` }),
            el(
              'button',
              { class: 'link-btn', type: 'button', onclick: () => addMixtapeTrack(album, track) },
              ['+ Add'],
            ),
          ]),
        );
      });
      sourcesCol.append(
        el('div', { class: 'mixtape-album' }, [
          el('div', { class: 'mixtape-album-head' }, [
            el('div', { class: 'mixtape-album-title', text: album.album }),
            el('div', { class: 'mixtape-album-sub', text: album.artist }),
          ]),
          list,
        ]),
      );
    }
  }

  const nameInput = el('input', {
    class: 'omd-input',
    type: 'text',
    value: m.name,
    placeholder: 'Mixtape name',
    maxlength: '200',
  }) as HTMLInputElement;
  nameInput.addEventListener('input', () => {
    m.name = nameInput.value;
  });
  const artistInput = el('input', {
    class: 'omd-input',
    type: 'text',
    value: m.artist,
    placeholder: 'Artist',
  }) as HTMLInputElement;
  artistInput.addEventListener('input', () => {
    m.artist = artistInput.value;
  });

  const coverBox = el('div', { class: 'mixtape-cover album-art' }, [
    m.coverPreview
      ? el('img', { src: m.coverPreview, alt: 'Cover' })
      : el('img', { src: 'assets/mixtape-default-cover.png', alt: 'Default mixtape cover' }),
  ]);

  const selList = el('ol', { class: 'mixtape-sel-list' });
  if (m.tracks.length === 0) {
    selList.append(
      el('li', { class: 'mixtape-sel-empty', text: 'Add tracks from the left to build your mix.' }),
    );
  }
  m.tracks.forEach((t, i) => {
    selList.append(
      el('li', { class: 'mixtape-sel-row' }, [
        el('span', { class: 'mixtape-sel-num', text: String(i + 1) }),
        el('span', { class: 'mixtape-sel-title', text: t.title }),
        el('span', { class: 'mixtape-sel-from', text: t.from }),
        el('div', { class: 'mixtape-sel-actions' }, [
          el(
            'button',
            {
              class: 'mini-btn',
              type: 'button',
              title: 'Move up',
              disabled: i === 0 ? true : null,
              onclick: () => moveMixtapeTrack(i, -1),
            },
            ['\u2191'],
          ),
          el(
            'button',
            {
              class: 'mini-btn',
              type: 'button',
              title: 'Move down',
              disabled: i === m.tracks.length - 1 ? true : null,
              onclick: () => moveMixtapeTrack(i, 1),
            },
            ['\u2193'],
          ),
          el(
            'button',
            {
              class: 'mini-btn danger',
              type: 'button',
              title: 'Remove',
              onclick: () => removeMixtapeTrack(i),
            },
            ['\u2715'],
          ),
        ]),
      ]),
    );
  });

  const detail = el('div', { class: 'mixtape-detail' }, [
    el('div', { class: 'mixtape-head-row' }, [
      coverBox,
      el('div', { class: 'mixtape-fields' }, [
        el('label', { class: 'omd-field' }, [
          el('span', { class: 'omd-field-label', text: 'Mixtape name' }),
          nameInput,
        ]),
        el('label', { class: 'omd-field' }, [
          el('span', { class: 'omd-field-label', text: 'Artist' }),
          artistInput,
        ]),
        el('div', { class: 'bc-actions' }, [
          btn('Replace cover\u2026', () => void chooseMixtapeCover(), { icon: 'note', small: true }),
        ]),
      ]),
    ]),
    el('div', { class: 'omd-field-label', text: `Tracks (${m.tracks.length})` }),
    selList,
  ]);

  const children: (Node | string)[] = [topbar];
  if (m.error) children.push(notice('error', m.error));
  children.push(
    el('div', { class: 'omd-scroll' }, [
      el('section', { class: 'card' }, [
        el('div', { class: 'mixtape-layout' }, [
          el('div', { class: 'mixtape-col' }, [el('p', { class: 'eyebrow', text: 'Library' }), sourcesCol]),
          el('div', { class: 'mixtape-col' }, [
            el('p', { class: 'eyebrow', text: 'Your mixtape' }),
            detail,
          ]),
        ]),
      ]),
    ]),
  );
  return el('div', { class: 'omd-stack omd-fill' }, children);
}

function catalogView(): HTMLElement {
  if (state.mixtape) {
    return mixtapeView();
  }
  if (state.importReview) {
    return importReviewView();
  }
  if (state.albumLoading) {
    return el('div', { class: 'view' }, [
      el('section', { class: 'card' }, [spinnerRow('Opening album\u2026')]),
    ]);
  }
  if (state.album && state.albumEdit) {
    return albumEditView(state.album);
  }
  if (state.album) {
    const back = el('div', { class: 'omd-actions' }, [
      omdBtn('Back to catalog', 'chevron-left', () => {
        state.album = undefined;
        renderMain();
      }),
    ]);
    return el('div', { class: 'omd-stack omd-fill' }, [back, ...albumDetail(state.album, 'album')]);
  }

  const actions = el('div', { class: 'omd-actions' }, [
    el(
      'button',
      { class: 'omd-btn omd-btn--primary', type: 'button', onclick: () => void chooseLibrary() },
      [svgIcon('catalog', 18), 'Library folder'],
    ),
    el('button', { class: 'omd-btn', type: 'button', onclick: () => void runImport() }, [
      svgIcon('note', 18),
      'Import music',
    ]),
    el('button', { class: 'omd-btn', type: 'button', onclick: () => void startMixtape() }, [
      svgIcon('rip', 18),
      'New mixtape',
    ]),
    el('button', { class: 'omd-btn', type: 'button', onclick: () => setView('labels') }, [
      svgIcon('label', 18),
      'Label sheets',
    ]),
  ]);
  const body: (Node | string)[] = [actions];
  if (state.libraryDir) body.push(el('p', { class: 'omd-muted omd-path', text: state.libraryDir }));
  if (state.importStatus) body.push(importStatusEl(state.importStatus));
  if (state.albumError) body.push(el('p', { class: 'omd-muted', text: state.albumError }));

  const query = state.catalogQuery?.trim().toLowerCase();
  if (query) {
    body.push(
      el('div', { class: 'omd-searchsummary' }, [
        el('span', { class: 'omd-muted', text: `Search: \u201c${state.catalogQuery}\u201d` }),
        omdBtn('Clear search', undefined, () => {
          state.catalogQuery = undefined;
          renderMain();
        }),
      ]),
    );
  }

  let results: HTMLElement;
  if (state.catalogLoading) {
    results = el('div', { class: 'omd-scroll' }, [spinnerRow('Scanning...')]);
  } else if (state.catalogError) {
    results = el('div', { class: 'omd-scroll' }, [el('p', { class: 'omd-muted', text: state.catalogError })]);
  } else if (state.catalog && state.catalog.length > 0) {
    const matches = query
      ? state.catalog.filter((entry) =>
          `${entry.artist} ${entry.album} ${entry.discId}`.toLowerCase().includes(query),
        )
      : state.catalog;
    if (matches.length > 0) {
      const grid = el('div', { class: 'omd-grid' });
      for (const entry of matches) grid.append(catalogCard(entry));
      results = el('div', { class: 'omd-scroll' }, [grid]);
    } else {
      results = el('div', { class: 'omd-scroll' }, [
        el('p', { class: 'omd-muted', text: `No albums match \u201c${state.catalogQuery}\u201d.` }),
      ]);
    }
  } else {
    results = el('div', { class: 'omd-scroll' }, [
      el('p', {
        class: 'omd-muted',
        text: state.catalog
          ? 'No OMD packages here. Choose a folder that contains package subfolders (for example your build output).'
          : 'Choose a folder that contains OMD package subfolders to list them here.',
      }),
    ]);
  }
  body.push(results);

  return el('div', { class: 'omd-stack omd-fill' }, body);
}

/** A large primary tile on the Home hub (one of the core jobs). */
function hubPrimaryTile(opts: {
  icon: IconName;
  title: string;
  sub: string;
  action: string;
  onClick: () => void;
}): HTMLElement {
  return el('button', { class: 'hub-tile', type: 'button', onclick: opts.onClick }, [
    el('span', { class: 'hub-tile-art', 'aria-hidden': 'true' }, [svgIcon(opts.icon, 132)]),
    el('span', { class: 'hub-tile-icon' }, [svgIcon(opts.icon, 30)]),
    el('span', { class: 'hub-tile-text' }, [
      el('span', { class: 'hub-tile-title', text: opts.title }),
      el('span', { class: 'hub-tile-sub', text: opts.sub }),
    ]),
    el('span', { class: 'hub-tile-action' }, [
      el('span', { text: opts.action }),
      svgIcon('chevron-right', 16),
    ]),
  ]);
}

/** A compact secondary tile on the Home hub (Themes, Settings). */
function hubMiniTile(opts: { icon: IconName; title: string; sub: string; onClick: () => void }): HTMLElement {
  return el('button', { class: 'hub-mini', type: 'button', onclick: opts.onClick }, [
    el('span', { class: 'hub-tile-art', 'aria-hidden': 'true' }, [svgIcon(opts.icon, 108)]),
    el('span', { class: 'hub-mini-icon' }, [svgIcon(opts.icon, 26)]),
    el('span', { class: 'hub-mini-body' }, [
      el('span', { class: 'hub-mini-title', text: opts.title }),
      el('span', { class: 'hub-mini-sub', text: opts.sub }),
    ]),
  ]);
}

/** The wide Now Playing tile: art plus the loaded album, routing to its player. */
function hubNowPlayingTile(): HTMLElement {
  const np = state.nowPlaying;
  const art = np?.disc.coverDataUri
    ? el('img', { src: np.disc.coverDataUri, alt: '' })
    : svgIcon('note', 40);
  const meta: (Node | string)[] = [];
  if (np) {
    meta.push(el('span', { text: `${np.disc.audioCodec} \u00b7 ${np.disc.audioLossless ? 'Lossless' : 'Lossy'}` }));
    meta.push(el('span', { text: `${np.disc.trackCount} tracks` }));
  }
  return el(
    'button',
    {
      class: 'hub-np',
      type: 'button',
      onclick: () => {
        const playing = state.nowPlaying;
        if (playing?.source === 'album') void openAlbum(playing.disc.source);
        else setView('disc');
      },
    },
    [
      el('span', { class: 'hub-np-art' }, [art]),
      el('span', { class: 'hub-np-body' }, [
        el('span', { class: 'hub-np-eyebrow', text: 'Now Playing' }),
        el('span', { class: 'hub-np-title', text: np ? np.disc.album : 'Nothing playing yet' }),
        el('span', { class: 'hub-np-artist', text: np ? np.disc.artist : 'Insert a disc or pick from your catalog' }),
        meta.length ? el('span', { class: 'hub-np-meta' }, meta) : '',
      ]),
    ],
  );
}

/** The Home hub top bar: brand, catalog search, and now-playing status pills. */
function hubBar(): HTMLElement {
  const input = el('input', {
    class: 'hub-search-input',
    type: 'search',
    placeholder: 'Search albums, artists, tracks\u2026',
    'aria-label': 'Search your catalog',
    value: state.catalogQuery ?? '',
  }) as HTMLInputElement;
  const search = el(
    'form',
    {
      class: 'hub-search',
      role: 'search',
      onsubmit: (event: Event) => {
        event.preventDefault();
        const query = input.value.trim();
        state.catalogQuery = query.length > 0 ? query : undefined;
        setView('catalog');
      },
    },
    [
      el('span', { class: 'hub-search-icon', 'aria-hidden': 'true' }, [svgIcon('search', 20)]),
      input,
    ],
  );

  const status = el('div', { class: 'hub-bar-status' });
  const np = state.nowPlaying;
  if (np) {
    status.append(
      el('span', { class: 'hub-pill' }, [
        svgIcon('wave', 16),
        el('span', { text: `${np.disc.audioCodec} \u00b7 ${np.disc.audioLossless ? 'Lossless' : 'Lossy'}` }),
      ]),
    );
    if (discVerified() === true) {
      status.append(
        el('span', { class: 'hub-pill hub-pill--verified' }, [
          svgIcon('check', 16),
          el('span', { text: 'Verified' }),
        ]),
      );
    }
  }

  const brand = el('div', { class: 'hub-brand' }, [
    el('img', { class: 'hub-brand-disc', src: logoFor(), alt: '' }),
    el('div', { class: 'hub-brand-word' }, [
      el('div', { class: 'hub-brand-omd', text: 'OMD' }),
      el('div', { class: 'hub-brand-studio', text: 'STUDIO' }),
    ]),
  ]);

  return el('header', { class: 'hub-bar' }, [brand, search, status]);
}

/** The Home hub: brand + search bar, the core-job tiles, and secondary access. */
function homeView(): HTMLElement {
  return el('div', { class: 'hub' }, [
    hubBar(),
    el('div', { class: 'hub-body' }, [
      el('div', { class: 'hub-primary' }, [
        hubPrimaryTile({
          icon: 'disc',
          title: 'Play a Disc',
          sub: 'Detect and play an inserted OMD disc.',
          action: 'Open player',
          onClick: () => setView('disc'),
        }),
        hubPrimaryTile({
          icon: 'create',
          title: 'Create a Disc',
          sub: 'Import, build, and burn an album.',
          action: 'New project',
          onClick: () => setView('burn'),
        }),
        hubPrimaryTile({
          icon: 'catalog',
          title: 'Catalog',
          sub: 'Browse and manage your library.',
          action: 'View library',
          onClick: () => {
            state.catalogQuery = undefined;
            setView('catalog');
          },
        }),
      ]),
      el('div', { class: 'hub-secondary' }, [
        hubNowPlayingTile(),
        hubMiniTile({ icon: 'themes', title: 'Themes', sub: 'Customize the look.', onClick: () => setView('themes') }),
        hubMiniTile({
          icon: 'settings',
          title: 'Settings',
          sub: 'Drives and device info.',
          onClick: () => setView('settings'),
        }),
      ]),
    ]),
  ]);
}

function viewFor(view: ViewId): HTMLElement {
  switch (view) {
    case 'home':
      return homeView();
    case 'burn':
      return createDiscView();
    case 'labels':
      return renderLabelsView({
        libraryDir: state.libraryDir,
        entries: state.catalog,
        loading: state.catalogLoading === true,
        error: state.catalogError,
        onChooseLibrary: () => void chooseLibrary(),
        onRescan: () => void rescanLibrary(),
      });
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

  const brand = el('div', { class: 'app-brand', role: 'button', tabindex: '0', title: 'Home', onclick: () => setView('home') }, [
    el('div', { class: 'brand-word' }, [
      el('div', { class: 'omd', text: 'OMD' }),
      el('div', { class: 'studio', text: 'STUDIO' }),
    ]),
    el('img', {
      class: 'app-brand-disc',
      src: logoFor(),
      alt: '',
    }),
    el('div', {
      class: 'app-brand-tag',
      text: 'Turn audio albums into real, playable 8cm mini DVD-RW discs.',
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

  shellEl = el('div', { class: 'app-shell' }, [sidebar, mainEl, nowPlayingHost]);
  shellEl.classList.toggle('app-shell--home', state.view === 'home');
  root.append(backdrop, shellEl);
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
  // Proactively detect an already-inserted disc on boot. The live watch only
  // fires on a change, and its first push can race the listener registration,
  // so a disc that was already in the drive would otherwise need a manual scan.
  void detectDisc(true);

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
