/**
 * The persistent Now Playing bar.
 *
 * A pure view over the shared player state: given a {@link PlayerState} and a
 * set of handlers, it builds the bar. The shell re-renders it on every player
 * transition. It never decodes audio itself.
 */

import { currentTrack, type PlayerState } from '@open-album-cartridge/ui';
import { el, svgIcon, type IconName } from './dom';

/** Callbacks the bar invokes as the user drives the transport. */
export interface NowPlayingHandlers {
  onTogglePlay(): void;
  onNext(): void;
  onPrevious(): void;
  onToggleShuffle(): void;
  onCycleRepeat(): void;
  onVolume(value: number): void;
  onSeek(fraction: number): void;
}

/** Extra, non-transport info about what is playing. */
export interface NowPlayingMeta {
  /** Whether the loaded disc passed verification (undefined when no disc). */
  verified?: boolean;
  /** File-type label for the current track, e.g. "FLAC". */
  fileType?: string;
  /** Cover art data URI for the current album. */
  coverDataUri?: string;
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

interface PcButtonOptions {
  primary?: boolean;
  active?: boolean;
  disabled?: boolean;
}

/** A player-control button in the showcase glass structure (rim + surface + content). */
function pcButton(
  icon: IconName,
  label: string,
  onClick: () => void,
  options: PcButtonOptions = {},
): HTMLElement {
  const iconSvg = svgIcon(icon);
  iconSvg.setAttribute('class', 'pc-icon');
  const classes = ['pc-button'];
  classes.push(options.primary ? 'primary' : 'pc-sm');
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
      el('span', { class: 'pc-content' }, [iconSvg]),
    ],
  );
}

/** The themed glass slider (showcase .range-control) in its compact dock size, interactive. */
function themedSlider(
  value: number,
  ariaLabel: string,
  onInput: (fraction: number) => void,
  disabled = false,
): HTMLElement {
  const control = el('div', { class: 'range-control range-compact' });
  const input = el('input', {
    class: 'range-input',
    type: 'range',
    min: '0',
    max: '1000',
    value: String(Math.round(value * 1000)),
    disabled: disabled ? true : null,
    'aria-label': ariaLabel,
  }) as HTMLInputElement;
  input.addEventListener('input', () => {
    const fraction = Number(input.value) / 1000;
    control.style.setProperty('--slider-value', `${(fraction * 100).toFixed(2)}%`);
    onInput(fraction);
  });
  control.append(
    el('div', { class: 'track', 'aria-hidden': 'true' }, [el('div', { class: 'track-fill' })]),
    input,
    el('div', { class: 'thumb', 'aria-hidden': 'true' }),
  );
  control.style.setProperty('--slider-value', `${(value * 100).toFixed(2)}%`);
  return control;
}

/** Build the Now Playing dock for the given player state (showcase .now-playing-dock). */
export function renderNowPlaying(
  state: PlayerState,
  handlers: NowPlayingHandlers,
  meta: NowPlayingMeta = {},
): HTMLElement {
  const track = currentTrack(state);
  const hasTrack = track !== undefined;
  // A disc can be staged (queue loaded) while still 'idle'. Only treat it as
  // "now playing" once the user has actually started it, so the dock reflects
  // the transport rather than a merely-inserted disc.
  const active = hasTrack && state.status !== 'idle';
  const duration = track?.durationSeconds ?? 0;
  const elapsed = state.elapsedSeconds;
  const fraction = duration > 0 ? Math.min(1, elapsed / duration) : 0;
  const playing = state.status === 'playing';

  const thumb =
    active && meta.coverDataUri
      ? el('img', { class: 'npd-thumb', src: meta.coverDataUri, alt: '' })
      : el('span', { class: 'npd-thumb', 'aria-hidden': 'true' });
  const nowChildren: HTMLElement[] = [
    thumb,
    el('span', { class: 'npd-meta' }, [
      el('span', { class: 'npd-title', text: active && track ? track.title : 'Nothing playing' }),
      el('span', {
        class: 'npd-artist',
        text: active && track ? (track.artist ?? '') : 'Load a disc from Disc or Catalog',
      }),
    ]),
  ];
  if (playing) {
    nowChildren.push(
      el('span', { class: 'npd-eq', 'aria-hidden': 'true' }, [
        el('span'),
        el('span'),
        el('span'),
        el('span'),
        el('span'),
      ]),
    );
  }
  const now = el('div', { class: 'npd-now' }, nowChildren);

  const transport = el('div', { class: 'npd-transport' }, [
    pcButton('shuffle', 'Shuffle', handlers.onToggleShuffle, { active: state.shuffle }),
    pcButton('prev', 'Previous', handlers.onPrevious, { disabled: !hasTrack }),
    pcButton(playing ? 'pause' : 'play', playing ? 'Pause' : 'Play', handlers.onTogglePlay, {
      primary: true,
      disabled: !hasTrack,
    }),
    pcButton('next', 'Next', handlers.onNext, { disabled: !hasTrack }),
    pcButton('repeat', `Repeat: ${state.repeat}`, handlers.onCycleRepeat, {
      active: state.repeat !== 'off',
    }),
  ]);

  const scrubber = el('div', { class: 'npd-scrubber' }, [
    el('span', { class: 'npd-time', text: formatTime(elapsed) }),
    themedSlider(fraction, 'Seek', (f) => handlers.onSeek(f), !hasTrack),
    el('span', { class: 'npd-time', text: formatTime(duration) }),
  ]);

  const center = el('div', { class: 'npd-center' }, [transport, scrubber]);

  const chips: HTMLElement[] = [];
  if (active && meta.verified) {
    chips.push(el('span', { class: 'npd-chip verified' }, [svgIcon('check'), 'Verified']));
  }
  if (active && meta.fileType) {
    chips.push(el('span', { class: 'npd-chip flac' }, [svgIcon('wave'), meta.fileType]));
  }

  const side = el('div', { class: 'npd-side' }, [
    el('div', { class: 'npd-vol' }, [
      svgIcon('volume'),
      themedSlider(state.volume, 'Volume', (f) => handlers.onVolume(f)),
      el('span', { class: 'npd-vol-num', text: String(Math.round(state.volume * 100)) }),
    ]),
    el('div', { class: 'npd-badges' }, chips),
  ]);

  return el('div', { class: 'now-playing-dock' }, [now, center, side]);
}

/**
 * Update the volatile parts of an existing dock (elapsed time, scrubber, volume)
 * without rebuilding it, so an in-progress slider drag is never interrupted.
 * A slider that currently has focus (is being dragged) is left untouched.
 */
export function updateNowPlaying(host: HTMLElement, state: PlayerState): void {
  const track = currentTrack(state);
  const duration = track?.durationSeconds ?? 0;
  const fraction = duration > 0 ? Math.min(1, state.elapsedSeconds / duration) : 0;

  const times = host.querySelectorAll<HTMLElement>('.npd-scrubber .npd-time');
  if (times[0]) times[0].textContent = formatTime(state.elapsedSeconds);
  if (times[1]) times[1].textContent = formatTime(duration);

  syncSlider(host.querySelector('.npd-scrubber .range-control'), fraction);

  const volNum = host.querySelector<HTMLElement>('.npd-vol-num');
  if (volNum) volNum.textContent = String(Math.round(state.volume * 100));
  syncSlider(host.querySelector('.npd-vol .range-control'), state.volume);
}

function syncSlider(control: Element | null, fraction: number): void {
  if (!(control instanceof HTMLElement)) return;
  const input = control.querySelector<HTMLInputElement>('.range-input');
  if (input && document.activeElement === input) return; // don't fight an active drag
  control.style.setProperty('--slider-value', `${(fraction * 100).toFixed(2)}%`);
  if (input) input.value = String(Math.round(fraction * 1000));
}
