# OMD prompt library

Reusable workflow prompts that capture how this project is planned, built, and
released. Run one with `/<name>` in chat (for example `/next-steps`). Every
prompt honors the house rules in
[`../copilot-instructions.md`](../copilot-instructions.md) and the background in
[`../context/product-context.md`](../context/product-context.md): spec-first,
docs-in-sync, no em dash, no emojis in Markdown headers, and careful versioning.

## When to use each prompt

| Prompt | Use it to |
| --- | --- |
| [get-started](./get-started.prompt.md) | Onboard on a fresh machine or fresh chat: one-command install, build, test, and lint, then report project state and the next step. |
| [next-steps](./next-steps.prompt.md) | Run the top-level planning session: decide direction, set goals and roadmap, pick the next stage, and drive it end to end. Start here. |
| [stage-kickoff](./stage-kickoff.prompt.md) | Plan and design one deliverable stage: scope, non-goals, exit criteria, and a task list. |
| [spec-change](./spec-change.prompt.md) | Change the format safely, spec-first, with schema, fixtures, and docs kept in sync. |
| [add-feature](./add-feature.prompt.md) | Add a CLI command or a core SDK API with matching tests and docs. |
| [release-checkpoint](./release-checkpoint.prompt.md) | Verify green, bump the version, and propose a commit and tag at a demoable point. |
| [docs-pass](./docs-pass.prompt.md) | Audit and repair documentation: drift, links, style, and spec-to-docs consistency. |
| [promote-sources](./promote-sources.prompt.md) | Turn raw internal or source material into official public docs while respecting the public and internal split. |

## Typical flow

1. `/next-steps` to choose direction and the next stage.
2. `/stage-kickoff` to design that stage and produce a task list.
3. `/spec-change` and/or `/add-feature` to implement in small, verifiable steps.
4. `/docs-pass` to make sure the docs match the code.
5. `/release-checkpoint` to cut a visible version.

## OMD Studio redesign series (run in order)

A finite, ordered set of prompts that finish the OMD Studio redesign, one chunk
per prompt. They are designed to be run in **separate fresh chats**, in order,
sharing state through a single status file:
[`redesign-status.md`](./redesign-status.md). Each prompt reads that file first
for context and updates it before finishing, so no context is lost between chats.

Start by opening [`redesign-status.md`](./redesign-status.md) to see which step
is marked `Next`, then run that prompt.

| # | Prompt | Does |
| --- | --- | --- |
| 01 | [redesign-01-labels-to-tokens](./redesign-01-labels-to-tokens.prompt.md) | Rebuild the Labels view on the token component kit. |
| 02 | [redesign-02-editors-to-tokens](./redesign-02-editors-to-tokens.prompt.md) | Migrate the import review, mixtape, and album editor views to tokens. |
| 03 | [redesign-03-token-contract](./redesign-03-token-contract.prompt.md) | Complete the `--omd-*` token contract; make styling self-contained. |
| 04 | [redesign-04-new-themes](./redesign-04-new-themes.prompt.md) | Author token-map themes and a live Themes picker; retire the old theme CSS. |
| 05 | [redesign-05-cleanup](./redesign-05-cleanup.prompt.md) | Sweep dead code, CSS, assets, and dev tooling. |
| 06 | [redesign-06-home-hub](./redesign-06-home-hub.prompt.md) | Rebuild the Home hub toward the premium touch mockup. |
| 07 | [redesign-07-pi-tuning](./redesign-07-pi-tuning.prompt.md) | Small-screen and kiosk tuning for the Raspberry Pi panel. |
| 08 | [redesign-08-docs-pass](./redesign-08-docs-pass.prompt.md) | Bring the Studio docs in line with the redesigned app. |
| 09 | [redesign-09-release](./redesign-09-release.prompt.md) | Verify green, bump the software version, propose commit and tag. |
| 10 | [redesign-10-hardware-test](./redesign-10-hardware-test.prompt.md) | Guided manual burn-and-play acceptance on real hardware. |
