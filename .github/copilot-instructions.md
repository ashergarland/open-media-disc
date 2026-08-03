# Copilot / AI Instructions: Open Media Disc (OMD)

You are working in the **Open Media Disc (OMD)** repository (`open-media-disc`),
a **pnpm + TypeScript monorepo**. OMD is an open-source physical music format:
turn an album of audio files into a verified, self-describing package, burn it to
a writable disc, and play it back. The repo holds the SDK, the `omd` CLI, shared
UI and label tools, and **OMD Studio** (an Electron desktop and Raspberry Pi
touch app). The format contract is at `omdVersion` 0.1.0; the software is at v0.2
("Write and Play": create, validate, burn, verify, play). Active work is on OMD
Studio and its touch-first UI redesign.

Use the name **Open Media Disc** and **OMD** consistently. Older source documents
may say "Optical Album Cartridge / OAC"; that is historical context only, so use
OMD in new code, docs, and comments.

## Getting started (fresh machine or picking the project back up)

If you are asked "how do I get started?", or you need to find where something
lives, use this map. These files are the source of truth; prefer them over
guessing.

- **One-command onboarding:** run the [`/get-started`](./prompts/get-started.prompt.md)
  runbook prompt in a fresh chat, or run `pnpm onboard` (install + build + test +
  lint) from the repo root.
- **Set up and run the dev environment:**
  [`documentation/installation.md`](../documentation/installation.md) covers
  prerequisites (Node 18+, pnpm 8+), `pnpm install` / `build` / `test`, running
  the `omd` CLI, and launching OMD Studio.
- **Learn the CLI and SDK:**
  [`documentation/getting-started.md`](../documentation/getting-started.md),
  [`documentation/cli-reference.md`](../documentation/cli-reference.md),
  [`documentation/sdk-reference.md`](../documentation/sdk-reference.md).
- **All user/developer docs (index):**
  [`documentation/README.md`](../documentation/README.md).
- **What and why (vision, scope):** root [`README.md`](../README.md) and
  [`.github/context/product-context.md`](./context/product-context.md).
- **Where the project is and what's next:**
  [`documentation/project-status.md`](../documentation/project-status.md) and
  [`documentation/roadmap.md`](../documentation/roadmap.md).
- **In-progress OMD Studio UI redesign:**
  [`.github/prompts/redesign-status.md`](./prompts/redesign-status.md) is the
  live tracker; run the `redesign-01..10` prompts one per fresh chat.
- **Normative format contract:** [`spec/`](../spec) (the spec wins over docs).
- **Reusable workflow prompts:**
  [`.github/prompts/README.md`](./prompts/README.md) (next-steps, add-feature,
  spec-change, docs-pass, release-checkpoint, promote-sources).
- **Design references:** [`design/`](../design) (UI mockups, theme showcases,
  OAC-era specs; read-only history).
- **Per-package details:** each package has a README under `packages/*`.

Common commands, run from the repo root:

```bash
pnpm install     # install workspace deps (Node 18+, pnpm 8+)
pnpm build       # build every package
pnpm test        # Vitest suite
pnpm lint        # eslint
pnpm omd --help  # the omd CLI (after build)
pnpm studio      # launch OMD Studio (Electron)
```

For the project's vision, mental model, scope boundaries, and design philosophy,
read [`.github/context/product-context.md`](./context/product-context.md). Keep
the README short and developer-focused; deep background belongs in that context
file or in `documentation/`.

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
| Supported audio codecs | `spec/OMD_FORMAT_SPEC.md`, `spec/OMD_MANIFEST_SCHEMA.json`, `documentation/package-format.md`, `documentation/validation.md` |
| Validation rules or codes | `spec/OMD_VALIDATION_RULES.md`, `documentation/validation.md` |
| A CLI command or option (`packages/cli`) | `documentation/cli-reference.md`, `documentation/getting-started.md`, root `README.md`, and the CLI `HELP` text in `packages/cli/src/bin/omd.ts` |
| Core public API (`packages/core/src`) | `documentation/sdk-reference.md`, `packages/core/README.md` |
| Label tools (`packages/label`) | `packages/label/README.md` (and `documentation/` if user-facing) |
| Shared UI (`packages/ui`) | `packages/ui/README.md` |
| OMD Studio (`packages/studio`) | `documentation/omd-studio.md`, `packages/studio/README.md` |
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
  design/          Design references: UI mockups, theme showcases, OAC-era specs
  examples/        Synthetic FLAC fixtures + sample packages
  scripts/         make-examples.mts (pnpm gen:examples)
  build/           Local build output / generated packages (gitignored)
  .github/
    copilot-instructions.md   this file
    context/                  agent-facing background (product-context.md)
    prompts/                  reusable workflow prompts + the redesign series
    instructions/             scoped auto-instructions (keep-docs-in-sync)
  packages/core/    @open-media-disc/core: the SDK (format, validate, burn, rip, play helpers)
  packages/cli/     @open-media-disc/cli: the `omd` CLI
  packages/label/   @open-media-disc/label: printable label sheets
  packages/ui/      @open-media-disc/ui: shared theme engine + player model
  packages/studio/  @open-media-disc/studio: Electron desktop + Pi touch app
```

The `design/` folder holds historical read-only reference (OAC-era specs, UI
mockups, and theme showcases). Company-level or business material is never in
this repo; it lives in a separate internal location (see the public/internal
split rules in the workflow prompts).

## Conventions

- **Stack:** Node.js >= 18, TypeScript, pnpm workspaces, Vitest, Zod. ESM modules
  (`import`), `.js` extensions in relative imports. OMD Studio adds Electron +
  esbuild; its UI rules (strict CSP, `--omd-*` design tokens, no inline styles)
  are documented in `documentation/omd-studio.md`.
- **Spec-first:** anything affecting interoperability goes in `spec/` first, then
  the implementation, then the docs.
- **Determinism:** package output must be deterministic; keep the manifest stable
  and human-readable.
- **Validation codes are a stable API:** don't rename `ValidationCode` values
  without updating `spec/OMD_VALIDATION_RULES.md` and `documentation/validation.md`.
- **One codec per package, described honestly:** a package holds a single codec
  (FLAC, MP3, AAC, Vorbis, Opus, or WAV). "Lossless" describes the container, not
  the audio's history, so a FLAC transcoded from an MP3 is not lossless. In UI and
  prose, show the real codec plus factual facts: sample rate always, bit depth only
  for a lossless codec, bitrate only for a lossy one. Never write "FLAC lossless"
  or claim a fixed bit depth. The format id `OMD-FLAC-DATA` is a legacy string and
  does not mean a package must be FLAC. See
  [`documentation/omd-studio.md`](../documentation/omd-studio.md#honest-codec-language).
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
