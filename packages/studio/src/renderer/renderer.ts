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
  createPlayerState,
  currentTrack,
  cycleRepeat,
  getBuiltinTheme,
  next,
  previous,
  resolveTheme,
  setElapsed,
  setVolume,
  toggleShuffle,
  togglePlay,
  type PlayerState,
} from '@open-album-cartridge/ui';
import type { OmdStudioApi, StudioDrive, StudioInfo } from '../shared/types';
import { clearChildren, el, svgIcon, type IconName } from './dom';
import { renderNowPlaying } from './nowPlaying';
import { renderCreateWizard } from './createWizard';

declare global {
  interface Window {
    omd: OmdStudioApi;
  }
}

type ViewId = 'create' | 'player' | 'catalog' | 'themes' | 'settings';

interface NavItem {
  id: ViewId;
  label: string;
  icon: IconName;
}

const NAV: NavItem[] = [
  { id: 'create', label: 'Create Disc', icon: 'create' },
  { id: 'player', label: 'Player', icon: 'player' },
  { id: 'catalog', label: 'Catalog', icon: 'catalog' },
  { id: 'themes', label: 'Themes', icon: 'themes' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

interface AppState {
  view: ViewId;
  themeId: string;
  player: PlayerState;
  info?: StudioInfo;
  drives?: StudioDrive[];
}

const state: AppState = {
  view: 'create',
  themeId: AQUA_THEME.id,
  player: createPlayerState([]),
};

const navButtons = new Map<ViewId, HTMLElement>();
let mainEl: HTMLElement;
let nowPlayingHost: HTMLElement;
let versionLabel: HTMLElement;

function applyThemeById(id: string): void {
  const theme = getBuiltinTheme(id) ?? AQUA_THEME;
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
    renderNowPlaying(state.player, {
      onTogglePlay: () => update(togglePlay(state.player)),
      onNext: () => update(next(state.player)),
      onPrevious: () => update(previous(state.player)),
      onToggleShuffle: () => update(toggleShuffle(state.player)),
      onCycleRepeat: () => update(cycleRepeat(state.player)),
      onVolume: (value) => update(setVolume(state.player, value)),
      onSeek: (fraction) => {
        const duration = currentTrack(state.player)?.durationSeconds ?? 0;
        update(setElapsed(state.player, fraction * duration));
      },
    }),
  );
}

function update(player: PlayerState): void {
  state.player = player;
  renderNowPlayingBar();
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
  for (const theme of BUILTIN_THEMES) {
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
  return el('div', { class: 'view' }, [
    el('div', { class: 'view-head' }, [
      el('h1', { class: 'view-title', text: 'Themes' }),
      el('p', {
        class: 'view-lead',
        text: 'Pick a look. Themes are data only; the layout never changes.',
      }),
    ]),
    grid,
  ]);
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
    card('Optical drives', driveChildren),
  ]);
}

function viewFor(view: ViewId): HTMLElement {
  switch (view) {
    case 'create':
      return renderCreateWizard({ onOpenPlayer: () => setView('player') });
    case 'player':
      return placeholderView('Player', 'Play a mounted OMD disc with verified, lossless FLAC.', [
        'Auto-detect a mounted disc',
        'Show cover, tracks, and integrity badges',
        'Transport, seek, and volume',
        'Re-verify against the manifest',
      ]);
    case 'catalog':
      return placeholderView('Catalog', 'Browse the discs you have created and ripped.', [
        'List packaged and ripped albums',
        'Search and filter',
        'Open in the player or re-burn',
      ]);
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
    el('div', { class: 'brand-mark' }, [svgIcon('create', 30)]),
    el('div', { class: 'brand-text' }, [
      el('div', { class: 'brand-name', text: 'OMD Studio' }),
      el('div', {
        class: 'brand-tag',
        text: 'Turn FLAC albums into real, playable 8cm mini DVD-RW discs.',
      }),
    ]),
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
