# OMD prompt library

Reusable workflow prompts that capture how this project is planned, built, and
released. Run one with `/<name>` in chat (for example `/milestone-plan`). Every
prompt honors the house rules in
[`../copilot-instructions.md`](../copilot-instructions.md) and the background in
[`../context/product-context.md`](../context/product-context.md): spec-first,
docs-in-sync, no em dash, no emojis in Markdown headers, and careful versioning.

Planning state lives next door in [`../planning/`](../planning/README.md).
Prompts execute; planning files remember.

## The orchestration loop

Work happens as **milestones**, each delivered by an ordered **chain** of step
prompts run one per fresh chat. State passes between chats through
[`../planning/STATUS.md`](../planning/STATUS.md), which every step reads first
and writes last.

```text
/brainstorm      ->  planning/ideas/       capture, never commit
   (user selects)
                 ->  planning/ROADMAP.md   the milestone, with exit criteria
/milestone-plan  ->  prompts/<id>/         an ordered chain of step prompts
   (one step per fresh chat)
                 ->  planning/STATUS.md    updated at the end of every step
/milestone-close ->  prompts/archive/<id>/ verified, versioned, archived
```

To pick up work cold, read [`../planning/STATUS.md`](../planning/STATUS.md) and
run the step it says is next.

## Orchestration prompts

| Prompt | Use it to |
| --- | --- |
| [brainstorm](./brainstorm.prompt.md) | Generate or triage ideas in the planning catalog. Ideas are not commitments. |
| [milestone-plan](./milestone-plan.prompt.md) | Turn one roadmap milestone into an ordered chain of step prompts. Run once per milestone. |
| [milestone-close](./milestone-close.prompt.md) | Verify the exit criteria, cut a version, archive the chain, promote the next milestone. |

## Working prompts

| Prompt | Use it to |
| --- | --- |
| [get-started](./get-started.prompt.md) | Onboard on a fresh machine or fresh chat: install, build, test, and lint, then report project state and the next step. |
| [next-steps](./next-steps.prompt.md) | Top-level strategic planning: direction, goals, and which milestone comes next. Feeds the roadmap. |
| [stage-kickoff](./stage-kickoff.prompt.md) | Plan and design one deliverable stage: scope, non-goals, exit criteria, and a task list. |
| [spec-change](./spec-change.prompt.md) | Change the format safely, spec-first, with schema, fixtures, and docs kept in sync. |
| [add-feature](./add-feature.prompt.md) | Add a CLI command or a core SDK API with matching tests and docs. |
| [release-checkpoint](./release-checkpoint.prompt.md) | Verify green, bump the version, and propose a commit and tag at a demoable point. |
| [docs-pass](./docs-pass.prompt.md) | Audit and repair documentation: drift, links, style, and spec-to-docs consistency. |
| [promote-sources](./promote-sources.prompt.md) | Turn raw internal or source material into official public docs, respecting the public and internal split. |

## Active milestone chains

None. The project is between milestones, in an ecosystem planning phase. See
[`../planning/ideas/README.md`](../planning/ideas/README.md) for the candidate
work and [`../planning/ROADMAP.md`](../planning/ROADMAP.md) for what has been
committed to.

## Parked

[`hardware/`](./hardware/README.md) holds work that needs physical hardware: a
real disc, a writer dock, a Pi panel, or a cartridge shell. It is deliberately
not scheduled. The preserved plan is in
[`../planning/hardware-milestones.md`](../planning/hardware-milestones.md).

## Archived chains

Completed chains are kept, never deleted. Their gotchas usually outlive the work.

| Chain | Delivered |
| --- | --- |
| [studio-redesign](./archive/studio-redesign/README.md) | The OMD Studio touch-first redesign: token contract, hub-and-spoke navigation, themes, Pi tuning. Shipped as `studio-v0.2.0`. |

## Writing a new step prompt

Follow [`../planning/milestone-prompt-template.md`](../planning/milestone-prompt-template.md).
Every step prompt needs Read first, Context snapshot, Goal, Work items, Doc
update requirements, Verify, Handoff, and Guardrails. A step prompt that a cold
agent cannot execute from itself plus `STATUS.md` is not finished.
