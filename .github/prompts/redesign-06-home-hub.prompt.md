---
mode: agent
description: Redesign step 06 of 10. Rebuild the OMD Studio Home hub toward the premium touch mockup (example4_touchScreenUi.png) using the token component kit. Run in a fresh chat; read the shared status file first.
---

# Redesign 06: Home hub premium recreation

Step 06 of the OMD Studio redesign series. Run in order, one per fresh chat.

## Before you start

1. Read [`./redesign-status.md`](./redesign-status.md) fully; confirm this is the
   "Next" step. Read [`../../documentation/redesign-plan.md`](../../documentation/redesign-plan.md)
   sections 3 (target IA) and 4 (touch-first rules).
2. Look at the reference mockup: `design/images/example4_touchScreenUi.png`
   (a glass hub with large tiles and a persistent transport). Treat it as visual
   direction, not a pixel spec.
3. Clean tree, green build.

## Current context (snapshot as of step 05)

This snapshot keeps the prompt self-contained. `redesign-status.md` is still the
authoritative log; read it for the full history and any newer entries.

- Last commit at hand-off: `00b4a98` (step 05 cleanup docs; code in `d5b8365`).
  Working tree clean; `pnpm --filter @open-media-disc/studio build`,
  `pnpm test` (141), and `pnpm lint` all green.
- Styling: the app renders from `shell.css` (layout only) plus `components.css`
  (the `--omd-*` token contract, the component kit, and a shrinking "Legacy token
  bridge"). There is no theme stylesheet. Themes are token maps applied by
  setting `data-theme` on `document.documentElement`: `midnight` (dark default),
  `daylight` (light), `ember` (amber dark). All hub work must read `--omd-*`
  tokens so every theme looks right; set dynamic values via CSSOM (CSP).
- The hub today: `homeView()` in `renderer.ts` returns `.hub` (a `.hub-head`
  title/sub plus a `.hub-grid` of `hubTile({icon,title,sub,primary?,onClick})`).
  Tiles route via `setView`: Play a Disc -> `disc`, Create a Disc -> `burn`,
  Catalog -> `catalog`, Labels -> `labels`, plus Now Playing / Themes / Settings.
  Hub classes live in `components.css` (`.hub`, `.hub-head`, `.hub-title`,
  `.hub-sub`, `.hub-grid`, `.hub-tile`, `.hub-tile--primary`, `.hub-tile-icon`,
  `.hub-tile-body`). Navigation is `setView(view: ViewId)`; reuse it, do not fork.
- Full-bleed home: `buildShell()` builds a sidebar that is `display:none`
  (`.app-sidebar`); `setView`/`buildShell` toggle `.app-shell--home` so Home is
  edge-to-edge. The persistent transport dock is `.now-playing-dock` (built by
  `nowPlaying.ts`) and must stay present and correct on Home.
- Fit-to-viewport helpers already exist: `.omd-screen` (sticky top bar + body)
  and `.omd-stack` / `.omd-fill` / `.omd-scroll` for bounded scroll regions; the
  hub uses its own full-bleed `.hub` layout.
- Not yet built: a Search affordance (the mockup shows one). Intentionally kept
  as future plumbing (do not remove): the hidden sidebar nav subsystem, and the
  Web Audio analyser + `getLevels()` in `audioController.ts` (for a real dock
  visualizer; the current `.npd-eq` bars are decorative).

## Goal

Elevate the Home hub (`homeView` in
[`renderer.ts`](../../packages/studio/src/renderer/renderer.ts)) from the current
functional tile grid to a polished, touch-first hub that matches the mockup's
feel, built entirely from the token component kit and the new themes so it looks
right in every theme.

## Tasks

1. Rebuild the hub layout to the mockup's hierarchy: prominent primary tiles for
   the core jobs (Play a Disc, Create a Disc, Catalog), plus secondary access to
   Now Playing, Themes, Settings, and a Search affordance. Keep the destinations
   wired to the existing `setView` handlers.
2. Fit-to-viewport: the hub fills the screen and never scrolls; tiles reflow by
   width with `auto-fit`/`clamp()`, not device breakpoints. Large tap targets,
   generous spacing, clear pressed states.
3. Ensure the persistent transport dock coexists cleanly with the hub (the hub is
   full-bleed today via `.app-shell--home`; keep the dock present and correct).
4. Style only through `--omd-*` tokens so all themes render the hub well. Add hub
   component classes to `components.css` if needed (token values only).
5. Optional if time allows and the user wants it: a working Search that filters
   the catalog. If out of scope, leave a clearly-labeled affordance that routes
   to Catalog and note it in the Log for a later step. Do not ship a dead
   control silently.

## Verify

- Build and lint clean.
- Relaunch; ask the user to confirm the hub looks premium, all tiles navigate,
  nothing scrolls off-screen, and it holds up in each theme and at a narrow
  window width.

## Commit and update status

1. Commit, for example `feat(studio): premium touch Home hub`.
2. Update [`./redesign-status.md`](./redesign-status.md): tick row 06, set row 07
   to `Next`, refresh Current state, and Log what the hub now includes and
   anything deferred (for example Search).

## Hand off to the next step

Keep the series self-contained and self-propagating. Before you finish, prepare
the next prompt so whoever runs it in a fresh chat has current context:

1. Open the next prompt, [`./redesign-07-pi-tuning.prompt.md`](./redesign-07-pi-tuning.prompt.md).
2. Refresh its "## Current context (snapshot ...)" section to reflect the repo
   after your work: the last commit, what the hub and app look like now, the
   files and patterns step 07 will touch, and anything you deferred. If that
   section is missing, add it right after the "## Before you start" section
   (use this prompt's "Current context" section as the shape to follow).
3. Make sure that prompt still contains a "## Hand off to the next step" section
   like this one, pointing at the step after it
   (`redesign-08-docs-pass.prompt.md`). If it is missing, copy this section into
   it and update the two file names. This is how every step keeps the next one
   current, so do not drop it.

## Guardrails

- Reuse existing navigation handlers; do not fork routing.
- Tokens only; CSSOM for dynamic; CSP rules apply.
- No dead controls; wire it or clearly route it and note the deferral.
- No em dash. No emojis in headers.
