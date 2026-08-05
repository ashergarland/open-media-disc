---
mode: agent
description: Redesign step 01 of 10. Rebuild the OMD Studio Labels view on the --omd-* token component kit and remove its legacy bridge CSS. Run in a fresh chat; read the shared status file first.
---

# Redesign 01: Labels view to tokens

This is step 01 of the OMD Studio redesign series. The steps are meant to run in
order, one per fresh chat, sharing state through a status file.

## Before you start

1. Read [`./redesign-status.md`](./redesign-status.md) end to end. It has the
   project overview, file locations, commands, constraints, verification limits,
   and the roadmap. Confirm this prompt (01) is the "Next" one; if not, run the
   one marked Next instead.
2. Read [`../../../copilot-instructions.md`](../../../copilot-instructions.md) and skim the
   redesign brief [`../../../../documentation/redesign-plan.md`](../../../../documentation/redesign-plan.md)
   sections 4 (touch-first rules) and 7 (component kit).
3. Confirm the working tree is clean (`git status`). Build once to be sure the
   baseline is green: `pnpm --filter @open-media-disc/studio build`.

## Goal

Rebuild [`packages/studio/src/renderer/labelsView.ts`](../../../../packages/studio/src/renderer/labelsView.ts)
so it composes the `--omd-*` token component kit in
[`packages/studio/src/renderer/components.css`](../../../../packages/studio/src/renderer/components.css)
(the classes prefixed `omd-`) instead of the old Frutiger showcase classes
(`.card`, `.btn--primary`, `.wizard-panel`, `.sheet-preview`, `.stepper`,
`.link-btn`, `.label-picker`, and friends) that currently only look right
because of the temporary "Legacy token bridge" section.

The Labels view keeps all of its current behavior: choose a library folder,
list album packages, multi-select with per-package copy counts, live sheet
preview, and Save / Print. Only the markup and CSS change.

## Tasks

1. Study the current `labelsView.ts` and how the migrated views (catalog, album
   detail, settings) use the token kit in `renderer.ts`: `omdBtn`, `omdPanel`,
   `omdKv`, `.omd-stack`, `.omd-fill`, `.omd-scroll`, `.omd-screen` structure.
   Reuse those helpers and classes; do not invent parallel ones. If a small new
   token component is genuinely needed (for example a label picker row or a sheet
   page frame), add it to `components.css` in the token section using existing
   `--omd-*` variables only.
2. Rebuild the view to the fit-to-viewport contract: a fixed header/action area
   plus one bounded `.omd-scroll` region for the long list, so the page itself
   never scrolls. Two-column on wide widths, stacked when narrow via an
   `auto-fit`/content-driven rule (no device breakpoints).
3. Keep every finger target at least 44px; the copies stepper and toggles must
   be comfortably tappable.
4. Remove the now-unused Labels-specific classes from the "Legacy token bridge"
   and from `shell.css` if they are no longer referenced anywhere. Grep to be
   sure before deleting (`grep` for each class name across `src/renderer`).
5. Keep the label sheet preview pages legible (white paper on the dark surface is
   fine; that is semantic paper, not a theme color).

## Verify

- `pnpm --filter @open-media-disc/studio build` is clean (watch for
  `noUnusedLocals` errors from removed helpers/classes).
- `pnpm lint` is clean.
- Relaunch the app (see the status file) and ask the user to confirm the Labels
  view looks right and still builds/saves/prints a sheet. Remember: you cannot
  verify the real view yourself; the preview server cannot load packages.

## Commit and update status

1. Commit with a message like
   `refactor(studio): rebuild Labels view on the token component kit`.
2. Update [`./redesign-status.md`](./redesign-status.md): tick roadmap row 01
   (`[x]`, Status `Done <sha>`), set row 02 to `Next`, refresh "Current state"
   (new sha, tree clean), and add a Log entry noting what moved to tokens, which
   bridge/`shell.css` classes were removed, and any gotcha.
3. If you learned a durable fact, also add it to repository memory
   (`/memories/repo/open-media-disc.md`).

## Guardrails

- Behavior parity only; do not add or drop Labels features here.
- Token components read `--omd-*` variables only; no bespoke hex values.
- No inline `style=` in static HTML (CSP); use CSSOM for dynamic values.
- No em dash in prose. No emojis in Markdown headers.
