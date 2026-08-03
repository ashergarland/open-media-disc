# AGENTS.md: Open Media Disc (OMD)

Guidance for AI agents working in this repository. VS Code Copilot also reads
[`.github/copilot-instructions.md`](./.github/copilot-instructions.md) and the
scoped rules in [`.github/instructions/`](./.github/instructions); this file is
the tool-agnostic summary.

## What this project is

**Open Media Disc (OMD)** is an open-source physical music format. The format
contract is at `omdVersion` 0.1.0; the software is at v0.2 ("Write and Play":
create, validate, burn, verify, play from the `omd` CLI). The milestone in
progress is **OMD Studio**, an Electron desktop and Raspberry Pi touch app.
Use the names **Open Media Disc** / **OMD** (older docs' "OAC" is historical
only).

For the vision, mental model, scope, and design philosophy, read
[`.github/context/product-context.md`](./.github/context/product-context.md).

## The rule that matters most

**Keep the README and `documentation/` in sync with every change.** Any change to
behavior, the format, the CLI, or the public API MUST update the matching docs in
the same change. `spec/` is normative; when docs and spec disagree, the spec wins.

See the mapping table in
[`.github/copilot-instructions.md`](./.github/copilot-instructions.md) for exactly
which docs to update for each kind of change, and
[`documentation/contributing.md`](./documentation/contributing.md) for the
contributor workflow.

## Writing style

- Never use the em dash character (`—`); use a colon, comma, parentheses, or a
  reworded sentence.
- Never put emojis in Markdown headers; they break anchor slugs and in-page links.
- A package holds **one codec** (FLAC, MP3, AAC, Vorbis, Opus, or WAV), and
  "lossless" describes the container, not the audio's history. Show the real codec
  plus factual facts (sample rate always, bit depth only when lossless, bitrate
  only when lossy). Never write "FLAC lossless" or claim a fixed bit depth.

## Definition of done

1. `pnpm build` compiles.
2. `pnpm test` passes.
3. `pnpm lint` is clean.
4. Format changes update `spec/` and re-run `pnpm gen:examples`.
5. **README + `documentation/` updated to match.**
