---
mode: agent
description: Redesign step 10 of 10. Guide a manual burn-and-play acceptance test of OMD Studio on real hardware (Windows, real writable disc), then record the results. Run in a fresh chat; read the shared status file first.
---

# Redesign 10: Hardware acceptance test

Step 10 of the OMD Studio redesign series, and the final one. Run in order, one
per fresh chat.

## Before you start

1. Read [`./redesign-status.md`](./redesign-status.md) fully; confirm this is the
   "Next" step. Read [`../copilot-instructions.md`](../copilot-instructions.md).
2. This step is a **guided manual test with the user**, not an automated one.
   Burning is destructive and can only be validated on real hardware on Windows.
   You cannot run it yourself; you drive the checklist and record the outcome.
3. Clean tree, green build. The app should be at the release checkpoint (step 09).

## Current context (snapshot as of step 09)

This snapshot keeps the prompt self-contained. `redesign-status.md` is still the
authoritative log; read it for the full history and any newer entries.

- Last commit at hand-off: `f6df22a` (`chore(studio): release 0.2.0`), plus the
  status/prompt commit that follows it. The annotated tag **`studio-v0.2.0`**
  marks this checkpoint. Both the commits and the tag are **local only**: `main`
  is ahead of `origin/main`. Never push (or push tags) without asking.
- Version state: `@open-media-disc/studio` is `0.2.0` in
  `packages/studio/package.json` and in `STUDIO_VERSION`
  (`packages/studio/src/main/main.ts`); Settings/About shows "0.2.0 (alpha)".
  `omdVersion` stays `0.1.0`, so the disc format has not changed and any disc
  burned in this test is a normal `OMD-FLAC-DATA v0.1.0` disc.
- Steps 01-09 are done. The redesign is code-complete and demoable: the user has
  confirmed it in Electron on the desktop. `pnpm -r build`, `pnpm test` (157),
  and `pnpm lint` are green. This step is the only remaining one, and it is the
  first time the redesigned app meets real hardware.
- What the app looks like now: hub-and-spoke navigation from a Home hub of tiles,
  every other view a screen with a sticky top bar whose only nav control is Home,
  and a persistent transport dock. Views: home, disc, catalog, burn ("Create a
  Disc"), labels, themes, settings. It renders from `shell.css` (layout) plus
  `components.css` (the `--omd-*` token contract); themes are token maps applied
  via `data-theme`: `midnight` (dark default), `daylight`, `ember`.
- Where this step's flow lives, for diagnosing a failure:
  - `packages/studio/src/main/main.ts` holds every `ipcMain.handle`, including
    the burn, verify, eject, disc detection, `omd:probeMedia`, and rip handlers,
    plus the `omd-audio://` protocol used for playback.
  - The Create a Disc screen probes the drive and shows the real disc: capacity,
    used/free, media type, blank state, and rewritable vs write-once. Burn is
    blocked with no disc, on a used write-once disc, or when the selection will
    not fit. Per-track removals apply to that burn only and are compiled into a
    temp package by the main process, then deleted.
  - The underlying burn, verify, and rip logic is in `packages/core` (see its
    `burn` and `rip` modules and their tests), not in Studio.
- Useful commands: `pnpm studio` (or `pnpm --filter @open-media-disc/studio dev`)
  to launch the real app; add `--omd-data=fixtures` for the synthetic library.
  The headless screenshot harness
  (`--omd-screenshots=<views> --omd-out=./screenshots`) cannot burn; it is only
  for layout checks, and its `screenshots/` output is not gitignored, so delete
  it afterwards.
- Deferred and out of scope here unless the hardware test exposes them: the
  friendly docs still describe FLAC-only packages although the spec and core are
  multi-codec, and `@open-media-disc/ui` is still described as a shared theme
  engine although Studio only uses its player model.

## Goal

Confirm the redesigned OMD Studio performs the full real-world flow end to end on
hardware: detect or import an album, burn to a real writable disc, verify, eject,
then read and play the burned disc.

## Preconditions to confirm with the user

- A DVD writer is attached (prior sessions used a HL-DT-ST BD-RE BP60NB10).
- A writable disc is available. Note the media type: DVD-RW (rewritable, safe to
  reuse) or DVD-R (write-once, becomes a permanent coaster if the burn fails).
  Use DVD-RW for testing when possible.
- The user understands the disc will be erased (RW) or permanently written (R).

## Checklist to walk through with the user

1. Launch the real app (see the status file for the command). Confirm the target
   theme renders and the transport dock works.
2. Create a Disc flow: choose a source (from catalog or import music), review the
   metadata, and confirm the package is valid.
3. Burn: select the drive, keep blank/verify/eject on, start the burn, and watch
   the progress/phase feedback. Confirm the burn completes without the false
   remount/verify failure seen historically (the app forces an in-place volume
   remount before verify).
4. Verify and eject: confirm the app reports verification passed and ejects on
   success.
5. Read back: reinsert the disc, let the app detect it (or open it), confirm it
   reads as an OMD disc, and play a track through the transport (real audio,
   Chromium decodes FLAC natively; other codecs via the packaged decoder).
6. Rip to Catalog from the inserted disc and confirm the verified copy lands in
   the library.

## If something fails

- Capture the exact error text and the phase it failed in. Common historical
  issue: Windows not remounting a freshly burned volume before verify. Diagnose
  from the logs; do not retry a destructive burn blindly on a write-once disc.
- File the fix as a normal change (its own commit); do not bundle unrelated work.
  If the fix is substantial, it may warrant looping back through build/lint and a
  follow-up release checkpoint.

## Record and update status

1. Write the results into [`./redesign-status.md`](./redesign-status.md): tick
   row 10, mark the series complete, and add a detailed Log entry with the media
   type used, each checklist step's outcome, and any bug found or fixed.
2. Update repository memory (`/memories/repo/open-media-disc.md`) with the
   hardware result so it is retained.
3. If the whole series is now complete, note the final state and any remaining
   backlog (deferred items like Search, portrait mode, or importable user
   themes) so future work has a starting point.

## Guardrails

- Destructive action: never trigger a burn without the user's explicit go-ahead
  for that specific disc; prefer DVD-RW for tests.
- Record real outcomes only; do not mark hardware behavior verified unless the
  user confirms it on the physical disc.
- No em dash. No emojis in headers.
