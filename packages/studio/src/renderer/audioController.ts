/**
 * Audio controller: the single source of truth for playback.
 *
 * It owns one `<audio>` element and the shared UI-kit player state, applying
 * state transitions to the element and reflecting element events back into the
 * state. Both the global Now Playing bar and the Player view drive and observe
 * this controller, so playback continues seamlessly across views. Audio is
 * streamed through the `omd-audio://` protocol registered in the main process.
 */

import {
  createPlayerState,
  currentTrack,
  currentTrackIndex,
  cycleRepeat as uiCycleRepeat,
  next as uiNext,
  previous as uiPrevious,
  selectTrack as uiSelectTrack,
  setElapsed,
  setVolume as uiSetVolume,
  togglePlay as uiTogglePlay,
  toggleShuffle as uiToggleShuffle,
  trackEnded as uiTrackEnded,
  play as uiPlay,
  type PlayerState,
  type PlayerTrack,
} from '@open-media-disc/ui';

type Listener = () => void;

let audio: HTMLAudioElement;
let state: PlayerState;
let started = false;
const listeners = new Set<Listener>();

// Web Audio analyser for the real-time dock equalizer. Set up lazily on the
// first play (after a user gesture, so autoplay policy is satisfied).
let audioCtx: AudioContext | undefined;
let analyser: AnalyserNode | undefined;
let sourceNode: MediaElementAudioSourceNode | undefined;
let freqData: Uint8Array<ArrayBuffer> | undefined;

function emit(): void {
  for (const listener of listeners) listener();
}

/**
 * Route the audio element through an AnalyserNode so the equalizer can read live
 * frequency data. Idempotent; falls back to direct output if Web Audio fails.
 */
function ensureAnalyser(): void {
  if (analyser || !audio) return;
  try {
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.8;
    sourceNode = audioCtx.createMediaElementSource(audio);
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);
    freqData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
  } catch {
    // Keep audio audible even if the analyser could not be created.
    try {
      if (sourceNode && audioCtx) sourceNode.connect(audioCtx.destination);
    } catch {
      // Nothing more we can do; playback continues via the element.
    }
    analyser = undefined;
  }
}

/**
 * Sample the current audio into `bars` normalized (0..1) frequency bands for the
 * equalizer. Returns zeros when nothing is analysable (paused, or no analyser).
 */
export function getLevels(bars: number): number[] {
  const out = new Array<number>(bars).fill(0);
  if (!analyser || !freqData || state.status !== 'playing') return out;
  analyser.getByteFrequencyData(freqData);
  // Music energy sits in the lower part of the spectrum; ignore the sparse top.
  const usable = Math.max(bars, Math.floor(freqData.length * 0.7));
  const per = usable / bars;
  for (let b = 0; b < bars; b += 1) {
    let sum = 0;
    let count = 0;
    for (let i = Math.floor(b * per); i < Math.floor((b + 1) * per) && i < usable; i += 1) {
      sum += freqData[i]!;
      count += 1;
    }
    out[b] = count ? sum / count / 255 : 0;
  }
  return out;
}

/** Create the audio element and wire element events. Idempotent. */
export function initPlayer(): void {
  if (started) return;
  audio = new Audio();
  state = createPlayerState([]);
  audio.addEventListener('timeupdate', () => {
    state = setElapsed(state, audio.currentTime);
    emit();
  });
  audio.addEventListener('ended', () => transition(uiTrackEnded(state)));
  started = true;
}

/** Subscribe to state changes; returns an unsubscribe function. */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState(): PlayerState {
  return state;
}

function syncSrc(): void {
  const src = currentTrack(state)?.src ?? '';
  if (audio.src !== src) audio.src = src;
}

function applyPlayback(): void {
  audio.volume = state.volume;
  if (state.status === 'playing') {
    ensureAnalyser();
    if (audioCtx?.state === 'suspended') void audioCtx.resume();
    void audio.play().catch(() => undefined);
  } else {
    audio.pause();
  }
}

function transition(nextState: PlayerState): void {
  const previousIndex = currentTrackIndex(state);
  state = nextState;
  const nextIndex = currentTrackIndex(state);
  if (nextIndex !== previousIndex) {
    syncSrc();
    audio.currentTime = 0;
    state = setElapsed(state, 0);
  } else if (state.elapsedSeconds === 0 && audio.currentTime > 0.05) {
    // A restart of the current track (for example, previous within 3 seconds).
    audio.currentTime = 0;
  }
  applyPlayback();
  emit();
}

/** Load a queue and hold at the first track (optionally start playing). */
export function loadDisc(tracks: PlayerTrack[], autoplay = false): void {
  state = createPlayerState(tracks, { volume: state.volume });
  syncSrc();
  audio.currentTime = 0;
  state = setElapsed(state, 0);
  if (autoplay && tracks.length > 0) state = uiPlay(state);
  applyPlayback();
  emit();
}

export function togglePlayPause(): void {
  transition(uiTogglePlay(state));
}

export function playTrack(trackIndex: number): void {
  transition(uiSelectTrack(state, trackIndex));
}

export function next(): void {
  transition(uiNext(state));
}

export function previous(): void {
  transition(uiPrevious(state));
}

export function toggleShuffle(): void {
  state = uiToggleShuffle(state);
  emit();
}

export function cycleRepeat(): void {
  state = uiCycleRepeat(state);
  emit();
}

export function setVolume(value: number): void {
  state = uiSetVolume(state, value);
  audio.volume = state.volume;
  emit();
}

export function seekFraction(fraction: number): void {
  const duration = currentTrack(state)?.durationSeconds ?? (Number.isFinite(audio.duration) ? audio.duration : 0);
  const time = Math.max(0, Math.min(duration, fraction * duration));
  audio.currentTime = time;
  state = setElapsed(state, time);
  emit();
}
