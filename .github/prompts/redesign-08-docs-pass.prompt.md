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

## Guardrails

- Docs must match the shipped behavior; do not document intentions as facts.
- Respect the public/internal split (see copilot-instructions and product
  context); do not leak internal strategy into public docs.
- No em dash. No emojis in headers.
