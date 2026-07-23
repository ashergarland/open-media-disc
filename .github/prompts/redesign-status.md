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

## Project at a glance

- Repo: `c:\Users\asher\Projects\ashergarland\OpenMediaDisc\open-album-cartridge`
  (pnpm monorepo, all ESM, TypeScript). Branch `main`. No remote; nothing is
  pushed. Never push without asking.
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
# from the repo root: c:\Users\asher\Projects\ashergarland\OpenMediaDisc\open-album-cartridge
pnpm --filter @open-album-cartridge/studio build   # tsc typecheck + esbuild bundle
pnpm test                                           # core/ui vitest (studio has no tests)
pnpm lint                                           # eslint
```

Relaunch the real app for the user to test (async terminal): kill the running
Electron terminal, then

```powershell
pnpm --filter @open-album-cartridge/studio start
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
| 02 | `redesign-02-editors-to-tokens` | Next | Import review, mixtape, and album editor markup migrated to tokens; legacy `.edit-*` / `.import-picker` / `.codec-option` CSS removed. |
| 03 | `redesign-03-token-contract` | Not started | Token vocabulary expanded and the app made to render fully from `components.css` alone, so it no longer depends on a full theme stylesheet. |
| 04 | `redesign-04-new-themes` | Not started | Two to three original theme token maps authored; Themes view rebuilt as a real live picker with persistence; the old `dark-aero.css` retired. |
| 05 | `redesign-05-cleanup` | Not started | Dead code and assets swept: unused CSS, throwaway scripts, stale classes, unreferenced files. |
| 06 | `redesign-06-home-hub` | Not started | Home hub rebuilt toward the premium mockup (`sources/images/example4_touchScreenUi.png`). |
| 07 | `redesign-07-pi-tuning` | Not started | Small-screen and kiosk tuning for the 7-10 inch Pi panel; fit-to-viewport verified across widths. |
| 08 | `redesign-08-docs-pass` | Not started | `documentation/omd-studio.md` and related docs brought in line with the redesigned app. |
| 09 | `redesign-09-release` | Not started | Verify green, bump the software version, propose commit and tag (confirm-first). |
| 10 | `redesign-10-hardware-test` | Not started | Guided manual burn-and-play acceptance on real hardware (Windows, real disc). |

## Current state

- Last commit: `f81533a` feat(studio): Labels view uses the shared library
  catalog.
- Working tree: clean.
- Themes: a single dark theme is active (`themes/dark-aero.css`); the Themes
  view is a static "Appearance" panel (no crash). The token migration of the
  main spokes (hub, shell, catalog, album detail, disc, create-a-disc, settings,
  transport dock) and the Labels view is done; the editors (import review,
  mixtape, album editor) still rely on the bridge CSS.

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
