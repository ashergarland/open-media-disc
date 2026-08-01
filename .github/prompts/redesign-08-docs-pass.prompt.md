---
mode: agent
description: Redesign step 08 of 10. Bring OMD Studio documentation in line with the redesigned app (omd-studio.md and related), fixing stale layout, theme, and codec language. Run in a fresh chat; read the shared status file first.
---

# Redesign 08: Documentation pass

Step 08 of the OMD Studio redesign series. Run in order, one per fresh chat.

## Before you start

1. Read [`./redesign-status.md`](./redesign-status.md) fully; confirm this is the
   "Next" step. Read [`../copilot-instructions.md`](../copilot-instructions.md)
   (docs-in-sync rule and change-to-docs mapping) and the existing
   [`docs-pass`](./docs-pass.prompt.md) prompt for the house doc process.
2. Clean tree, green build.

## Current context (snapshot as of step 07)

This snapshot keeps the prompt self-contained. `redesign-status.md` is still the
authoritative log; read it for the full history and any newer entries.

- Last commit at hand-off: `6d4bc20`. Working tree clean; `pnpm -r build`,
  `pnpm test` (157), and `pnpm lint` are green. Five commits ahead of
  `origin/main`; nothing has been pushed.
- Styling model: the app renders from `shell.css` (layout only) plus
  `components.css` (the `--omd-*` token contract, the component kit, and a
  shrinking "Legacy token bridge"). There is **no theme stylesheet**. The three
  themes are token maps applied via `data-theme` on `document.documentElement`:
  `midnight` (dark default), `daylight` (light), `ember` (amber dark), with a
  live picker on the Themes view and `localStorage` persistence. Any doc text
  mentioning Frutiger Aero, DORFic, Technozen, Dark Aero, or importable JSON
  themes is stale.
- Navigation is hub-and-spoke: `homeView()` renders the Home hub (brand +
  catalog search + tiles for Play a Disc, Create a Disc, Catalog, plus Now
  Playing, Themes, Settings), every other view is `screenFrame()` with a sticky
  top bar whose only nav control is a Home button, and the transport dock is
  persistent on every view. The `.app-sidebar` is still built but `display:none`;
  do not document it. Labels is not a hub tile; it is reached from the "Label
  sheets" button in the Catalog actions row.
- Layout contract (step 07, now documented in `packages/studio/README.md` and in
  a "Screen sizes and kiosk mode" section of `documentation/omd-studio.md`): one
  fit-to-viewport surface, the page never scrolls, only bounded regions do,
  layouts reflow by width rather than by device, supported range is a 7 inch
  landscape panel (800x480) through a desktop window down to a phone width,
  landscape is the design target and portrait is verified.
- Kiosk mode is opt-in via `--omd-kiosk` / `OMD_STUDIO_KIOSK` (full-screen, no
  chrome); the desktop launches as a normal maximized window with no menu bar.
- The app also has a fixtures data mode and a headless screenshot harness
  (`--omd-data=fixtures`, `--omd-screenshots`, and the `omd-studio-shots` bin).
  Both are already documented in the studio README and in `omd-studio.md`; check
  those sections for accuracy rather than rewriting them.
- Codec language is already honest in the app: it shows the real codec plus
  factual facts (sample rate, plus bit depth for lossless or bitrate for lossy).
  `omdFormat` is still the legacy string `OMD-FLAC-DATA` and `omdVersion` is
  still `0.1.0`; both are deliberate, so do not "fix" them.
- Create a Disc (reworked after step 07) is a source chooser, then a burn screen
  that probes the drive and reports the real disc: media type, capacity, blank
  state, rewritable vs write-once, with the cartridge visual and a used/free
  meter. It blocks burning with no disc, on a used write-once disc, or when the
  selection will not fit. Its track list allows per-track removal for that burn
  only; a trimmed package is compiled to a temp folder and deleted afterwards,
  leaving the catalog package untouched. Document that, not the old "blanks a
  rewritable disc, writes this album, then verifies it" wording.
- Known doc drift to expect: `documentation/omd-studio.md` still describes a
  left sidebar, a six-step Create wizard, the old theme names, and a VS Code
  style importable-JSON theme contract that the app no longer implements.

## Goal

Update the docs so they describe the app as it is now, not the old sidebar
wizard. The main offender is
[`documentation/omd-studio.md`](../../documentation/omd-studio.md), which still
describes a left sidebar (Create Disc / Player / Catalog / Themes / Settings), a
"Frutiger Aero" default theme, a six-step Create wizard, and "FLAC" badges.

## Tasks

1. Rewrite `documentation/omd-studio.md` to match the shipped app:
   - Navigation and layout: the hub-and-spoke touch model with a persistent
     transport dock (not the old fixed sidebar). Reference the redesign brief.
   - Views: Home hub, Disc, Catalog, Create a Disc (unified source chooser:
     from catalog / import a package / import music / new mixtape), Labels,
     Themes, Settings.
   - Theme system: the new token-map themes and the live picker (replace the
     Frutiger Aero / Classic Amp text). Describe themes as `--omd-*` token maps
     over one shared component stylesheet.
   - Honest codec language: real codec plus Lossless / Lossy, never "FLAC
     lossless" or fixed bit depth.
   - Keep the ripping and shared-core sections accurate; update any stale detail.
2. Check the rest of `documentation/` for related drift touched by the redesign:
   `roadmap.md`, `project-status.md`, `what-is-omd.md`, and the README index.
   Update anything that describes the old Studio UI, theme names, or lossless
   language. Do not overreach into unrelated docs.
3. Follow house style: no em dash, no emojis in Markdown headers, keep anchors
   stable where other docs link to them (or update the links too).
4. If a screenshot or mockup reference is now wrong, fix or remove the reference
   rather than leaving it stale.

## Verify

- Re-read the changed docs for internal consistency and against the real app.
- Confirm cross-links still resolve (roadmap anchors, README table entries).
- No code changes are required here; if you find a doc claim the app does not
  meet, note it in the Log rather than silently "fixing" it in docs.

## Commit and update status

1. Commit, for example `docs: update OMD Studio docs for the redesigned app`.
2. Update [`./redesign-status.md`](./redesign-status.md): tick row 08, set row 09
   to `Next`, refresh Current state, and Log which docs changed and any
   app-versus-docs mismatch discovered.

## Hand off to the next step

Keep the series self-contained and self-propagating. Before you finish, prepare
the next prompt so whoever runs it in a fresh chat has current context:

1. Open the next prompt, [`./redesign-09-release.prompt.md`](./redesign-09-release.prompt.md).
2. Refresh its "## Current context (snapshot ...)" section to reflect the repo
   after your work: the last commit, what the app and docs look like now, the
   files and patterns step 09 will touch, and anything you deferred. If that
   section is missing, add it right after the "## Before you start" section
   (use this prompt's "Current context" section as the shape to follow).
3. Make sure that prompt still contains a "## Hand off to the next step" section
   like this one, pointing at the step after it
   (`redesign-10-hardware-test.prompt.md`). If it is missing, copy this section
   into it and update the two file names. This is how every step keeps the next
   one current, so do not drop it.

## Guardrails

- Docs must match the shipped behavior; do not document intentions as facts.
- Respect the public/internal split (see copilot-instructions and product
  context); do not leak internal strategy into public docs.
- No em dash. No emojis in headers.
