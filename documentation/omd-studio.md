# OMD Studio (alpha): player theming and ripping

This is the design note for two OMD Studio (alpha) additions locked in during
planning: a **themeable in-app player** and **verified disc ripping** (`omd
rip`). It complements the
[OMD Studio (alpha) milestone](./roadmap.md#milestone-omd-studio-alpha) in the
roadmap.

OMD Studio wraps the same core modules as the `omd` CLI, with no duplicated
logic. Both features below follow that rule: shared, testable logic first, then
the GUI wraps it.

## Navigation and layout (locked)

OMD Studio uses a **sidebar layout**:

- A slim left navigation rail with icon-and-label items: Create Disc, Player,
  Catalog, Themes, and Settings.
- A large main content area for the active view.
- A slim persistent **Now Playing** bar across the bottom (album thumbnail, track
  and artist, scrubber, transport, a small VU meter, volume, and the Verified and
  FLAC badges) so playback continues while you move through the create flow.

Why the sidebar: it scales as the app grows (catalog, themes, settings), it reads
as a focused publishing workstation, and it shares lineage with the VS Code-style
token theming below. The layout stays fixed; only the theme changes.

Default theme: **Y2K / Frutiger Aero** (glossy aqua glass) is the default skin.
Other skins (for example Classic Amp, Hi-Fi Silver, Cassette) ship through the
token theme system described below.

### Touch-first hardware (Raspberry Pi and appliances)

The sidebar is a desktop choice. For touch-first environments, a **dashboard tile
launcher** layout is preferred: large tap targets as glossy tiles (Play a Disc,
Create a Disc, Catalog, Now Playing, Themes, Settings) with a live Now Playing
tile. This is the better fit for **Raspberry Pi touchscreen devices and simple
appliance-style OMD hardware**, and it should inform the future Pi player UI. It
reuses the same shared components and theming contract; only the shell layout
differs from the desktop app.

## The integrated player

- Studio plays a mounted OMD disc **in-app**, not by launching an external
  player. The intended moment is simple: insert a disc and it plays beautifully
  inside OMD.
- FLAC plays natively in Chromium (so in Electron), so no custom decoder is
  needed for alpha. The external players (`mpv`, `ffplay`) stay a CLI fallback
  only.
- Scope discipline: this is an **album/disc player, not a music library
  manager**. It plays the inserted OMD and packages you built. No streaming,
  tagging, or large-library management in alpha.

## Theming model (VS Code-style token themes)

The goal is retro, Winamp-inspired looks with modern, consistent usability. The
lesson from old skins is that they controlled both look **and** layout, which is
what made them confusing. OMD splits the two:

- **Theme layer (swappable):** colors, typography, shape, and decoration,
  expressed as named tokens in a JSON file.
- **Layout and interaction layer (fixed):** transport controls, track list,
  overall flow, and keyboard shortcuts stay consistent across every theme.

How it works (the VS Code mechanic):

- A theme is **data**: a JSON file that assigns values to a fixed, documented
  vocabulary of named tokens.
- At runtime OMD injects those tokens as **CSS variables** (for example
  `--omd-accent`) onto the DOM. Every component reads only from those variables
  and never hardcodes a color.
- A `type` (`light` or `dark`) sets the base, so any token a theme omits inherits
  a sensible default. A theme can override a few tokens or all of them.
- Themes **cannot** ship arbitrary CSS or JS, and cannot move or restyle the
  layout. That constraint is exactly what keeps every theme safe, portable, and
  usable.

### The v1 theming contract (locked)

This is the v1 token vocabulary. Treat it as a contract: names are stable within
v1, and new capabilities are added as new tokens rather than by renaming existing
ones.

Colors:

- `app.background`
- `surface.background`
- `text.primary`
- `text.muted`
- `accent`
- `transport.button`
- `transport.buttonActive`
- `progress.track`
- `progress.fill`
- `vu.low`
- `vu.high`

Typography:

- `typography.uiFont`
- `typography.displayFont` (the large track title)

Shape:

- `shape.radius`
- `shape.borderStyle`
- `shape.glow`

Decoration:

- `texture` (optional local background image asset)
- `visualizer` (enum: `bars`, `oscilloscope`, or `none`)

Rules (locked):

- **Data only.** A theme is JSON plus optional local assets. No CSS, no JS.
- **No layout control.** Themes cannot move, add, or remove controls, or change
  positioning.
- **Graceful fallback.** Omitted tokens inherit from the base `type`.
- **Local assets only.** `texture` references a bundled or local file. Remote
  URLs are not allowed.
- **Stable names.** Token names do not change within v1; new capabilities add new
  tokens.

Example theme file:

```jsonc
{
  "name": "Classic Amp",
  "type": "dark",
  "colors": {
    "app.background": "#1a1a1a",
    "surface.background": "#232323",
    "text.primary": "#c8f7c5",
    "text.muted": "#6a8a6a",
    "accent": "#39ff14",
    "transport.button": "#c8f7c5",
    "transport.buttonActive": "#39ff14",
    "progress.track": "#333333",
    "progress.fill": "#39ff14",
    "vu.low": "#39ff14",
    "vu.high": "#ff5f56"
  },
  "typography": { "uiFont": "Inter", "displayFont": "VT323" },
  "shape": { "radius": "2px", "borderStyle": "solid", "glow": "0 0 6px #39ff14" },
  "visualizer": "bars",
  "texture": "assets/scanlines.png"
}
```

Each token maps to a CSS variable (for example `colors.accent` becomes
`--omd-accent`), and components consume the variables only.

Security note: because this is an Electron app, arbitrary theme CSS or JS would be
a real risk (CSS can exfiltrate through `background-image` URLs, and JS is remote
code execution). Keeping themes as data (tokens plus local assets) makes shared
community themes safe by construction. Validate theme JSON against the token
vocabulary and reject remote asset URLs.

Theme packs: ship a clean modern default plus retro packs (for example Classic
Amp, Hi-Fi Silver, Cassette, CRT). Every theme must still pass contrast and
hit-target checks, so retro never means unusable. If community themes bundle
fonts, mind font licensing; the safest option is a curated, bundled font set.

## `omd rip` (verified read-back and archival)

Rationale: burning writes a disc, and ripping reads it back. Ripping makes an OMD
disc a real archival medium instead of a dead end, and it closes the loop:
download, package, label, burn, verify, play, rip.

This is **not** CD-DA extraction. An OMD is FLAC files in a UDF filesystem, so
ripping is a verified file copy, not audio extraction. There are no
track-boundary guesses and no CDDB lookups.

Command surface (a shared core function plus a CLI command, which Studio wraps,
consistent with how `label`, `burn`, and `play` work):

```text
omd rip <drive> --out <dir> [--mode package|album]
```

Verification: rip reads each file and checks it against the manifest
`CHECKSUMS.sha256`. A rip can therefore **certify** a disc (for example "ripped
6/6 tracks, all checksums matched"). A checksum mismatch is reported per file and
the affected files are marked failed.

Output modes:

- `package` (default): copy the OMD package faithfully, so the result is a
  re-burnable, byte-faithful archival clone.
- `album`: emit a friendly album folder (FLAC tracks plus cover art) laid out for
  use in other players.

Format impact: none. Rip reads the existing format and does not change it, so
`omdVersion` stays `0.1.0`. This is a software feature under the OMD Studio
(alpha) milestone.

Catalog note: when the optional local catalog arrives, a rip is recorded against
the disc (ripped, verified, output path), the same way burn and verify are.

## Architecture impact

- Player and theming belong in a **shared UI package** (for example
  `packages/player` or `packages/ui`), so OMD Studio and the future Raspberry Pi
  player reuse the same components, playback state model, and theming contract.
  Studio owns the desktop shell and the burn and label workflows; the Pi player
  is a lean, player-first app built from the same parts. The Pi player uses a
  touch-first dashboard layout rather than the desktop sidebar (see Navigation
  and layout).
- `omd rip` is a core function plus a CLI command. Studio calls the same
  function, so no logic is duplicated in the UI.

## Version checkpoint

These features land incrementally under the OMD Studio (alpha) milestone. Each
increment is a patch bump; the milestone becomes a minor bump only when the
maintainer says so. Neither feature changes the disc format.
