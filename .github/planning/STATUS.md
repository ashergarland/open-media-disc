# OMD status

The **live tracker** for prompt-driven development. Every milestone step prompt
reads this file first and updates it last. If you are starting a fresh chat, this
is the first thing to read after
[`../copilot-instructions.md`](../copilot-instructions.md).

Do not delete history from this file. Completed milestones move down into the
completed table; they do not disappear.

Last updated: 2026-08-04.

## Current milestone

**None. Between milestones.**

The OMD Studio touch-first redesign shipped as `studio-v0.2.0` and its prompt
chain is archived in
[`../prompts/archive/studio-redesign/`](../prompts/archive/studio-redesign/README.md).
Hardware work is parked in
[`hardware-milestones.md`](./hardware-milestones.md).

The project is in an **ecosystem planning phase**: brainstorming a new set of
software milestones in [`ideas/`](./ideas/README.md), then selecting and
grouping them into [`ROADMAP.md`](./ROADMAP.md).

| Field | Value |
| --- | --- |
| Milestone | (none selected) |
| Prompt chain | (not yet generated) |
| Next step | Review [`ideas/`](./ideas/README.md) with the user, select, group into milestones |
| Blocked on | User review of the idea catalog |

## Repository state

| Field | Value |
| --- | --- |
| Branch | `main`, ahead of `origin/main`. **Never push without asking.** |
| Last release | `@open-media-disc/studio` 0.2.0, tag `studio-v0.2.0` (annotated, local only) |
| Format version | `omdVersion` 0.1.0, format id `OMD-FLAC-DATA` (unchanged since v0.1) |
| Package versions | root, `core`, `cli`, `label`, `studio` at 0.2.0; `ui` at 0.1.0 |
| Gates | `pnpm build`, `pnpm test` (157), `pnpm lint` green as of `studio-v0.2.0` |

## Completed milestones

| Milestone | Delivered | Version / tag | Where it lives now |
| --- | --- | --- | --- |
| **Core v0.1** | The package format and its tooling: spec, `@open-media-disc/core`, the `omd` CLI (`create`, `validate`, `inspect`, `checksum`), fixtures, docs. | `v0.1.0` | [`spec/`](../../spec), [`packages/core`](../../packages/core) |
| **Write and Play v0.2** | The host media loop: UDF image build, burn to 8cm DVD-RW with verify (Windows/IMAPI2), playback via mpv/ffplay, `omd image` / `omd burn` / `omd play`. | `v0.2.0` | [`packages/core`](../../packages/core), [`packages/cli`](../../packages/cli) |
| **OMD Studio (alpha)** | Electron desktop and touch app wrapping the core: import, package, label, burn, verify, play, rip. Plus `@open-media-disc/label` and `omd label`. | `studio-v0.2.0` | [`packages/studio`](../../packages/studio) |
| **OMD Studio touch-first redesign** | The app rebuilt on the `--omd-*` token contract, hub-and-spoke navigation, three token-map themes, Pi and kiosk tuning, docs pass, release. 10-step prompt chain, 9 steps delivered. | `studio-v0.2.0` | [archive](../prompts/archive/studio-redesign/README.md) |

## Active blockers

| ID | Blocker | Impact | Owner |
| --- | --- | --- | --- |
| B-1 | Hardware acceptance of the redesigned Studio has never run on a real disc. | The burn, verify, eject, reinsert, play, rip loop is unproven since the redesign. Any burn-path regression is currently invisible. | User (needs a writer plus a DVD-RW). Prompt is ready: [`hardware-01-studio-burn-and-play-acceptance`](../prompts/hardware/hardware-01-studio-burn-and-play-acceptance.prompt.md) |
| B-2 | Burning is Windows-only (IMAPI2). | Blocks Linux and macOS users entirely, and blocks every hardware device milestone. | Unassigned |
| B-3 | `main` is ahead of `origin/main` and `studio-v0.2.0` is unpushed. | The remote does not reflect the delivered work. | User decision |

## Decisions made

Newest first. Record any choice a future chat could get wrong.

| Date | Decision | Why |
| --- | --- | --- |
| 2026-08-04 | Planning lives in `.github/planning/` (agent-facing), not in `documentation/`. `documentation/` stays user-facing and describes what exists. | Keeps the public docs clean; the planning control plane sits next to the prompts and instructions that consume it. |
| 2026-08-04 | Hardware milestones are **parked, not cancelled**, and preserved in [`hardware-milestones.md`](./hardware-milestones.md) with prompts in [`../prompts/hardware/`](../prompts/hardware/README.md). | Hardware cannot be verified by an agent and gates on bench time. Adoption is a software problem first. |
| 2026-08-04 | Completed prompt chains are archived under `../prompts/archive/<chain>/`, never deleted. | The gotchas and decisions in a finished chain stay useful; the live prompt folder stays readable. |
| 2026-08-04 | The strategic goal is **ecosystem breadth**: OMD becomes dominant through a large software ecosystem, not through a single flagship app. | Stated by the user at the start of the ecosystem planning phase. |
| 2026-07 | `@open-media-disc/studio` versions and tags **per package** (`studio-v0.2.0`), because `v0.1.0` and `v0.2.0` were taken by the CLI milestone. | Avoids tag collisions across packages in the monorepo. |
| 2026-07 | Themes are `--omd-*` token maps only. A theme never ships CSS or JS and never changes layout. | Keeps layout and accessibility guarantees stable across every theme, including on the Pi panel. |
| 2026-07 | Format version (`omdVersion`) and software versions move independently. `omdVersion` stays 0.1.0. | A tool release must never silently change the disc format. |

## Durable facts worth carrying between chats

These are repository-level truths, not milestone state. The archived
[`redesign-status.md`](../prompts/archive/studio-redesign/redesign-status.md)
has a longer list specific to Studio's CSS and build.

- The Studio version lives in **two** places that must move together:
  `packages/studio/package.json` and `STUDIO_VERSION` in
  `packages/studio/src/main/main.ts`.
- `tsc` runs with `noUnusedLocals` / `noUnusedParameters`, so dead code is a
  **build error**. Delete as you go.
- Studio's CSP forbids inline `style=`. Dynamic styling goes through CSSOM
  `setProperty`.
- The Studio browser preview is unreliable (`window.omd` is undefined). Use the
  headless screenshot harness for layout audits, and the user for behavior.
- One codec per package. Never write "FLAC lossless" or claim a fixed bit depth.

## How to update this file (every step prompt must do this)

1. Update **Current milestone**: which step just finished, which is next, and any
   change to what it is blocked on.
2. Update **Repository state** if the last commit, versions, or gates changed.
3. Add or resolve rows in **Active blockers**.
4. Append to **Decisions made** if a choice was made that a future chat could get
   wrong. Newest first.
5. On milestone completion, move the milestone into **Completed milestones** and
   set Current milestone to the next one from
   [`ROADMAP.md`](./ROADMAP.md).
6. Update the "Last updated" date at the top.
