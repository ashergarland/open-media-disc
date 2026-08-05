# Milestone prompt template

Every milestone step prompt in this repository follows this shape. It exists so
that a **fresh chat with no memory** can pick up any step, do it correctly, and
hand off cleanly. `/milestone-plan` generates prompts from this template; do not
invent a different structure.

A step prompt is a contract with the next chat. If a fresh agent cannot execute
the step from the prompt plus [`STATUS.md`](./STATUS.md) alone, the prompt is
wrong.

## Sizing a step

- One step is **one focused chat**: roughly one to three commits.
- A step must end at a **green, committable, coherent** point. Never split a
  change so that step N leaves the build red for step N+1.
- Prefer more, smaller steps. A step that needs "and also" three times is two
  steps.
- Every chain ends with a **docs step** and a **release step**, in that order.

## Required sections

Copy this skeleton. Keep the headings exactly; the wording under them is yours.

````markdown
---
mode: agent
description: <Milestone name> step NN of MM. <One sentence on what this step does.> Run in a fresh chat; read the status file first.
---

# <milestone-id> NN: <step title>

Step NN of MM in the **<Milestone name>** chain. Steps run in order, one per
fresh chat, sharing state through the status file.

## Read first

1. [`../../planning/STATUS.md`](../../planning/STATUS.md) end to end. Confirm
   this step is the one marked next; if not, run that one instead.
2. [`../../copilot-instructions.md`](../../copilot-instructions.md): the house
   rules and the docs-in-sync table.
3. <The specific spec, doc, and source files this step touches. Link them.>
4. Confirm the working tree is clean and the baseline is green.

## Context snapshot

<Everything a cold agent needs that is not obvious from the code: what the
previous step left behind, which files matter, decisions already locked, and
known traps. Refreshed by the previous step at hand-off. The status file is
authoritative; this is the convenience copy.>

## Goal

<One paragraph. What is true when this step is done that is not true now.
Written so it can be checked, not admired.>

## Work items

1. <Concrete, ordered, verifiable. Name the files.>
2. <...>

## Doc update requirements

<Explicit list, not "update the docs". Pull the exact rows from the mapping table
in `.github/copilot-instructions.md` that this step triggers. If the step touches
the format, spec files come first and `pnpm gen:examples` is re-run.>

| Change in this step | Doc that must be updated |
| --- | --- |
| <...> | <...> |

## Verify

- `pnpm build`, `pnpm test`, `pnpm lint` green.
- <Step-specific checks: new tests, a CLI invocation, a screenshot capture.>
- <State plainly anything only the **user** can verify. Never claim UI or
  hardware behavior is verified without user confirmation.>

## Handoff

1. Commit with a message like `<type>(<scope>): <summary>`.
2. Update [`../../planning/STATUS.md`](../../planning/STATUS.md):
   - Mark step NN done with its short sha; set step NN+1 as next.
   - Refresh Repository state (last commit, versions, gate results).
   - Add or resolve blockers; append any decision made.
   - Update the "Last updated" date.
3. Refresh the **Context snapshot** in the next step's prompt
   (`<milestone-id>-NN+1-*.prompt.md`) with the post-work state.
4. Park anything discovered but out of scope in
   [`../../planning/ideas/README.md`](../../planning/ideas/README.md). Do not
   absorb it into this milestone.

## Guardrails

- <Milestone-specific constraints: format frozen, behavior parity, no new deps.>
- Docs move with code, in the same commit.
- No em dash in prose. No emojis in Markdown headers.
- Never push, tag, or take a destructive action without asking.
````

## Why each section exists

| Section | Failure it prevents |
| --- | --- |
| **Read first** | The agent working from stale assumptions, or running the wrong step. |
| **Context snapshot** | Context loss between chats, which is the single biggest cost in this workflow. |
| **Goal** | Steps that end when the agent gets tired rather than when the work is done. |
| **Work items** | Vague scope, and steps that silently grow. |
| **Doc update requirements** | The most common regression in this repo: shipped code with wrong docs. |
| **Verify** | False claims of success, especially for UI and hardware. |
| **Handoff** | A dead chain: the next chat starts blind because nobody updated the status. |
| **Guardrails** | Format drift, accidental pushes, and house-style violations. |

## Naming

- Chain folder: `.github/prompts/<milestone-id>/`
- Step file: `<milestone-id>-NN-<short-slug>.prompt.md`, zero-padded, starting at
  `01`.
- Chain index: `.github/prompts/<milestone-id>/README.md`, listing every step,
  what it delivers, and which is next.

On completion the whole folder moves to `.github/prompts/archive/<milestone-id>/`
with its README updated to past tense.
