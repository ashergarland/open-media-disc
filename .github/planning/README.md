# OMD planning

Agent-facing planning for Open Media Disc. This folder is the **control plane**
for prompt-driven development: what we are building, in what order, where we
are, and what we have decided.

It is deliberately separate from [`../../documentation/`](../../documentation/README.md),
which is user-facing and describes what **exists**. This folder describes what is
**planned**. When a milestone lands, the truth moves from here into
`documentation/` and `spec/`.

## The files

| File | What it is | Who writes it |
| --- | --- | --- |
| [`strategy.md`](./strategy.md) | The strategic north star: users, unmet need, adoption ladder, product scope, and relationship between the open format and future hardware. | Humans; changed only when the product strategy changes. |
| [`format-direction.md`](./format-direction.md) | Settled and open design decisions for the next format revision. It is planning, not the current normative contract. | Humans during format planning; later consumed by a spec milestone. |
| [`ROADMAP.md`](./ROADMAP.md) | The comprehensive plan: objectives, milestone ladder, per-milestone scope and exit criteria. | Humans and `/milestone-plan`; changed deliberately. |
| [`STATUS.md`](./STATUS.md) | The live tracker: current milestone, step-by-step progress, completed milestones, blockers, decisions. | Every milestone prompt, at the end of every step. |
| [`ideas/`](./ideas/README.md) | The brainstorm catalog: every idea considered, with an ID, value, effort, and dependencies. | `/brainstorm`, and any prompt that discovers new work. |
| [`hardware-milestones.md`](./hardware-milestones.md) | The parked hardware program, preserved in full. | Only when hardware is picked back up. |
| [`milestone-prompt-template.md`](./milestone-prompt-template.md) | The required shape of every milestone step prompt. | Rarely; it is the contract. |

## The loop

Prompt-driven development here is a closed loop. Each turn of the loop is one
step prompt, run in a **fresh chat**, that leaves the repo and this folder in a
state the next chat can pick up cold.

```text
ideas/  ->  ROADMAP.md  ->  prompt chain  ->  STATUS.md  ->  documentation/
  ^                                              |
  |______________ new ideas discovered __________|
```

1. **Capture.** Ideas land in [`ideas/`](./ideas/README.md) with a stable ID.
   Nothing is scheduled just by being written down.
2. **Select.** The user picks ideas and they are grouped into a milestone in
   [`ROADMAP.md`](./ROADMAP.md) with a goal, scope, non-goals, and exit criteria.
3. **Plan.** `/milestone-plan` turns one roadmap milestone into an ordered chain
   of step prompts under `.github/prompts/<milestone-id>/`, each following
   [`milestone-prompt-template.md`](./milestone-prompt-template.md).
4. **Execute.** One step per fresh chat. Each step reads `STATUS.md` first and
   updates it last. This is not optional: if `STATUS.md` is not updated, the next
   chat starts blind.
5. **Close.** `/milestone-close` verifies green, cuts a version, moves the chain
   into `../prompts/archive/`, marks the milestone done in `ROADMAP.md` and
   `STATUS.md`, and promotes the next milestone.

## Rules that keep the loop honest

- **`STATUS.md` is written last, every time.** A step is not finished until the
  status file reflects it.
- **The roadmap is not a wish list.** Anything not committed to lives in
  `ideas/`. If it is in `ROADMAP.md`, we intend to build it.
- **Docs move with code.** The definition of done in
  [`../copilot-instructions.md`](../copilot-instructions.md) applies to every
  step: build, test, lint, spec, and `documentation/` updated in the same change.
- **Decisions are recorded, not remembered.** Any choice a future chat could get
  wrong goes in the decision log in `STATUS.md`.
- **New work found mid-milestone goes to `ideas/`,** not into the current
  milestone. Scope creep is the main failure mode of this system.
