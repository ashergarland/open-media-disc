# Copilot / AI Instructions: Open Media Disc (OMD)

You are working in the **Open Media Disc (OMD)** repository (`open-media-disc`).
OMD is an open-source physical music format. This milestone is **OMD Core v0.1**:
turn an album folder of FLAC files into a verified OMD package, then validate,
inspect, and (stub) play it. **No optical burning, no hardware, no GUI.**

Use the name **Open Media Disc** and **OMD** consistently. Older source documents
may say "Optical Album Cartridge / OAC"; that is historical context only, so use
OMD in new code, docs, and comments.

For the project's vision, mental model, scope boundaries, and design philosophy,
read [`.github/context/product-context.md`](./context/product-context.md). That is
the agent-facing "why" behind OMD. Keep the README short and developer-focused;
deep background belongs in that context file or in `documentation/`.

## Writing style rules

- **Never use the em dash character (`—`).** Use a colon, comma, parentheses, or a
  rewritten sentence instead. This applies to all Markdown, code comments, and
  commit messages.
- **Never put emojis in Markdown headers.** Emojis in headings break the generated
  anchor slugs, so in-page links (`#some-header`) stop resolving. Emojis elsewhere
  in prose are fine but avoid them by default.

## Most important rule: keep the README and documentation in sync

**Any change that affects behavior, the format, the CLI, or the public API MUST
update the matching documentation in the same change.** Never land a code change
that makes the docs wrong. If you are unsure whether a change is user-facing,
assume it is and update the docs.

Documentation lives in two places:

- **[`documentation/`](../documentation/README.md)**: the friendly, public
  landing for users and developers.
- **[`spec/`](../spec)**: the normative format contract. When docs and spec
  disagree, **the spec wins**.

When you change one of these, update the matching docs **before finishing**:

| If you change… | Also update… |
| --- | --- |
| Package format, manifest fields, disc layout | `spec/OMD_FORMAT_SPEC.md`, `spec/OMD_DISC_LAYOUT.md`, `spec/OMD_MANIFEST_SCHEMA.json`, `documentation/package-format.md`, `documentation/what-is-omd.md` |
| Validation rules or codes | `spec/OMD_VALIDATION_RULES.md`, `documentation/validation.md` |
| A CLI command or option (`packages/cli`) | `documentation/cli-reference.md`, `documentation/getting-started.md`, root `README.md`, and the CLI `HELP` text in `packages/cli/src/bin/omd.ts` |
| Core public API (`packages/core/src`) | `documentation/sdk-reference.md`, `packages/core/README.md` |
| Milestones / scope | `documentation/roadmap.md`, `documentation/project-status.md`, root `README.md` |
| Terminology | `documentation/glossary.md` |
| Anything else user-facing | root `README.md` and `documentation/` |

There is also a scoped reminder in
`.github/instructions/keep-docs-in-sync.instructions.md` that fires when you edit
source, spec, or CLI files.

## Project layout

```text
open-media-disc/
  spec/            Normative format contract (Markdown + JSON Schema)
  documentation/   Public user/developer docs (landing = documentation/README.md)
  .github/context/ Agent-facing background (product-context.md)
  packages/core/   @open-media-disc/core: SDK
  packages/cli/    @open-media-disc/cli: the `omd` CLI
  examples/        Synthetic FLAC fixtures + sample packages
  scripts/         make-examples.mts (pnpm gen:examples)
```

Note: code repos live in their own folders under
`C:\Users\asher\Projects\ashergarland\OpenMediaDisc`. The design source
documents live in this repo's `design/` folder and are historical read-only
reference (OAC-era specs, UI mockups, and theme showcases).

## Conventions

- **Stack:** Node.js >= 18, TypeScript, pnpm workspaces, Vitest, Zod. ESM modules
  (`import`), `.js` extensions in relative imports.
- **Spec-first:** anything affecting interoperability goes in `spec/` first, then
  the implementation, then the docs.
- **Determinism:** package output must be deterministic; keep the manifest stable
  and human-readable.
- **Validation codes are a stable API:** don't rename `ValidationCode` values
  without updating `spec/OMD_VALIDATION_RULES.md` and `documentation/validation.md`.
- **Fixtures:** use the synthetic, metadata-only FLAC fixtures in
  `packages/core/tests/helpers`. Never commit copyrighted audio.
- **Versioning:** format version (`omdVersion`) and package versions move
  independently. Incremental releases are patch bumps unless told otherwise; a
  format change is a deliberate `omdVersion` bump reflected in `spec/` and docs.

## Definition of done for a change

1. `pnpm build` compiles.
2. `pnpm test` passes (add/adjust tests for behavior changes).
3. `pnpm lint` is clean.
4. If the format changed: `spec/` updated and `pnpm gen:examples` re-run.
5. **README + `documentation/` updated to match the change.**
