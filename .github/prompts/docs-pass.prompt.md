---
mode: agent
description: Audit and repair OMD documentation. Finds drift between code and docs, checks links and style, and confirms the spec and docs agree.
---

# Documentation pass

Use this to keep the documentation trustworthy: no drift from the code, no broken
links, consistent style, and agreement between the spec and the docs.

Read [`../copilot-instructions.md`](../copilot-instructions.md) for the
change-to-docs mapping before you start.

## What to check

1. **Code-to-docs drift.** For each public surface, confirm the docs match
   reality:
   - CLI commands, options, and `--help` output vs
     [`documentation/cli-reference.md`](../../documentation/cli-reference.md) and
     the root `README.md` command table.
   - Core exports and signatures vs
     [`documentation/sdk-reference.md`](../../documentation/sdk-reference.md) and
     `packages/core/README.md`.
   - Any code examples in the docs actually run and produce the shown output.
2. **Spec-to-docs consistency.** The format described in `documentation/` matches
   `spec/`. Validation codes in `documentation/validation.md` match the
   `ValidationCode` values in `packages/core/src/validationTypes.ts` and
   `spec/OMD_VALIDATION_RULES.md`. The spec wins on any conflict.
3. **Links.** Internal relative links resolve. There are no references to removed
   paths (for example an old `docs/` folder).
4. **Style rules.** No em dash characters anywhere. No emojis in Markdown headers
   (they break anchor slugs). Headings and tables are consistent.
5. **README shape.** The root README stays short and developer-focused; deep
   vision lives in `documentation/what-is-omd.md` or the internal context file.

## How to work

- Prefer a fast text search for likely problems (em dash, `docs/`, stale command
  names) over reading every file.
- Fix issues directly. Group related edits.
- When a doc and the code disagree and you cannot tell which is right, ask rather
  than guessing.

## Verify

If you changed anything that examples depend on, run:

```bash
pnpm build
pnpm test
```

## Definition of done

- Docs match the current code and spec.
- Links resolve, style rules hold, and the README stays lean.
