import { describe, expect, it } from 'vitest';
import {
  createPlayerState,
  currentTrack,
  currentTrackIndex,
  cycleRepeat,
  next,
  pause,
  play,
  playerTracksFromTracks,
  previous,
  selectTrack,
  setElapsed,
  setShuffle,
  setVolume,
  trackEnded,
  type PlayerTrack,
} from '../src/index.js';

const tracks: PlayerTrack[] = [
  { number: 1, title: 'One', src: 'a.flac', durationSeconds: 100 },
  { number: 2, title: 'Two', src: 'b.flac', durationSeconds: 120 },
  { number: 3, title: 'Three', src: 'c.flac', durationSeconds: 90 },
];

describe('createPlayerState', () => {
  it('starts idle at the first track', () => {
    const state = createPlayerState(tracks);
    expect(state.position).toBe(0);
    expect(state.status).toBe('idle');
    expect(state.order).toEqual([0, 1, 2]);
    expect(currentTrack(state)?.title).toBe('One');
  });

  it('has no current track for an empty queue', () => {
    const state = createPlayerState([]);
    expect(state.position).toBe(-1);
    expect(currentTrack(state)).toBeUndefined();
    expect(play(state).status).toBe('idle');
  });
});

describe('transport', () => {
  it('plays, pauses, and toggles', () => {
    let state = createPlayerState(tracks);
    state = play(state);
    expect(state.status).toBe('playing');
    state = pause(state);
    expect(state.status).toBe('paused');
  });

  it('advances and stops at the end when repeat is off', () => {
    let state = play(createPlayerState(tracks));
    state = next(state);
    expect(currentTrackIndex(state)).toBe(1);
    state = next(state);
    expect(currentTrackIndex(state)).toBe(2);
    state = next(state);
    expect(state.status).toBe('idle');
    expect(state.position).toBe(0);
  });

  it('wraps to the first track when repeat is all', () => {
    let state = createPlayerState(tracks, { repeat: 'all' });
    state = { ...state, position: 2 };
    state = next(state);
    expect(state.position).toBe(0);
    expect(state.status).toBe('playing');
  });

  it('repeats the same track on end when repeat is one', () => {
    let state = createPlayerState(tracks, { repeat: 'one' });
    state = setElapsed(play(state), 50);
    state = trackEnded(state);
    expect(currentTrackIndex(state)).toBe(0);
    expect(state.elapsedSeconds).toBe(0);
    expect(state.status).toBe('playing');
  });

  it('restarts the current track on previous after 3 seconds', () => {
    let state = setElapsed(play(next(createPlayerState(tracks))), 5);
    expect(currentTrackIndex(state)).toBe(1);
    state = previous(state);
    expect(currentTrackIndex(state)).toBe(1);
    expect(state.elapsedSeconds).toBe(0);
  });

  it('steps back on previous within 3 seconds', () => {
    let state = setElapsed(play(next(createPlayerState(tracks))), 1);
    state = previous(state);
    expect(currentTrackIndex(state)).toBe(0);
  });

  it('selects a track by index', () => {
    const state = selectTrack(createPlayerState(tracks), 2);
    expect(currentTrackIndex(state)).toBe(2);
    expect(state.status).toBe('playing');
  });
});

describe('seek and volume', () => {
  it('clamps elapsed to the track duration', () => {
    const state = setElapsed(createPlayerState(tracks), 500);
    expect(state.elapsedSeconds).toBe(100);
  });

  it('clamps volume to 0..1', () => {
    expect(setVolume(createPlayerState(tracks), 2).volume).toBe(1);
    expect(setVolume(createPlayerState(tracks), -1).volume).toBe(0);
  });
});

describe('shuffle and repeat', () => {
  it('keeps the current track first and stays a permutation when shuffled', () => {
    let state = next(createPlayerState(tracks)); // current track index 1
    state = setShuffle(state, true, () => 0);
    expect(state.shuffle).toBe(true);
    expect(state.order[0]).toBe(1);
    expect([...state.order].sort()).toEqual([0, 1, 2]);
    expect(currentTrackIndex(state)).toBe(1);
  });

  it('restores sequential order when shuffle is turned off', () => {
    let state = setShuffle(createPlayerState(tracks), true, () => 0);
    state = setShuffle(state, false);
    expect(state.order).toEqual([0, 1, 2]);
  });

  it('cycles repeat off -> all -> one -> off', () => {
    let state = createPlayerState(tracks);
    expect(state.repeat).toBe('off');
    state = cycleRepeat(state);
    expect(state.repeat).toBe('all');
    state = cycleRepeat(state);
    expect(state.repeat).toBe('one');
    state = cycleRepeat(state);
    expect(state.repeat).toBe('off');
  });
});

describe('playerTracksFromTracks', () => {
  it('orders by number and resolves the src', () => {
    const result = playerTracksFromTracks(
      [
        { number: 2, title: 'B', filename: 'AUDIO/02 - B.flac', durationSeconds: 30 },
        { number: 1, title: 'A', filename: 'AUDIO/01 - A.flac', artist: 'Artist' },
      ],
      (f) => `file:///disc/${f}`,
    );
    expect(result.map((t) => t.title)).toEqual(['A', 'B']);
    expect(result[0]!.src).toBe('file:///disc/AUDIO/01 - A.flac');
    expect(result[0]!.artist).toBe('Artist');
    expect(result[1]!.durationSeconds).toBe(30);
  });
});
