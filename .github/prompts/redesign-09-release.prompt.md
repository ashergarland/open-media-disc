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

## Guardrails

- Never tag over a failing build.
- Versioning policy: patch default, minor only when told, never major without
  instruction; `omdVersion` stays fixed.
- Tag and push are confirm-first; never push without asking.
- No em dash. No emojis in headers.
