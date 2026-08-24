# OMD Studio Redesign Plan

Status: Draft / living document. Owner: product + engineering.
Last updated: 2026-07-20.

This document tracks the redesign of the OMD Studio interface into a single,
touch-first application shared by desktop and the Raspberry Pi appliance, plus a
new theme system that replaces the current four themes. It is the shared plan we
align on once, then execute in large chunks rather than page by page.

Reference mockup: `design/images/example4_touchScreenUi.png` (a glass "hub" home
screen with large tiles and a persistent transport bar with VU meters).

## 1. Goals and constraints

Goals
- One interface for both desktop (mouse/keyboard) and a 7-10 inch touch screen on
  a Raspberry Pi. No separate desktop and kiosk UIs.
- A calm, coherent visual language with a small number of strong themes.
- Honest product language: show the real audio codec plus applicable measured
  facts. No quality-category badge, audio-history claim, or fixed bit-depth
  assumption.
- Reduce per-page micromanagement: agree on the system, then build to it.

Hard constraints (carry over from the current app)
- Electron with a strict CSP: `default-src 'none'`, `script-src 'self'`,
  `style-src 'self'`, `media-src 'self' omd-audio:`. No inline `style=` attributes
  in static HTML, no `fetch`. Runtime styling must use CSSOM (`setProperty`) or
  stylesheet swaps. The Web Audio API is allowed.
- Audio streams through the custom `omd-audio://` protocol (range requests).
- The core SDK stays platform independent; all UI work lives in `packages/studio`.
- One codec per package (already enforced); packages are plain folders.

Non-goals for this pass
- Physical cartridge hardware, multi-disc spanning, animated per-track art.
- Cloud sync or account features.

## 2. Current-state audit

Shell and navigation
- Left vertical sidebar with six items: Disc, Catalog, Burn, Labels, Themes,
  Settings. Works, but the split between Disc and Catalog and Burn is confusing:
  three different entry points that all end at "an album."
- The sidebar is dense for touch; nav items and controls are sized for a mouse.

Disc view
- Physical disc detection, live refresh, album layout, transport in the dock.
  Solid logic, but the layout is a wide desktop grid that will not translate to a
  portrait or small landscape touch screen.

Catalog view
- Grid of package tiles with Play / Open / Delete, plus Import music and New
  mixtape. This is the closest thing to the target model (a source chooser), and
  the import review flow now lives here.

Burn view
- Starts by picking a loose album folder. This is a fourth, redundant way to get
  to an album and does not match the catalog-first mental model. It should become
  a step after choosing a source, not its own source picker.

Labels view
- Functional label-sheet builder. Lower priority for touch; keep but restyle.

Themes view
- Four full-CSS themes (frutiger-aero, dorfic, technozen, dark-aero). They are
  heavy (about 1400 lines each, roughly 75 percent shared structure) and, per the
  product owner, do not look good. Slated for removal.

Now Playing dock
- Persistent transport with a real spectrum analyzer. Good foundation; needs to
  become the single, always-present, touch-sized transport in the new shell.

Cross-cutting issues
- Hit targets, spacing, and typography are tuned for desktop density.
- Theme CSS and app-composition CSS are intertwined, which makes restyling risky.
- Some copy still makes unsupported quality or fixed bit-depth claims.

## 3. Target information architecture

A hub-and-spoke model driven by the mockup.

Home (hub)
- Large touch tiles for the primary jobs:
  - Play a Disc (detect and play the inserted disc)
  - Create a Disc (unified source chooser, see section 5)
  - Catalog (browse and play your library)
- Secondary tiles or a top bar: Now Playing, Themes, Settings, and Search.
- The hub is the default view and the "home" affordance from anywhere.

Primary spokes
- Disc: the inserted physical disc (play, rip to catalog).
- Catalog: library grid, open an album, edit metadata, play, delete, start a
  mixtape.
- Create a Disc: choose a source, review, then burn.
- Settings and Themes: full-screen, touch-friendly.

Persistent transport
- A single bottom transport bar present on every view: art, title/artist, real
  codec plus applicable measured facts, scrubber, transport buttons, volume,
  and the spectrum/VU. Sized for touch, collapses gracefully on small widths.

Navigation model
- Home tiles plus a persistent Home affordance and Back. Drop the always-present
  left sidebar in favor of the hub plus contextual back navigation, which suits
  touch and small screens better.

## 4. Touch-first interaction principles

These are the working rules for every screen. The overriding idea: the app is a
single full-screen surface (a kiosk-style appliance), not a scrolling web page.

Fit-to-viewport (most important)
- Each screen fits the viewport. The page as a whole never scrolls.
- Size the frame and primary content with viewport-relative units (`%`, `vh`,
  `vw`, `clamp()`), so a phone looks like a shrunk-and-reflowed version of the
  desktop, not a different design.
- Only genuinely overflowing content scrolls, and it scrolls inside its own
  bounded region (a catalog grid, a track list), never the whole screen. Fixed
  chrome (top bar, action row, transport) stays put while a list scrolls.
- Structure: `screen = topbar (fixed) + body (fills) `; inside the body, one
  region may be a bounded scroller (`.omd-scroll`) while headers/actions stay
  fixed. Flex chains use `min-height: 0` so children can shrink and scroll.

Reflow, do not rescale-only
- Layouts reflow by available width (columns collapse, side-by-side becomes
  stacked) rather than assuming a device. No per-device breakpoints; use
  content-driven breakpoints and `auto-fit`/`auto-fill` grids.
- Target range: roughly a 7 inch landscape panel (Raspberry Pi) up to a desktop
  window, and down to a phone-sized width.

Touch ergonomics
- Minimum hit target 44 by 44 CSS px (Apple HIG 44pt / Material 48dp); primary
  actions larger. Keep at least ~8px between adjacent targets.
- Design for imprecise input (fingers, possibly gloved on an appliance). Favor
  large controls, generous padding, and low-density rows.
- No hover-only affordances; every action is reachable by tap. Provide clear
  pressed/active states and immediate feedback on tap.
- Avoid long-press-only or right-click-only actions.
- Sliders and toggles must be finger-draggable with large thumbs/tracks.
- Keep interactive elements away from the extreme screen edges where a bezel or
  rounded panel can interfere.

Legibility and motion
- Large, legible type with strong contrast; avoid tiny text and thin hairlines
  as the only separators.
- Momentum scrolling for lists; do not rely on visible scrollbars as the only
  affordance (they are thin and hard to grab on touch).
- Motion is subtle and never blocks input.

Still first-class on desktop
- Keyboard and mouse remain fully supported; the touch rules above do not remove
  desktop conveniences, they just set the floor.

## 5. Unified "Create a Disc" flow

Replace the standalone Burn source picker. Create a Disc opens a source chooser
that mirrors the Catalog model:
- From catalog: pick an existing package.
- Import a package: an existing OMD package folder.
- Import music: a folder of audio files (runs the new import review + codec
  choice + per-track editing already built).
- New mixtape: the mixtape builder.

After a source is chosen and reviewed, the same burn step (drive select, blank,
write, verify) runs. This collapses Disc/Catalog/Burn confusion into one verb:
you pick a source, then optionally burn it.

## 6. Theme system redesign

Direction
- Scrap the four current themes. Design a small set (target three) of strong,
  original themes. They do not need to be nostalgic.
- Move to a token-driven system: one shared component stylesheet reads
  `--omd-*` tokens; each theme is a compact token map (colors, surfaces, radii,
  shadows, blur, accent) plus an optional background texture token. Switching a
  theme is a variable swap, which is inherently flash-free.
- Keep first-party themes as trusted data. Importable user themes remain a later,
  data-only feature.

Proposed starting themes (names are placeholders, to be designed)
- One clean light theme.
- One deep dark theme (the likely default on the Pi).
- One high-contrast or accent-forward theme.

Deliverable for this section: a token vocabulary (the `--omd-*` contract) and
three theme token maps, plus the shared component stylesheet.

## 7. Design system and components

Build a small component kit so views compose instead of hand-rolling CSS:
- Buttons (primary, secondary, icon), large touch variants.
- Tiles (hub tiles, catalog cards).
- Lists and rows (tracks, settings), with large touch rows.
- Fields (text, number, select, toggle, slider) sized for touch.
- Transport bar and spectrum.
- Sheets and dialogs (confirm, pick source), full-screen on small displays.
- Status and notices (busy, error, verified).

Each component reads theme tokens only; no per-view bespoke color values.

## 8. Execution plan (phased, large chunks)

Phase 0 (done): core and data layer
- Multi-codec packages, ffmpeg conversion, import review, Various Artists,
  per-track metadata, honest codec model. Committed.

Phase 1: foundation
- Define the `--omd-*` token contract and the shared component stylesheet.
- Build one dark theme token map as the working default.
- Stand up the new shell: hub home plus persistent transport, fluid touch sizing.

Phase 2: primary spokes on the new shell
- Catalog, Disc, and Now Playing rebuilt as touch views using the component kit.
- Fold Burn into the unified Create a Disc source chooser.

Phase 3: remaining views and themes
- Settings, Themes, Labels restyled.
- Design and ship the final three themes; remove the old four.

Phase 4: polish and Pi
- Small-screen tuning, kiosk/full-screen behavior, performance on the Pi.

Each phase is one or more self-contained commits and is verified in the real app.

## 9. Open questions and decisions

Decided
- Single touch-first UI for desktop and Pi. Yes.
- Scrap all current themes; design a new small set. Yes.
- Honest codec presentation (real codec plus applicable measured facts). Yes.
- Import suggests "Artist - Album" disc title (editable) and Various Artists;
  per-track artist/album/year editing. Done.

To decide
- Exact theme count and art direction (mood, palette, texture vs flat).
- Whether the hub keeps a thin persistent nav or is purely tile plus Back.
- Portrait support, or landscape-only for the Pi panel.
- Whether Labels stays a top-level spoke or moves under Create a Disc.
