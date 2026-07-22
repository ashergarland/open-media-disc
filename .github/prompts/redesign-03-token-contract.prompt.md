---
mode: agent
description: Redesign step 03 of 10. Expand the --omd-* token vocabulary and make OMD Studio render fully from components.css alone, so it no longer depends on a full theme stylesheet. Run in a fresh chat; read the shared status file first.
---

# Redesign 03: Token contract and self-contained styling

Step 03 of the OMD Studio redesign series. Run in order, one per fresh chat.

## Before you start

1. Read [`./redesign-status.md`](./redesign-status.md) fully; confirm this is the
   "Next" step. Read [`../copilot-instructions.md`](../copilot-instructions.md)
   and [`../../documentation/redesign-plan.md`](../../documentation/redesign-plan.md)
   section 6 (theme system) and 7 (components).
2. This step depends on 01 and 02 being done (Labels and editors on tokens). If
   the "Legacy token bridge" still has active users, note them; the goal here is
   to make them unnecessary.
3. Clean tree, green build.

## Goal

Make the app fully stylable from the token contract so a theme is just a token
map, not a 1400-line stylesheet. Concretely: everything visible should get its
look from `--omd-*` variables defined in
[`components.css`](../../packages/studio/src/renderer/components.css), so that
removing `themes/dark-aero.css` (done in step 04) leaves the app looking correct
because `components.css` provides sensible default token values in `:root`.

This is the enabling refactor for real multiple themes. Do not author new themes
here (that is step 04); just make the styling self-contained and the vocabulary
complete.

## Tasks

1. Audit the current token contract in `components.css` `:root`. Expand it into a
   complete, documented vocabulary that can express the app's surfaces without a
   theme stylesheet. At minimum cover: base/background, layered surfaces, border
   and hairline, primary/secondary/dim text, accent and secondary accent,
   radii (small/large), shadow/elevation, blur, focus ring, control fill and
   border, danger/success/warning, and the transport and slider colors. Group and
   comment them. Keep names stable where they already exist.
2. Give every `:root` token a strong default value (the current dark direction)
   so the app is correct with `components.css` alone.
3. Sweep the token component classes and the (soon to be removed) bridge so any
   remaining hardcoded color/gradient/shadow reads a token with a fallback:
   `var(--omd-x, <default>)`. CSS `var()` fallbacks may contain commas, so
   multi-layer gradient/shadow fallbacks are allowed.
4. Confirm the app does not rely on `themes/dark-aero.css` for anything the token
   kit should own. A quick way to check: in the browser preview
   (`http://localhost:5599`, CSS-only probe) temporarily disable the theme link
   and confirm the shell, buttons, cards, dock, and lists still look right from
   `components.css`. (The preview cannot run app logic, but it can show static
   styling.) Do not commit the disabled link.
5. Do not delete `dark-aero.css` yet; step 04 removes it once themes exist.

## Verify

- Build and lint clean.
- Relaunch; ask the user to confirm nothing regressed visually.
- Document the final token list (names + meaning) in the Log or a short comment
  block at the top of the `:root` section so step 04 can author themes against it.

## Commit and update status

1. Commit, for example
   `refactor(studio): complete the --omd-* token contract; self-contained styling`.
2. Update [`./redesign-status.md`](./redesign-status.md): tick row 03, set row 04
   to `Next`, refresh Current state, and Log the final token vocabulary (or where
   it is documented) plus whether the bridge section can now be removed.

## Guardrails

- No new themes here; only the contract and defaults.
- Keep existing token names stable to avoid churn in already-migrated views.
- Tokens only in components; CSSOM for dynamic; CSP rules apply.
- No em dash. No emojis in headers.
