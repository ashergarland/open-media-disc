---
mode: agent
description: Add a CLI command or a core SDK API to OMD consistently, with matching tests and documentation, following the established patterns and exit-code conventions.
---

# Add a feature (CLI command or core API)

Use this to add a `omd` CLI command or a `@open-album-cartridge/core` API without
drifting from the existing patterns. If the feature touches the format, do the
format part with the `spec-change` prompt first.

Read [`../copilot-instructions.md`](../copilot-instructions.md) and skim the
existing code in `packages/core/src` and `packages/cli/src` before writing.

## If it is a core SDK API

1. Implement in the right module under `packages/core/src` (for example
   `manifest.ts`, `checksums.ts`, `package.ts`, `discSize.ts`). Reuse existing
   types and constants; keep functions pure and deterministic where possible.
2. Export it from the package entry point.
3. Add Vitest tests under `packages/core/tests`, using the synthetic FLAC
   fixtures in the test helpers (never real audio).
4. Update docs: [`documentation/sdk-reference.md`](../../documentation/sdk-reference.md)
   and [`packages/core/README.md`](../../packages/core/README.md).

## If it is a CLI command

1. Add a command module under `packages/cli/src/commands` and wire it into
   `packages/cli/src/bin/omd.ts`. Parse arguments with the shared `args.ts`
   helpers.
2. Follow the exit-code convention: `0` success, `1` failure, `2` usage error.
3. Update the `HELP` text in `omd.ts` so `--help` matches the real behavior.
4. Prefer building on the core SDK rather than duplicating logic in the CLI.
5. Add tests for the command's behavior.
6. Update docs: [`documentation/cli-reference.md`](../../documentation/cli-reference.md),
   [`documentation/getting-started.md`](../../documentation/getting-started.md) if
   it changes the basic flow, the root `README.md` command table, and
   [`packages/cli/README.md`](../../packages/cli/README.md).

## Build and run notes

- Build first; the CLI runs from compiled output. The root `omd` script runs
  `node packages/cli/dist/bin/omd.js`, so `pnpm build` must run before `pnpm omd`.
- This repo uses pnpm workspaces. If pnpm is missing, install it globally with
  `npm i -g pnpm` (corepack may be blocked on some machines).

## Verify

```bash
pnpm build
pnpm test
pnpm lint
```

Exercise the new surface directly (CLI command or a small script) and confirm the
output matches what the docs now claim.

## Definition of done

- Code, tests, and docs land in the same change and agree with each other.
- Build, tests, and lint are green.
- Documentation examples reflect the real current output.

## Guardrails

- Do not restate behavior in two places that can drift; the SDK is the source of
  truth and the CLI wraps it.
- No em dash. No emojis in Markdown headers.
