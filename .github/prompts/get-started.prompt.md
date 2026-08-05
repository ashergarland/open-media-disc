---
mode: agent
description: One-command onboarding runbook. Set up and verify the OMD dev environment on a fresh machine or a fresh clone, then report project state and what is next. Safe to run in a fresh chat.
---

# Get started: OMD onboarding runbook

Use this the first time you open the repo on a machine, or in a fresh chat, and
want a working dev environment fast. It installs, builds, tests, and lints in one
pass, then tells you how to run the apps and where the project stands.

## Before you start

- Confirm you are at the repo root: the folder that contains `pnpm-workspace.yaml`
  and this `.github/`. A fresh clone lands in `open-media-disc/`.
- Skim [`../copilot-instructions.md`](../copilot-instructions.md) "Getting started"
  map so you know where things live.

## 1. Check prerequisites

- **Node.js 18 or newer:** `node --version`. If missing or older, install the
  current LTS from https://nodejs.org.
- **pnpm 8 or newer:** `pnpm --version`. If missing, install it (do not rely on
  `corepack` on Windows, it can fail on `C:\Program Files\nodejs`):

  ```bash
  npm install -g pnpm@8.15.0
  ```

## 2. One-command onboarding

From the repo root:

```bash
pnpm onboard
```

That runs `pnpm install`, then builds every package, runs the Vitest suite, and
lints, in order. Expect a green build, all tests passing, and no lint errors.

Prefer the steps separately:

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
```

## 3. Run the apps

- **CLI:** `pnpm omd --help` (build first). Try it end to end:

  ```bash
  pnpm omd create ./examples/source-album --out ./build/OMD-000001
  pnpm omd validate ./build/OMD-000001
  pnpm omd inspect ./build/OMD-000001
  ```

- **OMD Studio (desktop app):** run `pnpm build` first so `dist/` exists, then
  `pnpm studio` launches the Electron app.

## 4. Orient: where the project stands

Read these to load current context before starting any work:

- [`../../documentation/project-status.md`](../../documentation/project-status.md): where the project is.
- [`../../documentation/roadmap.md`](../../documentation/roadmap.md): milestones and what is next.
- [`../planning/STATUS.md`](../planning/STATUS.md): the **live tracker**. It names
  the current milestone, the next step prompt to run in a fresh chat, active
  blockers, and the decisions already made. Read this before starting any work.
- [`../planning/ROADMAP.md`](../planning/ROADMAP.md): the detailed plan and the
  objectives behind it.

## Report back

Summarize for the user:

- The Node and pnpm versions detected.
- Whether `pnpm onboard` finished green (build, test count, lint).
- Any prerequisite that needed installing, or any failure and how it was fixed.
- The one-line project state and the next recommended step (from the docs above).

## Troubleshooting

- `omd: command not found`: run `pnpm build` first; `pnpm omd` runs the compiled
  CLI from `packages/cli/dist`.
- `pnpm` not found: install it with `npm install -g pnpm@8.15.0`.
- Studio window is blank or will not load: run `pnpm build` (Studio loads from
  `packages/studio/dist`), then `pnpm studio`.
- Lint or test failures after pulling: re-run `pnpm install` (dependencies may
  have changed), then `pnpm build` and `pnpm test`.

## Guardrails

- Read-only setup and verification: do not change project code as part of
  onboarding.
- No em dash. No emojis in headers.
