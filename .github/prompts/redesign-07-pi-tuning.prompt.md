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

## Guardrails

- Content-driven breakpoints, not per-device assumptions.
- Kiosk is opt-in; desktop windowed stays the default.
- Tokens only; CSSOM for dynamic; CSP rules apply.
- No em dash. No emojis in headers.
