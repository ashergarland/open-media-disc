---
mode: agent
description: Change the OMD format safely and spec-first. Keeps the spec, JSON Schema, validation codes, examples, and public docs in sync, and versions the format deliberately.
---

# Spec change

Use this when a change touches the **format**: the package layout, the manifest,
disc rules, or validation. The format is the contract every future tool depends
on, so change it deliberately and keep every dependent artifact in sync.

Read [`../copilot-instructions.md`](../copilot-instructions.md) and the current
[`spec/`](../../spec) files before editing anything.

## The order of operations (spec first)

1. **Spec.** Edit the normative files first:
   - `spec/OMD_FORMAT_SPEC.md`
   - `spec/OMD_DISC_LAYOUT.md`
   - `spec/OMD_VALIDATION_RULES.md`
   - `spec/OMD_MANIFEST_SCHEMA.json`
   State clearly what changed and why. The spec wins over any tool's behavior.
2. **Format version.** Decide whether `omdVersion` must change. A format change
   that affects interoperability is a deliberate version bump reflected in the
   spec and the constant in `packages/core/src/constants.ts`. Never let a tool
   release silently change the disc format.
3. **Implementation.** Update the core library to match the spec:
   - `constants.ts`, `manifest.ts` (Zod schema + types), `package.ts`,
     `validationTypes.ts`, and any affected helpers.
   - Treat `ValidationCode` values as a **stable API**. Add codes rather than
     renaming; if a rename is unavoidable, update the spec, `validation.md`, and
     every reference in the same change.
4. **Docs.** Update the public docs that describe the format:
   - `documentation/package-format.md`, `documentation/validation.md`,
     `documentation/what-is-omd.md`, and any CLI or SDK pages affected.
5. **Examples and fixtures.** Regenerate and reverify:
   - Run `pnpm gen:examples` to rebuild `examples/`.
   - Remember the fixtures are synthetic, metadata-only FLAC files (no real
     audio, never copyrighted). The invalid example must be re-checksummed before
     it is corrupted, or the corruption will not be what the test expects.
6. **Tests.** Update or add Vitest coverage, including the JSON Schema conformance
   test (ajv) so the schema and the manifest stay aligned.

## Verify

Run and keep green:

```bash
pnpm build
pnpm test
pnpm lint
```

Then confirm an end-to-end round trip still works:

```bash
pnpm omd create ./examples/source-album --out ./build/OMD-check
pnpm omd validate ./build/OMD-check
pnpm omd inspect ./build/OMD-check
```

## Definition of done

- Spec, schema, code, docs, examples, and tests all agree.
- Build, tests, and lint are green.
- If `omdVersion` changed, it is updated in the spec and `constants.ts`, and the
  change is called out for the release checkpoint.

## Guardrails

- Recoverability is non-negotiable: packages stay plain, browsable files.
- Deterministic output: the same input yields the same package.
- No em dash. No emojis in Markdown headers.
