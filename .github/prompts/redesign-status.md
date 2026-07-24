# OMD Studio redesign: shared status

This is the **single source of truth** for the OMD Studio redesign work. The
work is split into a series of ordered prompts (`redesign-01-*` through
`redesign-10-*`). Each prompt is meant to be run in a **fresh chat**, so this
file carries the context between them.

How the loop works:
1. Start a new chat and run the next prompt in the series (see the roadmap
   below for which one is next).
2. The prompt tells the agent to **read this file first** to load context.
3. The agent does that prompt's chunk of work and commits it.
4. The agent **updates this file** before finishing: tick the roadmap item,
   append a log entry, and record any new gotchas.

Do not skip step 4. If this file is not updated, the next chat starts blind.

## How to update this file (every prompt must do this)

- Set the roadmap checkbox for the prompt you just finished to `[x]` and set
  its Status to `Done <short-sha>`.
- Set the next prompt's Status to `Next`.
- Add a dated entry to the Log section: what changed, the commit sha, and any
  gotcha or decision worth carrying forward.
- Update "Current state" (last commit sha, working tree).
- If you discovered a durable fact (a build quirk, a CSS trick, a file
  location), add it to "Gotchas and durable facts" or to repository memory
  (`/memories/repo/open-media-disc.md`) so it is not lost.
- Hand off to the next prompt: each `redesign-NN` prompt carries a "Current
  context (snapshot)" section and a "Hand off to the next step" section. Before
  finishing, refresh the NEXT prompt's snapshot with the post-work state and make
  sure it still has a hand-off section pointing at the step after it. This keeps
  every prompt self-contained for a fresh chat even between status-file updates.

## Project at a glance

- Repo: the repo root (folder `open-media-disc` on a fresh clone; published as
  the private GitHub repo `ashergarland/open-media-disc`). pnpm monorepo, all
  ESM, TypeScript. Branch `main` tracks `origin/main`. Never push without asking.
- The app under redesign is **OMD Studio**, an Electron desktop + Raspberry Pi
  touch app in `packages/studio`.
- Other packages (`core`, `cli`, `label`, `ui`) are the shared SDK and are not
  the focus of this series, though small additions there are fine when needed.
- The living design brief for this redesign is
  [`../../documentation/redesign-plan.md`](../../documentation/redesign-plan.md).
  Read section 3 (target IA), 4 (touch-first rules), 6 (theme system), and 8
  (phased plan). This status file is the execution tracker for that plan.

## Where the code lives (Studio)

Renderer (browser context, `packages/studio/src/renderer/`):
- `renderer.ts` - shell, view routing (`viewFor`), all view builders
  (home hub, catalog, album detail, disc, create-a-disc, settings, themes),
  app state, and most handlers.
- `nowPlaying.ts` - the persistent transport dock.
- `audioController.ts` - the shared player engine (HTML5 `<audio>` + Web Audio
  analyser for the spectrum).
- `labelsView.ts` - the Labels (label-sheet builder) view.
- `dom.ts` - `el()` DOM helper (no innerHTML with dynamic data) and `svgIcon()`
  inline icon set.
- `components.css` - the **`--omd-*` design token contract** in `:root` plus the
  new token component kit and a "Legacy token bridge" section that restyles
  not-yet-migrated showcase classes.
- `shell.css` - layout only.
- `themes/dark-aero.css` - the single remaining full theme stylesheet (the other
  three were removed).
- `index.html` - loads `shell.css`, `themes/dark-aero.css` (media="all"), then
  `components.css` last (so token overrides win by source order).

Main / shared:
- `src/main/main.ts` - Electron main, all `ipcMain.handle` handlers, the
  `omd-audio://` protocol, disc detection.
- `src/main/preload.ts` - context bridge (`window.omd`).
- `src/shared/types.ts` - `OmdStudioApi` and the shared DTOs.

Build config: `packages/studio/build.mjs` (esbuild) + `tsconfig.json` (tsc
typecheck). `build.mjs` `copyStatic` copies `index.html`, `shell.css`,
`components.css`, `themes/`, and `assets/`.

## Commands

```powershell
# from the repo root
pnpm --filter @open-media-disc/studio build   # tsc typecheck + esbuild bundle
pnpm test                                           # core/ui vitest (studio has no tests)
pnpm lint                                           # eslint
```

Relaunch the real app for the user to test (async terminal): kill the running
Electron terminal, then

```powershell
pnpm --filter @open-media-disc/studio start
```

The harmless `ffmpeg_common.cc ... Unsupported pixel format: -1` log lines are
normal, not errors.

## Verification limits (important)

- The real app can only be exercised by the **user** in Electron on Windows.
  Do not claim UI behavior is verified unless the user confirms.
- The browser preview at `http://localhost:5599` is **stale and unreliable**:
  `window.omd` is undefined there so init throws and app logic does not run. Use
  it only for pure CSS/DOM probes, never to verify features.
- `tsc` runs with `noUnusedLocals` / `noUnusedParameters`, so any unused
  module-level function, import, or type is a **build error**. Delete dead code
  as you go.

## Hard constraints (carry into every UI change)

- Electron CSP: `default-src 'none'; script-src 'self'; style-src 'self';
  img-src 'self' data:; media-src 'self' omd-audio:; font-src 'self'`.
  No inline `style=` attributes in static HTML, no remote fonts, no `fetch`.
  Dynamic styling must use CSSOM (`element.style.setProperty(...)`) or class
  toggles. Web Audio and `data:`/`omd-audio:` URLs are allowed.
- One codec per package (already enforced). Packages are plain folders.
- Honest codec language: show the real codec plus a factual Lossless / Lossy
  tag. Never "FLAC lossless" or a fixed bit-depth claim.
- Format version (`omdVersion`) stays `0.1.0`. Only the software version bumps,
  and only at the release-checkpoint prompt.

## Conventions

- Commit incrementally, one focused commit per prompt (or a few small ones).
  Never push. Confirm before any destructive or irreversible action.
- Versioning: patch bump by default, minor only when told, never major without
  instruction.
- No em dash in prose. No emojis in Markdown headers.
- After significant work, update repository memory
  (`/memories/repo/open-media-disc.md`) as well as this file.

## Roadmap (run in order)

Each row is one prompt. Run them top to bottom, one per fresh chat.

| # | Prompt | Status | Outcome |
| --- | --- | --- | --- |
| 01 | `redesign-01-labels-to-tokens` | Done 4127323 | Labels view rebuilt on the `--omd-*` component kit; its bridge CSS removed. |
| 02 | `redesign-02-editors-to-tokens` | Done df77182 | Import review, mixtape, and album editor markup migrated to tokens; legacy `.edit-*` / `.import-picker` / `.codec-option` CSS removed. |
| 03 | `redesign-03-token-contract` | Done 3c58280 | Token vocabulary expanded and the app made to render fully from `components.css` alone, so it no longer depends on a full theme stylesheet. |
| 04 | `redesign-04-new-themes` | Done cb71228 | Two to three original theme token maps authored; Themes view rebuilt as a real live picker with persistence; the old `dark-aero.css` retired. |
| 05 | `redesign-05-cleanup` | Done d5b8365 | Dead code and assets swept: unused CSS, throwaway scripts, stale classes, unreferenced files. |
| 06 | `redesign-06-home-hub` | Done a2b8641 | Home hub rebuilt toward the premium mockup (`design/images/example4_touchScreenUi.png`). |
| 07 | `redesign-07-pi-tuning` | Next | Small-screen and kiosk tuning for the 7-10 inch Pi panel; fit-to-viewport verified across widths. |
| 08 | `redesign-08-docs-pass` | Not started | `documentation/omd-studio.md` and related docs brought in line with the redesigned app. |
| 09 | `redesign-09-release` | Not started | Verify green, bump the software version, propose commit and tag (confirm-first). |
| 10 | `redesign-10-hardware-test` | Not started | Guided manual burn-and-play acceptance on real hardware (Windows, real disc). |

## Current state

- Last commit: `a2b8641` feat(studio): premium touch Home hub.
- Working tree: clean. Build and lint are green; user has not yet visually
  confirmed the hub in Electron (only the user can exercise the real UI).
- Home hub (rebuilt in step 06): `homeView()` in `renderer.ts` returns `.hub`,
  laid out as a fit-to-viewport surface: a `.hub-bar` top row (brand + centered
  catalog `.hub-search` form + now-playing `.hub-pill` status), then a `.hub-body`
  two-row grid: `.hub-primary` (three `hubPrimaryTile()` glass tiles for Play a
  Disc -> `disc`, Create a Disc -> `burn`, Catalog -> `catalog`) and
  `.hub-secondary` (wide `hubNowPlayingTile()` + two `hubMiniTile()` for Themes
  and Settings). All hub classes live in `components.css` and read `--omd-*`
  tokens only. The old `.hub-head`/`.hub-grid`/`.hub-tile--primary` markup and CSS
  were removed. Search: submitting `.hub-search` sets `state.catalogQuery` and
  routes to Catalog, which filters by artist/album/discId and shows an
  `.omd-searchsummary` bar with Clear. A new `search` icon was added to `dom.ts`.
  Labels is no longer a hub tile (not in the mockup); it is reached from a new
  "Label sheets" button in the Catalog actions row.
- Themes: three token-map themes (`midnight` default, `daylight`, `ember`) with a
  live picker; no theme stylesheet. The app renders from `shell.css` (layout) +
  `components.css` (tokens + components).
- Deliberately KEPT (not dead): the hidden sidebar/nav subsystem (`.app-sidebar`
  is `display:none` but still built; navigation is via the hub + top-bar Home);
  the Web Audio analyser + `getLevels()` in `audioController.ts` (plumbing for a
  real dock visualizer the premium mockup wants; the current `.npd-eq` is
  decorative); the "Legacy token bridge" in `components.css` (still used by
  `btn()`, `.card`, `.notice`, `.status-pill`, and the dock, because migrated
  views use the showcase `.btn`/`.card` helpers rather than pure `.omd-*`).

## Gotchas and durable facts

- `index.html` load order is `shell.css` then `themes/dark-aero.css` then
  `components.css`. The theme file uses unscoped, low-specificity class
  selectors (`.btn`, `.card`), so equal-specificity token rules in
  `components.css` win by coming last. This is how the "Legacy token bridge"
  restyles legacy views without touching their markup. Bridge rules should be
  deleted as each view is properly migrated.
- Runtime style must go through CSSOM `setProperty` (CSP blocks inline
  `style=`). Theme swatches, slider fill (`--slider-value`), and VU rotation all
  use this.
- `classList.toggle(...)` returns a boolean; an arrow like `() => el.classList.toggle(x)`
  trips TS2322 under the strict config. Wrap the body in braces: `() => { ...; }`.
- The dock spectrum is the real Web Audio analyser; the small `.npd-eq` bars on
  a staged disc are decorative CSS only.
- ffmpeg-static is marked `external` in `build.mjs` (main config) so esbuild does
  not inline the binary; it resolves at runtime via `__dirname`.

## Log

Append newest entries at the top. One entry per completed prompt.

- 2026-07-24: Prompt 06 done (commit `a2b8641`). Rebuilt the Home hub toward the
  premium touch mockup, entirely on `--omd-*` tokens so it renders in every theme.
  - `homeView()` replaced: a `.hub-bar` (brand + centered catalog search + now-
    playing status pills) over a `.hub-body` two-row grid. Row 1 `.hub-primary`
    has three large `hubPrimaryTile()` glass tiles (Play a Disc, Create a Disc,
    Catalog) with a watermark glyph, icon badge, and an accent action pill. Row 2
    `.hub-secondary` has a wide `hubNowPlayingTile()` plus `hubMiniTile()` for
    Themes and Settings. Old `hubTile()` + `.hub-head`/`.hub-grid`/
    `.hub-tile--primary` markup and CSS were removed.
  - Fit-to-viewport: `.hub` is `height:100%; overflow:hidden`; the body grid rows
    (`1.4fr / 1fr`) and tiles use `min-height:0`, `auto-fit`, and `clamp()` so the
    hub reflows by width and never scrolls. Hover/active/focus-visible states are
    token-based. The persistent dock is untouched and stays present on Home.
  - Search is wired, not decorative: submitting `.hub-search` sets
    `state.catalogQuery` and routes to Catalog; `catalogView()` filters entries by
    `artist album discId` (case-insensitive) and shows an `.omd-searchsummary` bar
    with a Clear button. The Catalog primary tile clears the query first. Added a
    `search` icon to `dom.ts` and `catalogQuery?: string` to `AppState`.
  - Labels is not in the mockup, so it is no longer a hub tile. To avoid orphaning
    it (the sidebar is hidden), added a \"Label sheets\" button to the Catalog
    actions row. Deferred: a richer in-hub Now Playing (scrubber/spectrum) was not
    duplicated from the dock; the tile shows album/artist/codec and opens the
    player. User visual verification in Electron is still pending.

- 2026-07-23: Prompt 05 done (commits `c5dd85d` CSS/tooling, `d5b8365`
  IPC/types/code). Dead-code sweep after the migrations and theme retirement.
  - Removed dead CSS (orphaned when views migrated to `.omd-*` and when
    `dark-aero.css` went away): from `shell.css`, `.album-summary` /
    `.album-cover*`, `.album-title` / `.album-artist` / `.album-meta .kv-list`,
    the burn-console `.bc-options` / `.bc-toggle*` / `.bc-drive-name`,
    `.drive-select`, `.burn-cartridge*`, the `.now-playing-dock .npd-spectrum*`
    block, the `.catalog-tile` / `.ct-*` block, `.disc-layout` (+ its 1180px
    media query), `.disc-actions` / `.album-heading` / `.disc-main .disc-actions`,
    and `.player-badges`; from `components.css`, the dead
    `.npd-spectrum .spectrum-fill` rule. Kept `.album-meta`, `.bc-actions`,
    `.disc-main`, `.view`, `.cartridge*`, `.rip-status*`, `.import-status` /
    `.import-fail*` (all still emitted).
  - Removed dead code/IPC/types: the `omd:importThemeFile` handler + preload
    method + `importThemeFile()` on `OmdStudioApi` (custom theme import went away
    in step 04); the never-set `AppState.themeError` field; the unused `player`
    icon (`dom.ts` union + switch case, which fell through to `play`); and the
    leftover batch-import `StudioImportProgress {index,total,album}` was already
    removed in the progress-bar work.
  - Removed throwaway tooling: `git rm packages/studio/sync-themes.mjs` (it
    concatenated showcase theme CSS into `themes/<id>.css`, which no longer
    exists under the token-map theme system). No `_preview.mjs` or `styles.css`
    remained.
  - DELIBERATELY KEPT (proved referenced or intentionally-unreferenced): the
    hidden sidebar/nav subsystem (`display:none`, but `buildShell`/`navItemEl`/
    `setView` still build it; removing it is a structural nav change for step 06);
    the Web Audio analyser + `getLevels()` in `audioController.ts` (unreferenced
    now, but it is plumbing for the real dock visualizer the premium mockup calls
    for; `.npd-eq` is a decorative placeholder); the "Legacy token bridge" (still
    load-bearing: `btn()` emits `.btn`/`.liquid-rim`/`.button-surface`, and views
    use `.card`/`.notice`/`.status-pill` + the dock color overrides).
  - Build, `pnpm test` (141), and `pnpm lint` all green. No visible change.

- 2026-07-23: Prompt 04 done (commit `cb71228`). Shipped a real token-map theme
  system and retired the last full theme stylesheet.
  - Three themes, each a token map that overrides the base `--omd-*` primitives
    (derived tokens and compat aliases follow via their `var()` references):
    `midnight` (the base `:root`, deep dark cyan default), `daylight`
    (`:root[data-theme="daylight"]`, clean light), `ember`
    (`:root[data-theme="ember"]`, warm charcoal + amber accent). All live in
    `components.css`. No per-theme component CSS; the kit stays shared.
  - `applyThemeById` now just sets `data-theme` on `document.documentElement`
    (instant variable swap, no fetch, no flash) and persists to `localStorage`
    key `omd.themeId`. `loadThemeId()` restores it on boot with a safe default
    (`midnight`); unknown/empty ids fall back. `state.themeId` seeds from it.
  - Rebuilt `themesView` as a live picker: a card per theme with a 5-chip swatch
    preview (colors set via CSSOM `setProperty`, not inline `style=`), the active
    one marked with a check + accent ring, click applies immediately. New token
    classes `.omd-theme-grid` / `.omd-theme-card` / `.omd-swatch` / etc.
  - Removed `themes/dark-aero.css`, its `<link>` in `index.html`, and the
    `themes/` copy step in `build.mjs`. Brand imagery is now theme-agnostic:
    `logoFor()` / `cartridgeFor()` return shared `assets/brand-disc.png` /
    `assets/brand-cartridge.png` (renamed from `assets/dark-aero/`), and that
    folder is gone. Dropped the now write-only `brandDisc` module var. Set the
    Electron window `backgroundColor` to the midnight bg (`#0d131e`) so the first
    paint matches the dark default. Also made the hub background bloom read
    `--omd-accent` / `--omd-accent-2` so it adapts per theme.
  - Verified all three themes render correctly from `components.css` alone via a
    throwaway static probe (one page per `data-theme`, screenshotted): midnight
    dark/cyan, daylight light with good contrast, ember warm amber. Probe deleted
    after. Build + lint green.
  - The "Legacy token bridge" section is NOT empty (still holds `.btn*`,
    `.link-btn`, `.mini-btn`, `.card`, `.eyebrow`, `.select-lead`, `.notice*`,
    `.status-pill*`, dock color overrides), so it was kept; step 05 cleanup can
    trim it and the dead `shell.css` sidebar/`ct-*`/VU rules.

- 2026-07-23: Prompt 03 done (commit `3c58280`). Completed the `--omd-*` token
  contract in `components.css` and made styling self-contained so
  `dark-aero.css` can be dropped in step 04.
  - `:root` now carries a documented, grouped vocabulary (base/surfaces, text +
    on-accent, accent, status danger/success/warning + danger-text, controls
    control/control-border/focus/slider-track/fill/thumb, shape/motion
    radii/shadow/blur/tap/font). New tokens added: `--omd-hairline`,
    `--omd-on-accent`, `--omd-danger`, `--omd-danger-text`, `--omd-success`,
    `--omd-warning`, `--omd-control`, `--omd-control-border`, `--omd-focus`,
    `--omd-slider-track` / `-fill` / `-thumb`, `--omd-blur`. Existing names kept.
  - Compatibility aliases in `:root` resolve the legacy theme-token names that
    `shell.css` layout classes still read (`--font`, `--ink`, `--ink-strong`,
    `--ink-muted`, `--surface-1`, `--surface-border`, `--surface-hairline`,
    `--pal-cyan`, `--pal-green`) from the `--omd-*` values. `components.css` loads
    last, so these win over `dark-aero.css` now and survive its removal. (These
    aliases are removed in step 05 once `shell.css` is fully on `--omd-*`.)
    Confirmed the aliases cover every `var(--...)` `shell.css` reads (7 names).
  - Swept every hardcoded status color in the token components + bridge to the
    new tokens (`#04222b` -> on-accent, `#ef4d38` -> danger, `#ef7d6f` ->
    danger-text, `#35d17a` -> success, `#f0a020` -> warning). Neutral black/white
    shading in gradients/shadows left as-is.
  - Ported the structure of the transport dock (`.now-playing-dock`, `.npd-*`),
    the player-control buttons (`.pc-button` / `.pc-content` / `.pc-icon`, sizes
    via a self-owned `--pc-size` so it no longer needs the theme's
    `--button-size`), the compact themed slider (`.range-control` /
    `.range-compact` / `.track` / `.track-fill` / `.range-input` / `.thumb`), and
    the busy `.spinner` (+ `@keyframes omd-spin`) into `components.css`. The
    bridge keeps the token color overrides (retargeted to the slider tokens);
    these new rules own the geometry so the dock renders without `dark-aero.css`.
  - Verified with a throwaway static probe served from the built renderer with
    the theme link omitted: shell, primary/secondary buttons, card, token fields
    (incl. invalid state), segmented codec chooser, notice, status pill, spinner,
    and the full dock (transport, slider, chips) all render from `components.css`
    alone. Probe deleted after. Build + lint green. dark-aero.css NOT removed
    (step 04). Bridge still present (buttons/card/notice/status-pill/dock colors)
    and shrinks further in steps 04/05.

- 2026-07-22: Prompt 02 done (commit `df77182`). Migrated the three editor
  surfaces in `renderer.ts` (import review, mixtape builder, catalog album
  editor) off the legacy `.edit-*` / `.codec-option` markup onto a new
  `--omd-*` field kit. New token components in `components.css`: `.omd-form`,
  `.omd-field-group`, `.omd-input` (+ `.invalid`), `.omd-field-error`,
  `.omd-field-hint`, `.omd-segment`/`.omd-segment-btn`/`.omd-segment-tag` (the
  codec chooser), `.omd-tracks`/`.omd-tracks-head`, `.omd-track-edit`/`-row`/
  `-num`/`-details`, and `.omd-editbar`/`.omd-editbar-actions` (the fixed action
  bar). Reused the existing `.omd-field` / `.omd-field-label` (refactored so the
  `flex: 1; min-width` only applies inside `.omd-fields`, keeping Labels intact).
  `editField` / `editTrackRow` / `importTrackRow` / `importCodecField` and the
  Various Artists hint now emit token classes; validation behavior is unchanged
  (inline blur validation, `.invalid` highlight, on-Save error banner via the
  bridge `.notice`). Inputs keep the 44px `--omd-tap` min height. Kept the
  fit-to-viewport structure (`.omd-stack.omd-fill` fixed `.omd-editbar` +
  `.omd-scroll` body). DELETED as unreferenced: from the bridge in
  `components.css`, `.edit-input` / `.edit-label` / `.edit-error`; from
  `shell.css`, `.edit-form` / `.edit-field` / `.edit-label` / `.edit-input` (+
  states) / `.edit-error` / `.edit-topbar` / `.edit-topbar-actions` /
  `.edit-tracks` / `.edit-track*` / `.edit-field-group`, plus the dead
  `.import-picker` / `.import-picker-head` and the whole `.codec-option*` /
  `.import-picker-note` picker block. KEPT (still referenced elsewhere, NOT
  editor-only): `.notice*` and `.status-pill*` (Create a Disc + import status),
  `.import-status` / `.import-fail*` (catalog import summary), `.view-head` /
  `.view-title` / `.view-lead` (placeholderView fallback). The editors still use
  the layout classes `.disc-main` / `.album-col` / `.album-art` / `.album-meta`
  and the mixtape keeps `.mixtape-*`; those are not field/picker CSS and read
  theme tokens, so they stay until step 03.
  - Bridge status: the "Legacy token bridge" section is NOT empty. It still
    holds `.btn*`, `.link-btn`, `.mini-btn`, `.card`, `.eyebrow`,
    `.select-lead` / `.rip-status-text`, `.notice*`, `.status-pill*`, plus the
    "Transport dock" restyle block. Remaining bridge users: Create a Disc view
    (`btn`, `card`, `notice`, `status-pill`), mixtape builder (`mini-btn`,
    `link-btn`, `select-lead`, `eyebrow`, `card`), catalog import status
    (`status-pill`), spinner rows, and the transport dock. Step 03 folds these
    into the token contract.

- 2026-07-22: Follow-up (commit `f81533a`). Labels no longer asks for its own
  folder: it now reads the shared library catalog (`state.libraryDir` /
  `state.catalog`) like the Create a Disc picker. `renderLabelsView(ctx)` takes
  a `LabelsContext` (libraryDir/entries/loading/error + onChooseLibrary/onRescan
  callbacks) instead of scanning itself; `viewFor('labels')` passes shared
  state; `setView` auto-scans on entering Labels and `rescanLibrary` now
  re-renders for `labels` too. Change-folder/Rescan route through the shared
  `chooseLibrary`/`rescanLibrary`, so the whole app stays on one library.
- 2026-07-22: Follow-up (commit `46b8c9e`). The Labels view had no entry point
  in the touch shell: the sidebar nav is `display: none` and the Home hub never
  had a Labels tile, so `labels` was unreachable. Added a Labels tile to
  `homeView()` (icon `label`, after Catalog). If future hub work reorganizes the
  tiles, keep an entry point for every reachable `ViewId`.
- 2026-07-22: Prompt 01 done (commit `4127323`). Rebuilt
  `packages/studio/src/renderer/labelsView.ts` on the `--omd-*` token component
  kit: the view is now `.omd-stack.omd-fill` with a fixed `.omd-sourcebar` plus
  two bounded `.omd-scroll` regions (album picker + sheet preview), so the page
  never scrolls. Two columns via `.omd-labels`
  (`grid-template-columns: repeat(auto-fit, minmax(340px, 1fr))` +
  `grid-auto-rows: minmax(0, 1fr)`), stacking when narrow with no device
  breakpoints. New token components added to `components.css`: `.omd-sourcebar`,
  `.omd-labels`/`.omd-labels-col`/`-head`/`-tools`, `.omd-picker`/`.omd-pick*`,
  `.omd-stepper*` (44px taps), `.omd-fields`/`.omd-field*`, `.omd-summary`,
  `.omd-error`, `.omd-sheet-pages`/`.omd-sheet-page` (white paper is semantic).
  Removed from `shell.css`: the whole "Labels view compositions" block (kept
  shared `.link-btn`), the labels-only empty-state hero (`.select-hero`,
  `.select-icon`, `.select-title`; kept `.select-lead`, still used by the
  mixtape view), and the `.burn-source`/`.burn-source-path` source row. Removed
  from the bridge: `.burn-source-path`, `.select-title`, `.select-icon`.
  Gotcha: `.select-lead` looked Labels-only but the mixtape view still uses it,
  so grep before deleting. build + lint green.
- 2026-07-22: Created the redesign prompt series (`redesign-01` .. `redesign-10`)
  and this status file. No app code changed. Base commit `afcb7a0`.
