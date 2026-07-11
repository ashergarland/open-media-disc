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
