# Contributing

Thanks for helping build Open Media Disc. This page covers the workflow and the
project's most important rule: **code and documentation change together.**

## Golden rule: keep docs in sync

> Every change that affects behavior, the format, the CLI, or the public API
> **must** update the relevant documentation in the same change.

Concretely, when you change one of these, update the matching docs:

| If you change… | Update… |
| --- | --- |
| The package format, manifest fields, or disc layout | [`spec/`](../spec) **and** [package-format.md](./package-format.md), [what-is-omd.md](./what-is-omd.md) |
| Validation rules or codes | [`spec/OMD_VALIDATION_RULES.md`](../spec/OMD_VALIDATION_RULES.md) **and** [validation.md](./validation.md) |
| A CLI command or option | [cli-reference.md](./cli-reference.md), [getting-started.md](./getting-started.md), and the root [README](../README.md) |
| The core public API (`packages/core/src`) | [sdk-reference.md](./sdk-reference.md) and [`packages/core/README.md`](../packages/core/README.md) |
| Milestones / scope | [roadmap.md](./roadmap.md) and the README |
| Terminology | [glossary.md](./glossary.md) |
| Anything user-facing | Root [README.md](../README.md) and this `documentation/` folder |

The repository ships AI instructions that enforce this — see
`.github/copilot-instructions.md` and
`.github/instructions/keep-docs-in-sync.instructions.md`.

## Spec-first

OMD is defined by written specs, the JSON Schema, and conformance fixtures —
**not** by "whatever a tool happens to output." Any change that affects
interoperability belongs in [`spec/`](../spec) first, then the implementation,
then the docs. When docs and spec disagree, the spec wins.

## Development workflow

```bash
pnpm install
pnpm build         # compile all packages
pnpm test          # run the Vitest suite
pnpm lint          # ESLint
pnpm format        # Prettier (or `pnpm format:check`)
pnpm gen:examples  # regenerate example fixtures if the format changed
```

Before opening a PR:

1. `pnpm build && pnpm test && pnpm lint` all pass.
2. Docs updated per the table above.
3. If the format changed, `spec/` and `pnpm gen:examples` are updated together.
4. Version bumps follow the policy below.

## Testing

- Add or update tests under `packages/*/tests` for any behavior change.
- Use the synthetic FLAC fixtures in
  [`packages/core/tests/helpers`](../packages/core/tests/helpers) — never commit
  copyrighted audio.
- Cover both success and failure paths (e.g. new validation codes need a failing
  fixture).

## Versioning

- **Format version** (`omdVersion`) changes only for deliberate on-disc changes
  (new required field, layout change, validation-semantics change) and must be
  reflected in `spec/` and docs.
- **Package versions** (library/CLI) follow semantic versioning and move
  independently; a tool release must never silently change the format.
- Incremental releases are patch bumps unless a minor/major is explicitly called
  for.

## Commit and PR guidance

- Keep changes focused; avoid unrelated refactors.
- Describe user-visible effects and link the docs you updated.
- Don't distribute or commit copyrighted music.
