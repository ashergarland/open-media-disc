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

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

interface TransportButtonOptions {
  active?: boolean;
  primary?: boolean;
  disabled?: boolean;
  extraClass?: string;
}

function transportButton(
  icon: IconName,
  label: string,
  onClick: () => void,
  options: TransportButtonOptions = {},
): HTMLElement {
  const classes = ['np-btn'];
  if (options.primary) classes.push('np-btn-primary');
  if (options.active) classes.push('is-active');
  if (options.extraClass) classes.push(options.extraClass);
  return el(
    'button',
    {
      class: classes.join(' '),
      'aria-label': label,
      title: label,
      disabled: options.disabled ? true : null,
      onclick: onClick,
    },
    [svgIcon(icon)],
  );
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag: string, attrs: Record<string, string>): SVGElement {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

/** A small skeuomorphic analog VU meter (decorative; the needle wobbles while playing). */
function vuMeter(live: boolean, label: string): HTMLElement {
  const svg = svgEl('svg', { class: 'vu-svg', viewBox: '0 0 72 46' });
  svg.append(svgEl('path', { class: 'vu-arc', d: 'M 10 27 A 30 30 0 0 1 57.2 20.8' }));
  svg.append(svgEl('path', { class: 'vu-arc-red', d: 'M 48.7 14.8 A 30 30 0 0 1 57.2 20.8' }));
  for (const angle of [-58, -38, -18, 2, 22, 42]) {
    const rad = (angle * Math.PI) / 180;
    svg.append(
      svgEl('line', {
        class: 'vu-tick',
        x1: (36 + 30 * Math.sin(rad)).toFixed(1),
        y1: (42 - 30 * Math.cos(rad)).toFixed(1),
        x2: (36 + 25 * Math.sin(rad)).toFixed(1),
        y2: (42 - 25 * Math.cos(rad)).toFixed(1),
      }),
    );
  }
  svg.append(svgEl('line', { class: 'vu-needle', x1: '36', y1: '42', x2: '36', y2: '13' }));
  svg.append(svgEl('circle', { class: 'vu-hub', cx: '36', cy: '42', r: '3' }));
  return el('div', { class: `vu-meter${live ? ' is-live' : ''}`, 'aria-hidden': 'true' }, [
    svg,
    el('span', { class: 'vu-label', text: label }),
  ]);
}

/** Build the Now Playing bar for the given player state. */
export function renderNowPlaying(state: PlayerState, handlers: NowPlayingHandlers): HTMLElement {
  const track = currentTrack(state);
  const hasTrack = track !== undefined;
  const duration = track?.durationSeconds ?? 0;
  const elapsed = state.elapsedSeconds;
  const fraction = duration > 0 ? Math.min(1, elapsed / duration) : 0;
  const playing = state.status === 'playing';

  const trackInfo = el('div', { class: 'np-track' }, [
    el('div', { class: 'np-thumb', 'aria-hidden': 'true' }, [svgIcon('create', 26)]),
    el('div', { class: 'np-track-text' }, [
      el('div', { class: 'np-title', text: track ? track.title : 'Nothing playing' }),
      el('div', {
        class: 'np-artist',
        text: track?.artist ?? (hasTrack ? '' : 'Load a disc from Player or Create Disc'),
      }),
    ]),
  ]);

  const repeatButton = transportButton('repeat', `Repeat: ${state.repeat}`, handlers.onCycleRepeat, {
    active: state.repeat !== 'off',
    extraClass: state.repeat === 'one' ? 'is-one' : undefined,
  });
  const transport = el('div', { class: 'np-transport' }, [
    transportButton('shuffle', 'Shuffle', handlers.onToggleShuffle, { active: state.shuffle }),
    transportButton('prev', 'Previous', handlers.onPrevious, { disabled: !hasTrack }),
    transportButton(playing ? 'pause' : 'play', playing ? 'Pause' : 'Play', handlers.onTogglePlay, {
      primary: true,
      disabled: !hasTrack,
    }),
    transportButton('next', 'Next', handlers.onNext, { disabled: !hasTrack }),
    repeatButton,
  ]);

  const scrubber = el('input', {
    class: 'np-scrubber',
    type: 'range',
    min: '0',
    max: '1000',
    value: String(Math.round(fraction * 1000)),
    disabled: hasTrack ? null : true,
    'aria-label': 'Seek',
  }) as HTMLInputElement;
  scrubber.addEventListener('input', () => handlers.onSeek(Number(scrubber.value) / 1000));
  scrubber.style.setProperty('--fill', String(fraction));

  const progress = el('div', { class: 'np-progress' }, [
    el('span', { class: 'np-time', text: formatTime(elapsed) }),
    scrubber,
    el('span', { class: 'np-time', text: formatTime(duration) }),
  ]);

  const volume = el('input', {
    class: 'np-volume',
    type: 'range',
    min: '0',
    max: '100',
    value: String(Math.round(state.volume * 100)),
    'aria-label': 'Volume',
  }) as HTMLInputElement;
  volume.addEventListener('input', () => handlers.onVolume(Number(volume.value) / 100));
  volume.style.setProperty('--fill', String(state.volume));

  const meters = el('div', { class: 'np-vu', 'aria-hidden': 'true' }, [
    vuMeter(playing, 'L'),
    vuMeter(playing, 'R'),
  ]);

  const badges = el('div', { class: `np-badges${hasTrack ? '' : ' is-dim'}` }, [
    el('span', { class: 'badge badge-verified' }, [svgIcon('check', 14), el('span', { text: 'Verified' })]),
    el('span', { class: 'badge badge-flac', text: 'FLAC' }),
  ]);

  const side = el('div', { class: 'np-side' }, [
    meters,
    el('div', { class: 'np-volume-wrap' }, [svgIcon('volume', 18), volume]),
    badges,
  ]);

  return el('footer', { class: 'now-playing' }, [
    trackInfo,
    el('div', { class: 'np-center' }, [transport, progress]),
    side,
  ]);
}
