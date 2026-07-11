---
mode: agent
description: Plan and design a single OMD deliverable stage. Interviews for scope, defines non-goals and exit criteria, updates the roadmap, and produces a concrete task list ready to implement.
---

# Stage kickoff

Plan and design **one** deliverable stage of Open Media Disc so it ends at a
clean, demoable, committable point. Do not start implementing in this prompt:
produce the plan, then hand off to implementation prompts.

Read [`../context/product-context.md`](../context/product-context.md),
[`../copilot-instructions.md`](../copilot-instructions.md), and
[`documentation/roadmap.md`](../../documentation/roadmap.md) first.

## Step 1: pick the stage

Confirm with the maintainer which milestone is the target (from the roadmap
ladder). If it is unclear, ask. One stage at a time.

## Step 2: interview for scope

Ask a focused round of questions and confirm answers before designing:

- What is the single user-visible outcome of this stage?
- What is explicitly out of scope for it?
- Does it touch the format or spec? (If yes, it is spec-first: use the
  `spec-change` prompt for that part.)
- What does "demoable" look like for this stage?
- Any new dependencies, packages, or tooling required?

## Step 3: write the design brief

Produce a short design brief and record the durable parts in the repo:

- **Goal** in one sentence.
- **Scope and non-goals.**
- **Format or spec impact** (link the spec files that change, if any).
- **Public API or CLI surface** the stage adds or changes.
- **Risks and open questions.**
- **Exit criteria:** the checklist that makes the stage done and demoable.

Update [`documentation/roadmap.md`](../../documentation/roadmap.md) so the stage,
its goal, and its status are visible. Keep dates out; ship when ready.

## Step 4: produce the task list

Break the stage into small, verifiable tasks and write them to a visible todo
list. Order them so each task keeps `pnpm build`, `pnpm test`, and `pnpm lint`
green. Include documentation tasks alongside their code tasks, never after the
fact.

## Step 5: define the checkpoint

State how this stage maps to a version checkpoint (see the `release-checkpoint`
prompt). Incremental progress is a patch bump; a milestone is a minor bump only
when the maintainer says so; never a major bump without instruction.

## Guardrails

- Ask before assuming scope. One wrong assumption wastes the stage.
- Keep the README short; put deep design in `documentation/` or the internal
  context material.
- No em dash. No emojis in Markdown headers.
