---
mode: agent
description: Redesign step 05 of 10. Sweep dead code, unused CSS, throwaway scripts, and stale assets from OMD Studio now that migrations and the new theme system are in place. Run in a fresh chat; read the shared status file first.
---

# Redesign 05: Dead code and asset cleanup

Step 05 of the OMD Studio redesign series. Run in order, one per fresh chat.

## Before you start

1. Read [`./redesign-status.md`](./redesign-status.md) fully; confirm this is the
   "Next" step. This step is safe only after 01-04 (migrations done, old themes
   removed), so the classes and files below are truly dead.
2. Clean tree, green build.

## Goal

Remove code, styles, assets, and throwaway tooling that are no longer used, so
the codebase is lean before the final polish and release. Deletions only; no
behavior change.

## Candidates to check and remove (verify each before deleting)

- Any remaining "Legacy token bridge" rules in `components.css` (should be empty
  after 01-04).
- Stale classes: `.npd-chip.flac` and other honest-codec leftovers, plus any
  `.import-picker` / `.codec-option` / `.edit-*` / `.sheet-*` / `.wizard-*` /
  showcase classes (`.liquid-rim`, `.button-surface`, `.pc-rim`, etc.) that no
  migrated view references anymore.
- Unreferenced stylesheets: if `shell.css` and `components.css` fully cover the
  app, confirm no orphaned `styles.css` or old theme CSS remains and that
  `build.mjs` `copyStatic` no longer copies anything unused.
- Throwaway dev tooling that was never meant to ship: `packages/studio/_preview.mjs`
  (the localhost:5599 preview server) and `sync-themes.mjs` if the new theme
  system no longer generates theme CSS from showcases. Remove them and any
  `package.json` scripts that reference them.
- Unused IPC handlers, preload bridges, and `shared/types.ts` DTOs. Grep each
  handler name across `renderer.ts` and delete the handler, its preload method,
  and its type together if nothing calls it. (Prior cleanups removed
  `omd:createPackage` and `omd:selectAlbumFolder`; look for others.)
- Unused `dom.ts` icons and helpers, unused assets under
  `packages/studio/src/renderer/assets/`.
- Unused exports in `packages/core`, `packages/ui`, `packages/label` that only
  the removed Studio paths consumed (be careful: the CLI also consumes core).

## Method

1. For each candidate, grep the whole `src` tree (and the CLI for core exports)
   to prove it is unreferenced. Never delete on a hunch.
2. Delete with `git rm` where possible so removals are tracked.
3. Rebuild after each group of deletions; `noUnusedLocals` will catch anything
   you missed in TypeScript, but CSS and assets need manual grep.

## Verify

- `pnpm --filter @open-album-cartridge/studio build`, `pnpm test`, and
  `pnpm lint` all clean.
- Relaunch; ask the user to confirm the app still looks and works the same (this
  is a no-visible-change cleanup).

## Commit and update status

1. Commit, for example `chore(studio): remove dead code, CSS, and dev tooling`.
   Split into a couple of focused commits if the sweep is large (for example one
   for CSS/assets, one for IPC/types).
2. Update [`./redesign-status.md`](./redesign-status.md): tick row 05, set row 06
   to `Next`, refresh Current state, and Log what was removed and any surprising
   still-in-use finding.

## Guardrails

- Deletions only; if a removal changes behavior, it belongs in another step.
- Prove unreferenced before deleting; core exports may be used by the CLI.
- Do not remove in-progress or intentionally-unreferenced work without asking.
- No em dash. No emojis in headers.
