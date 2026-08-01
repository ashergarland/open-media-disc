# OMD Studio

**OMD Studio** is the desktop and touch application for Open Media Disc. It wraps
the same core modules as the `omd` CLI, with no duplicated logic: shared, testable
logic first, then the GUI wraps it. It belongs to the
[OMD Studio (alpha) milestone](./roadmap.md#milestone-omd-studio-alpha) in the
roadmap.

Studio is built with Electron. The main process reuses `@open-media-disc/core`
directly; the renderer talks to it through a small, explicit `window.omd` bridge
(context isolation on, no Node in the renderer).

One application serves two surfaces: a desktop window and a Raspberry Pi touch
panel. There is no separate desktop layout and no separate touch layout. The
working brief behind the current shape is
[the redesign plan](./redesign-plan.md).

## Navigation and layout

Studio is **hub and spoke**, built for touch first and for a mouse just as well:

- **Home hub.** The landing screen: the OMD Studio brand, a catalog search box,
  a now-playing status pill, three large job tiles (Play a Disc, Create a Disc,
  Catalog), and a second row with a live Now Playing tile plus Themes and
  Settings.
- **Screens.** Every other view is a full screen with a sticky top bar whose only
  navigation control is a Home button. There is no persistent nav rail; you go
  Home and pick the next job.
- **Transport dock.** A persistent bar across the bottom of every screen: cover
  thumbnail, track and artist, transport buttons, a scrubber, volume, a live
  spectrum driven by the real Web Audio analyser, and the Verified and codec
  chips. Playback continues while you move between screens.

Everything fits the viewport. The page itself never scrolls; only bounded regions
such as a track list or a catalog grid do, and the top bar and transport dock stay
put while those regions scroll. See
[Screen sizes and kiosk mode](#screen-sizes-and-kiosk-mode).

## The views

| View | What it does |
| --- | --- |
| **Home** | The hub: search, job tiles, Now Playing, Themes, Settings. |
| **Disc** | The inserted physical disc: cover, metadata, track list, capacity meter, background integrity verify, and Rip to Catalog. |
| **Catalog** | Your library folder of OMD packages: browse, search, play, edit metadata, delete, import music, start a mixtape, and open Label sheets. |
| **Create a Disc** | Pick a source, then burn it. |
| **Labels** | Build a printable label sheet from catalog covers and your own images, then print or export a PDF. |
| **Themes** | Live theme picker. |
| **Settings** | Version information and the optical drives, with a rescan. |

### Disc

Studio polls the optical drives and loads an inserted OMD disc automatically, so
the usual flow is: insert a disc and it appears. The disc loads quickly (without
rehashing every track), then a background integrity check runs and flips the badge
from Verifying to Verified or Not verified. The screen shows the cover, the album
metadata, the honest codec line, a cartridge visual with a used and free capacity
meter, and the track list. **Rip to Catalog** copies the disc back to your library
as a verified package (see [`omd rip`](#omd-rip-verified-read-back-and-archival)).

### Catalog

The catalog is a plain folder of OMD packages that you choose. There is no
database. Studio watches the folder, so a package that a rip, burn, or import
creates appears without a manual refresh. From a catalog album you can play it,
burn it, edit its metadata (album, artist, year, disc title, per-track titles, and
the cover), reveal it in the file manager, or delete it.

**Import music** packages a folder of audio into the catalog. Each album is
reviewed before it is written: Studio inspects the source, prefills the metadata
(including a suggested disc title and Various Artists handling), shows which audio
formats are present, and lets you pick the format to store. Mixed-format sources
are converted with the bundled ffmpeg; a folder that is already one format is
copied as is.

**New mixtape** compiles tracks picked from across the catalog into a new package.

### Create a Disc

Create a Disc is a source chooser, then a burn screen.

The chooser offers four sources:

- **From catalog:** burn an album already in your library.
- **Import a package:** burn an existing OMD package folder.
- **Import music:** package a folder of audio, then burn it.
- **New mixtape:** compile tracks into a disc, then burn it.

The burn screen probes the selected drive and reports the **real disc**: media
type, capacity, whether it is blank, and whether it is rewritable or write once.
It uses the same cartridge visual and used-and-free meter as the Disc screen.
Burning is blocked, with the reason shown, when there is no disc in the drive, when
a write-once disc already has data, or when the selection will not fit. The
confirmation describes what will actually happen, so the erase warning only appears
for a used rewritable disc.

The track list allows per-track removal **for that burn only**. A trimmed package
is compiled into a temporary folder, burned, and deleted afterwards; the catalog
package is never modified.

### Labels

Labels builds a print-ready sheet from catalog covers and any extra images you
add, using a template (a packed rectangular sheet such as mini CD jewel case, or a
die-cut disc sheet whose geometry is measured for a specific stock). You choose
copies per item, preview every page, and then print or export a PDF. A label
session (template, fit, chosen packages, and embedded custom images) can be saved
and reopened as an `.omdsession.json` file.

Die-cut sheets must be printed at 100 percent or actual size. Any "fit to page"
scaling puts the artwork out of registration with the die cut.

## The integrated player

- Studio plays a mounted OMD disc **in-app**, not by launching an external
  player. The intended moment is simple: insert a disc and it plays inside OMD.
- Chromium (so Electron) decodes the supported audio formats natively, so no
  custom decoder is needed. The external players (`mpv`, `ffplay`) stay a CLI
  fallback only.
- One player engine serves everything: the Disc screen, catalog albums, and the
  transport dock all drive the same playback state, so starting a catalog album
  and then walking to another screen keeps playing.
- Scope discipline: this is an **album and disc player, not a music library
  manager**. It plays the inserted OMD and the packages you built. No streaming,
  tagging, or large-library management in alpha.

## Honest codec language

Studio never claims quality it cannot prove. A package stores one audio format,
and "lossless" is a property of the **container**, not of the audio's history: a
FLAC transcoded from an MP3 is not lossless. So the UI shows the **real codec plus
factual facts** instead of a quality badge:

- Always the codec and the sample rate, for example `FLAC · 44.1 kHz`.
- Bit depth only for a lossless codec, for example `FLAC · 44.1 kHz · 16-bit`.
- Bitrate only for a lossy codec, for example `MP3 · 44.1 kHz · 320 kbps`.

Bit depth is a PCM concept and is meaningless on a lossy codec; bitrate is the
quality signal for a lossy codec and noise for a lossless one. There is no "FLAC
lossless" badge and no fixed bit-depth claim anywhere in the app.

Note that the format id `OMD-FLAC-DATA` and `omdVersion 0.1.0` are unchanged on
purpose. The id is a legacy string kept so existing packages stay valid; it does
not mean a package must be FLAC.

## Theming

The goal is a look you can change without the app becoming inconsistent. The
lesson from old skins is that they controlled both look **and** layout, which is
what made them confusing. OMD Studio splits the two:

- **Theme layer (swappable):** colors, surfaces, borders, and accents, expressed
  as named `--omd-*` CSS custom properties.
- **Layout and interaction layer (fixed):** the transport, track lists, screens,
  and flow stay identical across every theme.

How it works:

- There is **one shared component stylesheet**, `components.css`. Every component
  reads `--omd-*` variables and never hardcodes a color. `shell.css` carries
  layout only. **There is no per-theme stylesheet.**
- A **theme is a token map**: a block of `--omd-*` overrides scoped to a
  `data-theme` value. Applying a theme sets `data-theme` on the document root, so
  switching is an instant variable swap with no stylesheet fetch and therefore no
  unstyled flash.
- A theme overrides only the base primitives. Derived tokens (controls, focus
  rings, slider parts) reference those primitives, so they follow automatically.
- The choice persists in `localStorage`, and the Themes screen is a live picker:
  each theme is a card with a swatch strip, and selecting one applies it
  immediately.

### The built-in themes

| Theme | Type | Character |
| --- | --- | --- |
| **Midnight** | Dark | The default. Deep navy surfaces with a cyan accent. |
| **Daylight** | Light | White surfaces, dark ink, a deeper cyan accent. |
| **Ember** | Dark | Warm charcoal with an amber accent. |

### Renderer constraints

These are hard rules for anyone touching the Studio UI:

- **Strict CSP.** The renderer runs under
  `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:;
  media-src 'self' omd-audio:; font-src 'self'`. No remote fonts, no `fetch`, no
  inline `style=` attributes in static HTML. Dynamic styling goes through CSSOM
  (`element.style.setProperty(...)`) or class toggles, which CSP allows.
- **Tokens, not hardcoded values.** New components read `--omd-*`. A hardcoded
  color is a theme bug waiting to happen.
- **Touch targets** hold at `--omd-tap` (44px), and vertical sizing uses `vmin`
  rather than `vw` so a short but wide panel shrinks correctly.

### Importable themes (future)

User and community themes are a **future milestone**, not something Studio ships
today. The current three themes are first-party token maps in `components.css`.

When importable themes arrive they stay **data only**: a file that assigns values
to a documented `--omd-*` vocabulary, plus optional local assets. No CSS, no JS,
no remote URLs, and no ability to move or restyle the layout. That constraint is
what makes shared themes safe in an Electron app, where arbitrary CSS can
exfiltrate through a `background-image` URL and arbitrary JS is remote code
execution. The work needed to get there is mostly promoting the remaining
hardcoded values in the component kit into named tokens; the shared stylesheet and
the `data-theme` mechanism are already the right shape.

## `omd rip` (verified read-back and archival)

Rationale: burning writes a disc, and ripping reads it back. Ripping makes an OMD
disc a real archival medium instead of a dead end, and it closes the loop:
download, package, label, burn, verify, play, rip.

This is **not** CD-DA extraction. An OMD is audio files in a UDF filesystem, so
ripping is a verified file copy, not audio extraction. There are no
track-boundary guesses and no CDDB lookups.

Command surface (a shared core function plus a CLI command, which Studio wraps,
consistent with how `label`, `burn`, and `play` work):

```text
omd rip <drive> --out <dir> [--mode package|album]
```

In Studio this is the **Rip to Catalog** button on the Disc screen: it rips the
inserted disc into your catalog folder in `package` mode, reports progress, and
the new package then appears in the Catalog.

Verification: rip reads each file and checks it against the manifest
`CHECKSUMS.sha256`. A rip can therefore **certify** a disc (for example "ripped
6/6 tracks, all checksums matched"). A checksum mismatch is reported per file and
the affected files are marked failed.

Output modes:

- `package` (default): copy the OMD package faithfully, so the result is a
  re-burnable, byte-faithful archival clone.
- `album`: emit a friendly album folder (the audio tracks plus cover art) laid
  out for use in other players.

Format impact: none. Rip reads the existing format and does not change it, so
`omdVersion` stays `0.1.0`. This is a software feature under the OMD Studio
(alpha) milestone.

## Architecture

- Studio's main process reuses `@open-media-disc/core` in process, so packaging,
  validation, imaging, burning, verification, and ripping run the same code paths
  as the `omd` CLI. Label sheets come from `@open-media-disc/label` and the shared
  player state model from `@open-media-disc/ui`. Anything that could plausibly be
  scripted belongs in a package, not in the renderer.
- One UI serves the desktop and the Raspberry Pi panel. The future Pi player is a
  lean, player-first build of the same app rather than a separate design: same
  hub, same transport, same tokens, launched in kiosk mode.
- The renderer holds no business logic beyond view state. Everything else crosses
  the `window.omd` bridge, which keeps context isolation intact.

## Headless mode, fixtures, and screenshots

OMD Studio can run against **live data** (the real core and optical drives, the
default) or a **fixtures** library of generated, non-copyrighted demo albums.
Fixtures mode swaps in fake burn and disc-image backends, so it needs no optical
hardware and never touches copyrighted audio or artwork. That makes it the safe
default for tests and for documentation or blog screenshots.

A headless harness drives the app through each view and captures a PNG with no
visible window, so an agent or a build step can generate images unattended.

```bash
# Interactive window on fixtures data
pnpm studio:fixtures

# Capture a PNG of every view into ./screenshots (fixtures data, no window)
pnpm studio:screenshots

# Path-independent launcher (writes PNGs relative to the current directory)
node packages/studio/bin/omd-studio-shots.mjs --views home,disc --out ./images
```

Selection is controlled by `--omd-*` flags (or `OMD_STUDIO_*` environment
variables): data mode, the views to capture, output folder, theme, and window
size. The `omd-studio-shots` bin exposes the same options under friendlier names
(`--views`, `--out`, `--data`, `--theme`, `--size`). The studio package README
has the full table. Views are `home`, `disc`, `catalog`, `burn`, `labels`,
`themes`, and `settings`. There are also composed scenes that drive a multi-step
flow before the shot: `mixtape` (the mixtape builder, prefilled) and `burn-ready`
(a catalog package staged on the burn screen). Scenes are opt-in, so `all` never
includes them. The fixtures library is generated once under the app's user-data
folder.

## Screen sizes and kiosk mode

OMD Studio is one touch-first surface for both the desktop and the Raspberry Pi
panel. Every screen fits the viewport: the page itself never scrolls, only
bounded regions such as a track list or a catalog grid do, and fixed chrome (the
top bar and the transport dock) stays put while those regions scroll. Layouts
reflow by available width rather than assuming a device, so the supported range
runs from a 7 inch landscape panel (800 by 480) through a desktop window and
down to a phone width. Landscape is the design target; portrait works and is
verified.

On the desktop the app launches as a normal maximized window with the menu bar
hidden. Appliance behavior is opt-in: pass `--omd-kiosk` (or set
`OMD_STUDIO_KIOSK=1`) on the Pi build to launch full-screen with no window
chrome. To review a layout at a given panel size, the screenshot harness takes a
`--size` in CSS pixels, for example `--size 1024x600`.

## Version checkpoint

Studio lands incrementally under the OMD Studio (alpha) milestone. Each increment
is a patch bump; the milestone becomes a minor bump only when the maintainer says
so. None of it changes the disc format: `omdVersion` stays `0.1.0`.
