---
mode: agent
description: Redesign step 07 of 10. Tune OMD Studio for the 7-10 inch Raspberry Pi touch panel and kiosk/full-screen behavior; verify fit-to-viewport across widths. Run in a fresh chat; read the shared status file first.
---

# Redesign 07: Raspberry Pi and small-screen tuning

Step 07 of the OMD Studio redesign series. Run in order, one per fresh chat.

## Before you start

1. Read [`./redesign-status.md`](./redesign-status.md) fully; confirm this is the
   "Next" step. Read [`../../documentation/redesign-plan.md`](../../documentation/redesign-plan.md)
   section 4 (touch-first) and section 9 (open questions: portrait vs landscape,
   thin persistent nav vs pure tiles).
2. Clean tree, green build.

## Current context (snapshot as of step 06)

This snapshot keeps the prompt self-contained. `redesign-status.md` is still the
authoritative log; read it for the full history and any newer entries.

- Last commit at hand-off: `a2b8641` (step 06, premium touch Home hub). Working
  tree clean; `pnpm --filter @open-album-cartridge/studio build` and `pnpm lint`
  are green. The hub was not yet visually confirmed in Electron by the user, so
  begin step 07 by eyeballing it at several widths.
- Styling model is unchanged: the app renders from `shell.css` (layout only) plus
  `components.css` (the `--omd-*` token contract, the component kit, and a
  shrinking "Legacy token bridge"). There is no theme stylesheet. Themes are
  token maps applied via `data-theme` on `document.documentElement`: `midnight`
  (dark default), `daylight` (light), `ember` (amber dark). Style through
  `--omd-*` tokens; set dynamic values via CSSOM (CSP).
- The Home hub is now full-bleed and fit-to-viewport: `homeView()` in
  `renderer.ts` returns `.hub` (`height:100%; overflow:hidden`) containing a
  `.hub-bar` (brand + centered `.hub-search` catalog search + `.hub-pill` status)
  over a `.hub-body` two-row grid: `.hub-primary` (three `hubPrimaryTile()` tiles
  Play a Disc/Create a Disc/Catalog) and `.hub-secondary` (wide
  `hubNowPlayingTile()` + two `hubMiniTile()` Themes/Settings). All hub classes
  live in `components.css` and use `auto-fit`/`clamp()` + `min-height:0`. This is
  the primary surface to stress-test at Pi widths; the `.hub-secondary` grid is a
  fixed three-column (`1.7fr 1fr 1fr`) and is the most likely thing to need
  content-driven reflow at narrow widths.
- Navigation is `setView(view: ViewId)`; the sidebar (`.app-sidebar`) is still
  built but `display:none`, so the hub tiles + the top-bar Home button are the
  only visible nav. Labels is reached from a "Label sheets" button in the Catalog
  actions row (it is intentionally not a hub tile). Search is wired: it sets
  `state.catalogQuery` and Catalog filters on it.
- Other views wrap in `screenFrame()` -> `.omd-screen` (sticky `.omd-topbar` +
  `.omd-screen-body`) with `.omd-stack`/`.omd-fill`/`.omd-scroll` for bounded
  scroll regions. The persistent transport dock is `.now-playing-dock` (built by
  `nowPlaying.ts`) in the `dock` grid area and must stay present on every view.
- Kiosk/full-screen behavior does not exist yet; `main.ts` creates a normal
  windowed `BrowserWindow`. That is this step's main main-process addition.

## Goal

Make every screen hold up on the target hardware: roughly a 7 to 10 inch panel
(landscape, and possibly portrait) up to a desktop window, and down to a phone
width. Add kiosk/full-screen behavior suited to an appliance.

## Tasks

1. Ask the user the two open questions if still undecided: portrait support or
   landscape-only for the Pi, and whether the hub keeps a thin persistent nav or
   is purely tiles plus Back. Proceed on their answer.
2. Audit each view at representative widths using the browser preview
   (`http://localhost:5599`, CSS/DOM only) or by resizing the Electron window:
   the hub, catalog grid, album detail, disc, create-a-disc, settings, themes,
   labels, and the transport dock. Confirm the fit-to-viewport contract holds:
   the page never scrolls, only bounded regions scroll, fixed chrome stays put,
   and layouts reflow (columns collapse) rather than merely shrinking.
3. Fix any view that overflows, clips a control, or drops below a 44px hit
   target at small sizes. Prefer `clamp()`, `min-height: 0` flex chains, and
   content-driven `auto-fit` grids; avoid device-specific breakpoints.
4. Kiosk/full-screen: add sensible appliance behavior in
   [`main.ts`](../../packages/studio/src/main/main.ts). Options to consider with
   the user: launch maximized or full-screen, an optional kiosk flag/env for the
   Pi build, hide the menu bar, and ensure the window has a reasonable minimum
   size. Keep desktop windowed behavior as the default; make kiosk opt-in.
5. Confirm momentum scrolling works in the bounded scroll regions and that
   scrollbars are not the only affordance.

## Verify

- Build and lint clean.
- Relaunch; ask the user to test at a small window size (approximating the Pi
  panel) and, if available, on the actual Pi. Confirm no view scrolls the whole
  page, controls stay reachable, and full-screen/kiosk behaves as agreed.

## Commit and update status

1. Commit, for example `feat(studio): small-screen and kiosk tuning for the Pi`.
2. Update [`./redesign-status.md`](./redesign-status.md): tick row 07, set row 08
   to `Next`, refresh Current state, and Log the portrait/nav decisions, the
   kiosk approach, and any view that needed layout fixes.

## Hand off to the next step

Keep the series self-contained and self-propagating. Before you finish, prepare
the next prompt so whoever runs it in a fresh chat has current context:

1. Open the next prompt, [`./redesign-08-docs-pass.prompt.md`](./redesign-08-docs-pass.prompt.md).
2. Refresh its "## Current context (snapshot ...)" section to reflect the repo
   after your work: the last commit, what the hub and app look like now, the
   files and patterns step 08 will touch, and anything you deferred. If that
   section is missing, add it right after the "## Before you start" section
   (use this prompt's "Current context" section as the shape to follow).
3. Make sure that prompt still contains a "## Hand off to the next step" section
   like this one, pointing at the step after it
   (`redesign-09-release.prompt.md`). If it is missing, copy this section into
   it and update the two file names. This is how every step keeps the next one
   current, so do not drop it.

## Guardrails

- Content-driven breakpoints, not per-device assumptions.
- Kiosk is opt-in; desktop windowed stays the default.
- Tokens only; CSSOM for dynamic; CSP rules apply.
- No em dash. No emojis in headers.
