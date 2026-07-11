---
description: Keep the README and documentation/ in sync whenever source, spec, or CLI files change.
applyTo: "packages/**/src/**,spec/**,scripts/**,packages/**/README.md"
---

# Keep documentation in sync

You are editing OMD source, spec, or tooling. Before you consider this change
complete, verify that the **README** and **`documentation/`** still match the new
behavior. Update them in the *same* change, and never leave the docs describing
the old behavior.

## Decide what to update

- **CLI change** (`packages/cli/src/**`): update
  [`documentation/cli-reference.md`](../../documentation/cli-reference.md),
  [`documentation/getting-started.md`](../../documentation/getting-started.md),
  the root [`README.md`](../../README.md), and the `HELP` string in
  `packages/cli/src/bin/omd.ts` so all four agree on commands and options.
- **Core API change** (`packages/core/src/**`): update
  [`documentation/sdk-reference.md`](../../documentation/sdk-reference.md) and
  [`packages/core/README.md`](../../packages/core/README.md) with new/renamed
  exports, signatures, and types.
- **Format / manifest / layout change** (`spec/**`, manifest schema, constants):
  update [`documentation/package-format.md`](../../documentation/package-format.md)
  and [`documentation/what-is-omd.md`](../../documentation/what-is-omd.md), and
  re-run `pnpm gen:examples` if fixtures are affected.
- **Validation rule/code change**: keep
  [`spec/OMD_VALIDATION_RULES.md`](../../spec/OMD_VALIDATION_RULES.md) and
  [`documentation/validation.md`](../../documentation/validation.md) aligned; the
  `ValidationCode` list in code is a stable API.
- **Scope / milestone change**: update
  [`documentation/roadmap.md`](../../documentation/roadmap.md),
  [`documentation/project-status.md`](../../documentation/project-status.md), and
  the README.
- **New terminology**: add it to
  [`documentation/glossary.md`](../../documentation/glossary.md).

## Rules

- The `spec/` folder is normative. If code and spec disagree, fix the code or the
  spec deliberately, and do not silently diverge.
- Documentation examples (CLI output, code snippets, manifest JSON) must reflect
  real current behavior. If you changed output, update the examples.
- Do not create brand-new doc files for a small change; edit the existing page
  that owns that topic.
- If a change is user-visible but you're unsure which page owns it, update the
  root `README.md` and the most specific `documentation/` page.
- **Never use the em dash character (`—`)** in docs, comments, or commit messages;
  use a colon, comma, parentheses, or reworded sentence. **Never put emojis in
  Markdown headers**, since they break the generated anchor slugs and break
  in-page links.

A change is not done until code, tests, README, and `documentation/` agree.
