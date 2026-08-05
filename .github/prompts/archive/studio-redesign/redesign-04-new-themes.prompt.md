---
mode: agent
description: Redesign step 04 of 10. Author two to three original OMD Studio theme token maps, rebuild the Themes view as a real live picker with persistence, and retire the old dark-aero.css. Run in a fresh chat; read the shared status file first.
---

# Redesign 04: New themes and a real Themes picker

Step 04 of the OMD Studio redesign series. Run in order, one per fresh chat.

## Before you start

1. Read [`./redesign-status.md`](./redesign-status.md) fully; confirm this is the
   "Next" step. This step depends on 03 (the app must render fully from the token
   contract in `components.css`).
2. Read [`../../../../documentation/redesign-plan.md`](../../../../documentation/redesign-plan.md)
   section 6. The direction: a small set (target three) of strong original
   themes, each a compact `--omd-*` token map, switched by a variable swap
   (inherently flash-free). Names and art direction are open; propose them.
3. Clean tree, green build.

## Goal

Ship real, switchable themes and a working Themes picker, and remove the last
full theme stylesheet.

## Tasks

1. Decide the theme set with the user if art direction is unclear (ask a short
   question: how many, and the mood/palette for each). A sensible default trio:
   one deep dark (the Pi default), one clean light, one accent-forward or
   high-contrast. Confirm before authoring if the user has preferences.
2. Represent each theme as a token map. Preferred approach: a `:root[data-theme="<id>"]`
   block in `components.css` (or a small dedicated `themes.css` that only sets
   `--omd-*` values, loaded after `components.css`) that overrides the base token
   values. No per-theme component CSS; the component kit stays shared.
3. Rebuild the Themes view in
   [`renderer.ts`](../../../../packages/studio/src/renderer/renderer.ts) as a real live
   picker: a card per theme with a small swatch preview (set swatch colors via
   CSSOM `setProperty`, not inline `style=`), the active theme marked, and
   clicking one applies it immediately by setting `data-theme` on the document
   root (or swapping the token block). Reuse the token component kit.
4. Persist the choice in `localStorage` (there is prior art with key
   `omd.themeId`) and apply the persisted theme on boot in `init()`. Keep a safe
   default when storage is empty or the id is unknown.
5. Remove `themes/dark-aero.css`, drop its `<link>` from `index.html`, and remove
   the theme-file copy from `build.mjs` if it is now unused. Also delete the
   `assets/dark-aero/` theme assets if the new themes do not use them (check
   `logoFor` / `cartridgeFor` first; update them to theme-agnostic assets or to
   the new theme ids as needed).
6. Remove the now-dead "Legacy token bridge" section of `components.css` if steps
   01-03 left it empty. Confirm with a grep first.

## Verify

- Build and lint clean, including no `noUnusedLocals` fallout from removed theme
  wiring.
- Relaunch; ask the user to switch between all themes and confirm each looks
  good, switching is instant with no flash, and the choice survives a restart.
- Confirm the app looks correct with the old theme stylesheet gone.

## Commit and update status

1. Commit, for example
   `feat(studio): token-map themes and a live Themes picker; retire old theme CSS`.
2. Update [`./redesign-status.md`](./redesign-status.md): tick row 04, set row 05
   to `Next`, refresh Current state, and Log the theme ids, where the token maps
   live, the persistence key, and any assets removed.
3. Update repository memory: the "single forced dark theme" note is now
   superseded; record the new theme system.

## Guardrails

- Themes are data (token maps) only; keep the component stylesheet shared.
- Switching must be a variable swap, not a stylesheet fetch (CSP blocks fetch;
  flash-free requires no load gap).
- Tokens only; CSSOM for swatches; CSP rules apply.
- No em dash. No emojis in headers.
