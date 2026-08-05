---
mode: agent
description: Turn one milestone from the planning roadmap into an ordered chain of step prompts that fresh chats can execute one at a time. Run this once per milestone, before any implementation.
---

# Milestone plan: generate a prompt chain

You are the planning lead for **Open Media Disc**. This prompt converts **one**
milestone from the roadmap into an executable chain of step prompts. You are not
implementing anything here. You are producing the prompts that will.

## Read first

1. [`../planning/STATUS.md`](../planning/STATUS.md): where the project actually
   is, what is blocked, and what has been decided.
2. [`../planning/ROADMAP.md`](../planning/ROADMAP.md): the milestone you are
   planning, including its scope, non-goals, and exit criteria.
3. [`../planning/milestone-prompt-template.md`](../planning/milestone-prompt-template.md):
   the required shape of every step prompt. Follow it exactly.
4. [`../copilot-instructions.md`](../copilot-instructions.md): house rules and
   the docs-in-sync mapping table.
5. The current state of the code the milestone touches. Do not plan against
   assumptions; read the files.

## Preconditions

- The milestone exists in `ROADMAP.md` under **Planned milestones** with all
  required fields (ID, goal, objectives served, ideas included, in scope,
  non-goals, exit criteria, format impact, depends on). If any field is missing,
  ask the user to fill it rather than inventing it.
- Its dependencies are delivered, or the user has explicitly waived them.
- The working tree is clean and the gates are green. If not, say so and stop.

## Goal

Produce `.github/prompts/<milestone-id>/` containing a README index and an
ordered set of step prompts, such that a fresh chat can run step 01, then step
02, and so on, and arrive at the milestone's exit criteria with the docs in sync
and the gates green at every step boundary.

## Work items

1. **Confirm the milestone.** State which milestone you are planning, its goal,
   and its exit criteria in your own words. If more than one is unstarted, ask
   the user which one. Do not plan two milestones at once.

2. **Survey the ground truth.** Read the packages, specs, and docs the milestone
   touches. Write a short findings summary: what already exists that the
   milestone can reuse, what is missing, and what will be harder than the
   roadmap implies. Surface any conflict with the roadmap **now**, not mid-chain.

3. **Decide the step breakdown.** Split the milestone into steps that each end
   green and committable. Apply the sizing rules in the template. Standard shape:
   - Spec or contract changes first, if the format is affected.
   - Core SDK before anything that consumes it.
   - CLI and app surfaces after the core they call.
   - Tests alongside the code they cover, never as a trailing step.
   - A dedicated docs step near the end.
   - A release step last.

   Present the proposed breakdown to the user as a numbered list with one line
   each, and get agreement before writing files. This is the cheapest place to
   fix a bad plan.

4. **Write the chain.** For each step, create
   `.github/prompts/<milestone-id>/<milestone-id>-NN-<slug>.prompt.md` from the
   template, with every required section filled in concretely:
   - **Read first** links the actual files that step needs.
   - **Context snapshot** for step 01 is the real current state; for later steps
     it is the expected state, marked as expected so the executing agent knows to
     trust `STATUS.md` over it.
   - **Work items** name real files and real functions.
   - **Doc update requirements** is a table derived from the mapping table in
     `../copilot-instructions.md`, not a generic reminder.
   - **Verify** distinguishes what the agent can check from what only the user
     can confirm.
   - **Handoff** points at the next step by filename.

5. **Write the chain README** at `.github/prompts/<milestone-id>/README.md`: the
   milestone goal, the ordered step table with what each delivers, how to run the
   chain (one step per fresh chat), and a pointer to `STATUS.md`.

6. **Wire it into the planning files.**
   - `ROADMAP.md`: mark the milestone as in progress and link the chain.
   - `STATUS.md`: set Current milestone to this one, with the chain link, step
     01 as next, and the step table seeded with every step marked pending.
   - `.github/prompts/README.md`: add the chain to the active chains section.

7. **Sanity-check the chain.** Read it back as if you were a cold agent:
   - Can step 01 be executed with no other context? If not, fix the snapshot.
   - Does every step end green?
   - Does the union of the steps actually satisfy every exit criterion? Map each
     exit criterion to the step that satisfies it and show the user that mapping.
   - Is anything in the milestone's non-goals accidentally in a step?

## Doc update requirements

This prompt writes planning files, not user documentation. It must update:

| Change | File |
| --- | --- |
| Milestone moves to in progress | [`../planning/ROADMAP.md`](../planning/ROADMAP.md) |
| Current milestone, step table, decisions | [`../planning/STATUS.md`](../planning/STATUS.md) |
| New active chain listed | [`./README.md`](./README.md) |
| Public milestone status, if it changes what users should expect | [`../../documentation/roadmap.md`](../../documentation/roadmap.md), [`../../documentation/project-status.md`](../../documentation/project-status.md) |

Ideas consumed by the milestone stay in
[`../planning/ideas/`](../planning/ideas/README.md) but get marked as scheduled
with the milestone ID.

## Verify

- Every step prompt has all of the template's required sections.
- Every exit criterion maps to at least one step.
- No step depends on work from a later step.
- `STATUS.md` and `ROADMAP.md` agree with each other and with the chain README.
- No em dash characters; no emojis in Markdown headers.

## Handoff

1. Commit the chain and the planning updates together, for example
   `docs(planning): plan the <milestone-id> milestone chain`.
2. Tell the user the chain is ready, list the steps, and name the exact prompt to
   run in the next fresh chat.

## Guardrails

- Plan one milestone. Do not pre-plan the next one.
- Do not implement. If a step looks trivial, it is still a step, not something to
  do inline here.
- Do not add scope that is not in the milestone's **In scope** list. Anything you
  discover goes to [`../planning/ideas/`](../planning/ideas/README.md).
- Never push or tag.
- No em dash in prose. No emojis in Markdown headers.
