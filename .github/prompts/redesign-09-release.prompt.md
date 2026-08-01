---
mode: agent
description: Redesign step 09 of 10. Verify everything is green, bump the OMD Studio software version, and propose a commit and tag at a demoable point (confirm-first). Run in a fresh chat; read the shared status file first.
---

# Redesign 09: Release checkpoint

Step 09 of the OMD Studio redesign series. Run in order, one per fresh chat.

## Before you start

1. Read [`./redesign-status.md`](./redesign-status.md) fully; confirm this is the
   "Next" step and that steps 01-08 are done. Read the existing
   [`release-checkpoint`](./release-checkpoint.prompt.md) prompt and
   [`../copilot-instructions.md`](../copilot-instructions.md) for the versioning
   policy.
2. Clean tree.

## Current context (snapshot as of step 08)

This snapshot keeps the prompt self-contained. `redesign-status.md` is still the
authoritative log; read it for the full history and any newer entries.

- Last commit at hand-off: `c54240f` (`docs: update OMD Studio docs for the
  redesigned app`), plus the status-file update that follows it. Working tree
  clean; `pnpm -r build`, `pnpm test` (157), and `pnpm lint` are green. Seven or
  more commits ahead of `origin/main`; nothing has been pushed.
- Steps 01-08 are done. The redesign is code-complete for this series: the app
  renders from `shell.css` (layout) plus `components.css` (the `--omd-*` token
  contract, the component kit, and a shrinking "Legacy token bridge"). There is
  no theme stylesheet.
- Navigation is hub-and-spoke: a Home hub of tiles, every other view a screen
  with a sticky top bar whose only nav control is Home, and a persistent
  transport dock. Views: home, disc, catalog, burn ("Create a Disc"), labels,
  themes, settings.
- Themes are `--omd-*` token maps applied via `data-theme`: `midnight` (dark
  default), `daylight`, `ember`, with a live picker and `localStorage`
  persistence.
- Docs are now in sync (step 08): `documentation/omd-studio.md` was rewritten for
  the shipped app, and `roadmap.md`, `project-status.md`, both READMEs, and
  `packages/studio/README.md` were corrected. **Do not re-litigate the docs here.**
- Where the version lives, for task 4:
  - `packages/studio/package.json` `version` (currently `0.1.0`).
  - `STUDIO_VERSION` in `packages/studio/src/main/main.ts` (currently `'0.1.0'`).
    It feeds Settings/About via `omd:info` **and** the `generator` field written
    into every manifest, so it must stay in sync with the package version.
  - The root `package.json` and the `core`/`cli` packages are at `0.2.0`
    (the CLI milestone). Decide with the user whether this checkpoint moves only
    the studio package or the whole workspace.
  - `omdVersion` in `packages/core/src/constants.ts` stays `0.1.0`. Do not touch it.
- Known findings logged in step 08 that are **out of scope** here (do not fix
  them in a release commit): the friendly docs still describe FLAC-only packages
  while the spec and core are multi-codec, and `@open-media-disc/ui` is still
  described as a shared theme engine although Studio only uses its player model.
- Step 10 is the real-hardware burn-and-play acceptance, so it is fine to cut a
  software checkpoint before hardware has been re-verified. Say so explicitly
  when proposing the tag.

## Goal

Cut a visible, demoable version of the redesigned OMD Studio. This is a
software-version bump only; the format version does not change.

## Tasks

1. Verify green: `pnpm --filter @open-media-disc/studio build`,
   `pnpm test`, and `pnpm lint` all clean. Fix or report any failure before
   proceeding; do not tag over a red build.
2. Confirm with the user that the redesign is at a demoable point (ideally after
   they have run the real app). If hardware acceptance (step 10) has not run yet,
   that is fine for a software checkpoint, but say so.
3. Decide the version bump with the user. Policy: patch by default, minor only
   when told, never major without instruction. The Studio package is
   `@open-media-disc/studio` (currently `0.1.0`). A redesign of this size is
   a reasonable minor bump if the user agrees; otherwise patch.
   - `omdVersion` (the format version in `packages/core/src/constants.ts`) stays
     unchanged. Only software versions move.
4. Update the version in `packages/studio/package.json` (and any Studio version
   constant surfaced in the UI, for example a `STUDIO_VERSION`), keeping them in
   sync.
5. Propose the commit and an annotated tag. Do not create the tag or push
   without explicit confirmation. Never push without asking.

## Verify

- Re-run the three checks after the version edit; still green.
- The version shows correctly in the app's Settings/About.

## Commit and update status

1. With confirmation, commit (for example
   `chore(studio): release <version>`) and create the annotated tag if the user
   approves. Do not push.
2. Update [`./redesign-status.md`](./redesign-status.md): tick row 09, set row 10
   to `Next`, refresh Current state (new sha, tag), and Log the version chosen
   and the tag name.

## Hand off to the next step

Keep the series self-contained and self-propagating. Before you finish, prepare
the next prompt so whoever runs it in a fresh chat has current context:

1. Open the next prompt,
   [`./redesign-10-hardware-test.prompt.md`](./redesign-10-hardware-test.prompt.md).
2. Refresh its "## Current context (snapshot ...)" section to reflect the repo
   after your work: the last commit, the version and tag you cut, what the app
   looks like now, the files and patterns step 10 will touch, and anything you
   deferred. If that section is missing, add it right after the
   "## Before you start" section (use this prompt's "Current context" section as
   the shape to follow).
3. Because step 10 is the last step in the series, it does not need a hand-off
   section of its own. Make sure it does tell the agent to close out
   [`./redesign-status.md`](./redesign-status.md) when the series is finished.

## Guardrails

- Never tag over a failing build.
- Versioning policy: patch default, minor only when told, never major without
  instruction; `omdVersion` stays fixed.
- Tag and push are confirm-first; never push without asking.
- No em dash. No emojis in headers.
