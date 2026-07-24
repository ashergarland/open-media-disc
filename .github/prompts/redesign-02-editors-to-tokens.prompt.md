---
mode: agent
description: Redesign step 02 of 10. Migrate the OMD Studio editor views (import review, mixtape builder, album metadata editor) to the --omd-* token component kit and remove the legacy field and picker CSS. Run in a fresh chat; read the shared status file first.
---

# Redesign 02: Editors to tokens

Step 02 of the OMD Studio redesign series. Run in order, one per fresh chat.

## Before you start

1. Read [`./redesign-status.md`](./redesign-status.md) fully and confirm this is
   the "Next" step. Read [`../copilot-instructions.md`](../copilot-instructions.md).
2. Confirm a clean tree and a green build
   (`pnpm --filter @open-media-disc/studio build`).

## Goal

Migrate the three editor surfaces in
[`packages/studio/src/renderer/renderer.ts`](../../packages/studio/src/renderer/renderer.ts)
from the legacy field markup to the `--omd-*` token component kit, then delete
the field/picker classes from the "Legacy token bridge" in
[`components.css`](../../packages/studio/src/renderer/components.css) and any dead
`.import-picker` / `.codec-option` / `.edit-*` rules in
[`shell.css`](../../packages/studio/src/renderer/shell.css).

The three surfaces:
- Import review (`importReviewView`) - the per-album review/edit form shown when
  importing music (fields: album, artist with Various Artists hint, year, disc
  title, format/codec chooser, per-track title/artist/album/year).
- Mixtape builder (`mixtapeView`) - two-column library-plus-selection builder.
- Album metadata editor (`albumEditView`) - edit a catalog package's metadata.

They already share the `editField` / `editTrackRow` helpers taking an
`EditableMeta`. Keep that sharing.

## Tasks

1. Introduce token field helpers (text input, number input, select, toggle,
   inline field error) as small builders, reading only `--omd-*` variables. Put
   the CSS in the token section of `components.css` (for example
   `.omd-field`, `.omd-input`, `.omd-select`, `.omd-toggle`, `.omd-field-error`).
   Reuse the existing `.omd-select` if it already fits.
2. Convert `editField`, `editTrackRow`, the import codec chooser, and the
   Various Artists hint to the new helpers. Preserve validation behavior:
   inline blur validation, invalid highlight, and the on-Save error banner. Keep
   the `notice` banner styled from tokens.
3. Keep the fit-to-viewport structure already in place (`.omd-stack.omd-fill`
   fixed action bar plus `.omd-scroll` body). Ensure inputs are touch-sized
   (44px min height) and easy to tap.
4. After migrating, grep `src/renderer` for the old classes (`.edit-input`,
   `.edit-field`, `.edit-label`, `.edit-error`, `.edit-track*`, `.notice*`,
   `.status-pill`, `.import-picker`, `.codec-option`, `.import-fail`) and remove
   any that are now unreferenced from the bridge section and `shell.css`. Do not
   remove a class still used elsewhere; confirm each first.
5. Watch for `noUnusedLocals`: delete helpers that are no longer called.

## Verify

- Build and lint are clean.
- Relaunch and ask the user to confirm: importing a folder still lands in the
  review form prefilled, editing and Save work, the mixtape builder and the
  catalog album editor still save. You cannot verify these yourself (they need
  `window.omd`, absent in the preview server).

## Commit and update status

1. Commit, for example
   `refactor(studio): migrate import/mixtape/album editors to tokens`.
2. Update [`./redesign-status.md`](./redesign-status.md): tick row 02, set row 03
   to `Next`, refresh Current state, add a Log entry (what migrated, which bridge
   classes were deleted, remaining bridge users if any).
3. Note in the Log whether the "Legacy token bridge" section is now empty or what
   still depends on it (step 03 needs to know).

## Guardrails

- Behavior parity for validation and saving; no new editor features.
- Tokens only; no bespoke colors. CSSOM for dynamic styles (CSP).
- No em dash. No emojis in headers.
