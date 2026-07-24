# @open-media-disc/ui

Shared UI kit for Open Media Disc: the token-based **theme engine** and a
framework-agnostic **player model**. Both are pure TypeScript with no DOM or
framework dependency, so OMD Studio and the future Pi player reuse the same
logic.

## Theme engine

A theme is data only: named design tokens plus optional local assets. Themes
never ship CSS, JavaScript, or layout. Tokens resolve to CSS custom properties
(for example `accent` becomes `--omd-accent`) that the shell and player read.
Four themes ship built in: **Frutiger Aero** (the default cool aqua glass),
**DORFic** (warm amber), **Technozen** (sage green), and **Dark Aero** (neon
cyan on a dark canvas).

```ts
import { FRUTIGER_AERO_THEME, resolveTheme, applyTheme } from '@open-media-disc/ui';

const resolved = resolveTheme(FRUTIGER_AERO_THEME);
applyTheme(document.documentElement, resolved); // sets --omd-* variables
```

Missing tokens fall back to the base for the theme's `type`, so partial themes
still resolve to a complete set. Remote texture URLs are rejected (only relative
paths and `data:` URIs are allowed) to keep the Electron renderer sandboxed.

## Player model

An immutable transport model driven by pure transitions. It does not decode
audio; the renderer drives an HTML5 `<audio>` element from this state and feeds
`timeupdate` / `ended` events back in.

```ts
import {
  createPlayerState,
  playerTracksFromTracks,
  next,
  togglePlay,
} from '@open-media-disc/ui';

const tracks = playerTracksFromTracks(manifest.tracks, (f) => `file:///disc/${f}`);
let state = createPlayerState(tracks);
state = togglePlay(state); // -> playing
state = next(state); // advance, honoring repeat/shuffle
```

Transitions cover play/pause, next/previous, seek, volume, shuffle (with an
injectable RNG for deterministic tests), and repeat (`off` / `all` / `one`).
