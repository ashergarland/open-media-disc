/**
 * Framework-agnostic player model.
 *
 * This holds transport state and computes transitions as pure functions; it
 * does not touch the DOM or decode audio. The Studio renderer (and later the Pi
 * player) drive an HTML5 `<audio>` element from this state and feed playback
 * events (`timeupdate`, `ended`) back in. Keeping it pure makes the transport
 * logic testable and reusable across surfaces.
 */

/** A track queued for playback. */
export interface PlayerTrack {
  number: number;
  title: string;
  artist?: string;
  durationSeconds?: number;
  /** Resolved source for the `<audio>` element (file path or URL). */
  src: string;
}

export type RepeatMode = 'off' | 'all' | 'one';
export type PlaybackStatus = 'idle' | 'playing' | 'paused';

/** Immutable transport state. Every transition returns a new object. */
export interface PlayerState {
  tracks: PlayerTrack[];
  /** Indices into `tracks`, in playback order (shuffle-aware). */
  order: number[];
  /** Position within `order`, or -1 when the queue is empty. */
  position: number;
  status: PlaybackStatus;
  elapsedSeconds: number;
  /** 0..1. */
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
}

/** Seek to the start of the current track on `previous` within this many seconds. */
export const PREVIOUS_RESTART_THRESHOLD_SECONDS = 3;

/** A random source in [0, 1), injectable for deterministic tests. */
export type Rng = () => number;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sequentialOrder(length: number): number[] {
  return Array.from({ length }, (_, i) => i);
}

/** Fisher-Yates shuffle of `values` using `rng`, keeping `first` at the front when given. */
function shuffleOrder(length: number, rng: Rng, first?: number): number[] {
  const rest = sequentialOrder(length).filter((i) => i !== first);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = rest[i]!;
    const b = rest[j]!;
    rest[i] = b;
    rest[j] = a;
  }
  return first === undefined ? rest : [first, ...rest];
}

/** Options for {@link createPlayerState}. */
export interface CreatePlayerStateOptions {
  volume?: number;
  shuffle?: boolean;
  repeat?: RepeatMode;
  /** Randomness for the initial shuffle. Defaults to `Math.random`. */
  rng?: Rng;
}

/** Build an initial player state from a track queue. */
export function createPlayerState(
  tracks: PlayerTrack[],
  options: CreatePlayerStateOptions = {},
): PlayerState {
  const shuffle = options.shuffle ?? false;
  const order =
    shuffle && tracks.length > 0
      ? shuffleOrder(tracks.length, options.rng ?? Math.random, 0)
      : sequentialOrder(tracks.length);
  return {
    tracks,
    order,
    position: tracks.length > 0 ? 0 : -1,
    status: 'idle',
    elapsedSeconds: 0,
    volume: clamp(options.volume ?? 1, 0, 1),
    shuffle,
    repeat: options.repeat ?? 'off',
  };
}

/** The index into `tracks` of the current track, or -1. */
export function currentTrackIndex(state: PlayerState): number {
  if (state.position < 0 || state.position >= state.order.length) return -1;
  return state.order[state.position]!;
}

/** The current track, or undefined when the queue is empty. */
export function currentTrack(state: PlayerState): PlayerTrack | undefined {
  const index = currentTrackIndex(state);
  return index >= 0 ? state.tracks[index] : undefined;
}

/** Begin (or resume) playback if a track is available. */
export function play(state: PlayerState): PlayerState {
  if (state.position < 0) return state;
  return { ...state, status: 'playing' };
}

/** Pause playback. */
export function pause(state: PlayerState): PlayerState {
  if (state.status !== 'playing') return state;
  return { ...state, status: 'paused' };
}

/** Toggle between playing and paused. */
export function togglePlay(state: PlayerState): PlayerState {
  return state.status === 'playing' ? pause(state) : play(state);
}

/** Stop playback and rewind to the start of the current track. */
export function stop(state: PlayerState): PlayerState {
  return { ...state, status: 'idle', elapsedSeconds: 0 };
}

/** Select a track by its index into `tracks` and start it from the top. */
export function selectTrack(state: PlayerState, trackIndex: number): PlayerState {
  const position = state.order.indexOf(trackIndex);
  if (position < 0) return state;
  return { ...state, position, elapsedSeconds: 0, status: 'playing' };
}

/** Advance to the next track, honoring the repeat mode. */
export function next(state: PlayerState): PlayerState {
  if (state.position < 0) return state;
  if (state.position + 1 < state.order.length) {
    return { ...state, position: state.position + 1, elapsedSeconds: 0, status: 'playing' };
  }
  // At the end of the queue.
  if (state.repeat === 'off') {
    return { ...state, position: 0, elapsedSeconds: 0, status: 'idle' };
  }
  return { ...state, position: 0, elapsedSeconds: 0, status: 'playing' };
}

/** Go to the previous track, or restart the current one when playback has advanced. */
export function previous(state: PlayerState): PlayerState {
  if (state.position < 0) return state;
  if (state.elapsedSeconds >= PREVIOUS_RESTART_THRESHOLD_SECONDS) {
    return { ...state, elapsedSeconds: 0 };
  }
  if (state.position > 0) {
    return { ...state, position: state.position - 1, elapsedSeconds: 0, status: 'playing' };
  }
  if (state.repeat === 'all') {
    return { ...state, position: state.order.length - 1, elapsedSeconds: 0, status: 'playing' };
  }
  return { ...state, elapsedSeconds: 0 };
}

/** Handle the current track finishing, honoring the repeat mode. */
export function trackEnded(state: PlayerState): PlayerState {
  if (state.position < 0) return state;
  if (state.repeat === 'one') {
    return { ...state, elapsedSeconds: 0, status: 'playing' };
  }
  return next(state);
}

/** Update the elapsed time (clamped to the track duration when known). */
export function setElapsed(state: PlayerState, seconds: number): PlayerState {
  const duration = currentTrack(state)?.durationSeconds;
  const max = duration ?? Number.POSITIVE_INFINITY;
  return { ...state, elapsedSeconds: clamp(seconds, 0, max) };
}

/** Set the volume, clamped to 0..1. */
export function setVolume(state: PlayerState, volume: number): PlayerState {
  return { ...state, volume: clamp(volume, 0, 1) };
}

/** Enable or disable shuffle, rebuilding the order and keeping the current track. */
export function setShuffle(state: PlayerState, shuffle: boolean, rng: Rng = Math.random): PlayerState {
  if (shuffle === state.shuffle) return state;
  const current = currentTrackIndex(state);
  const order = shuffle
    ? shuffleOrder(state.tracks.length, rng, current >= 0 ? current : undefined)
    : sequentialOrder(state.tracks.length);
  const position = current >= 0 ? order.indexOf(current) : state.tracks.length > 0 ? 0 : -1;
  return { ...state, shuffle, order, position };
}

/** Toggle shuffle. */
export function toggleShuffle(state: PlayerState, rng: Rng = Math.random): PlayerState {
  return setShuffle(state, !state.shuffle, rng);
}

/** Set the repeat mode. */
export function setRepeat(state: PlayerState, repeat: RepeatMode): PlayerState {
  return { ...state, repeat };
}

/** Cycle repeat off -> all -> one -> off. */
export function cycleRepeat(state: PlayerState): PlayerState {
  const nextMode: RepeatMode =
    state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off';
  return { ...state, repeat: nextMode };
}

/** A track-like input for {@link playerTracksFromTracks}; an OMD manifest track satisfies it. */
export interface TrackInput {
  number: number;
  title: string;
  filename: string;
  durationSeconds?: number;
  artist?: string;
}

/**
 * Build an ordered player queue from OMD manifest tracks, resolving each track's
 * `filename` to a playable `src` with the provided resolver.
 */
export function playerTracksFromTracks(
  tracks: TrackInput[],
  resolveSrc: (filename: string) => string,
): PlayerTrack[] {
  return [...tracks]
    .sort((a, b) => a.number - b.number)
    .map((track) => ({
      number: track.number,
      title: track.title,
      src: resolveSrc(track.filename),
      ...(track.artist !== undefined ? { artist: track.artist } : {}),
      ...(track.durationSeconds !== undefined ? { durationSeconds: track.durationSeconds } : {}),
    }));
}
