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
2. Look at the reference mockup: `sources/images/example4_touchScreenUi.png`
   (a glass hub with large tiles and a persistent transport). Treat it as visual
   direction, not a pixel spec.
3. Clean tree, green build.

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

## Guardrails

- Reuse existing navigation handlers; do not fork routing.
- Tokens only; CSSOM for dynamic; CSP rules apply.
- No dead controls; wire it or clearly route it and note the deferral.
- No em dash. No emojis in headers.
