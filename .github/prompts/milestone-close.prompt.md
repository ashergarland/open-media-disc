---
mode: agent
description: Close out a finished milestone: verify the exit criteria, cut a version, archive the prompt chain, update the roadmap and status, and promote the next milestone.
---

# Milestone close: finish and archive a chain

The last chat of a milestone. Its job is to make the milestone **provably done**
and to leave the repository ready for the next one. Run it only after the final
step of a chain has landed.

## Read first

1. [`../planning/STATUS.md`](../planning/STATUS.md): the current milestone, its
   step table, and open blockers.
2. [`../planning/ROADMAP.md`](../planning/ROADMAP.md): the milestone's exit
   criteria, verbatim. You will check every one.
3. The chain README at `.github/prompts/<milestone-id>/README.md`.
4. [`../copilot-instructions.md`](../copilot-instructions.md): the definition of
   done and the docs-in-sync table.

## Preconditions

- Every step in the chain is marked done in `STATUS.md`. If any is not, stop and
  say which.
- The working tree is clean.

## Goal

Prove the milestone met its exit criteria, cut a visible version, and leave
`ROADMAP.md`, `STATUS.md`, the public docs, and the prompts folder all consistent
with a finished milestone.

## Work items

1. **Check the exit criteria one by one.** Quote each criterion from
   `ROADMAP.md` and state how it is satisfied, with the evidence: a test name, a
   command output, a file, or an explicit user confirmation. Any criterion that
   cannot be evidenced is **not met**. Do not soften it. Present unmet criteria
   to the user and ask whether to finish the work, waive the criterion (recorded
   as a decision), or defer it to
   [`../planning/ideas/`](../planning/ideas/README.md).

2. **Run the gates.** `pnpm build`, `pnpm test`, `pnpm lint`. Report the real
   test count. If the format changed, confirm `pnpm gen:examples` was re-run and
   the fixtures are committed.

3. **Audit the docs.** Walk the mapping table in
   [`../copilot-instructions.md`](../copilot-instructions.md) for everything the
   milestone touched and confirm each target doc is actually updated. Fix drift
   here rather than leaving it. Check `documentation/project-status.md` and
   `documentation/roadmap.md` reflect the new reality.

4. **Cut the version.** Patch bump by default; minor only if the user says this
   is a milestone release; never major without instruction. Remember versions
   that live in more than one place (Studio's `package.json` and
   `STUDIO_VERSION`). Propose the commit and an annotated tag using the
   per-package convention (`<package>-v<version>`, for example
   `studio-v0.3.0`). **Ask before tagging. Never push.**

5. **Archive the chain.** `git mv .github/prompts/<milestone-id>/` to
   `.github/prompts/archive/<milestone-id>/`, fix the relative links in the moved
   files (they move two levels deeper), and rewrite the chain README in past
   tense: what it delivered, the version and tag, and any durable gotcha worth
   keeping. Leave the archive's own index consistent.

6. **Update the planning files.**
   - `ROADMAP.md`: move the milestone from Planned to Delivered with its version.
   - `STATUS.md`: move it into Completed milestones with a one-line summary and
     where it lives now; promote any durable fact learned into the durable facts
     section; resolve blockers it closed; set Current milestone to the next
     roadmap milestone (or "None. Between milestones." if selection is pending).
   - `.github/prompts/README.md`: move the chain from active to archived.

7. **Harvest what was learned.** Anything discovered but not built during the
   milestone goes into [`../planning/ideas/`](../planning/ideas/README.md) with a
   fresh ID. Anything a future chat could get wrong goes into the decision log in
   `STATUS.md`. Update repository memory (`/memories/repo/open-media-disc.md`).

## Doc update requirements

| Change | File |
| --- | --- |
| Milestone delivered, version recorded | [`../planning/ROADMAP.md`](../planning/ROADMAP.md), [`../planning/STATUS.md`](../planning/STATUS.md) |
| Public milestone state | [`../../documentation/roadmap.md`](../../documentation/roadmap.md), [`../../documentation/project-status.md`](../../documentation/project-status.md) |
| Anything the milestone shipped that is user-facing | Per the mapping table in [`../copilot-instructions.md`](../copilot-instructions.md) |
| Chain moved to archive | [`./README.md`](./README.md), the archived chain README |

## Verify

- Every exit criterion is either evidenced, or explicitly waived by the user and
  recorded as a decision.
- `pnpm build`, `pnpm test`, `pnpm lint` green, with the real test count quoted.
- No dangling links after the archive move. Check the moved files' relative
  paths resolve.
- `ROADMAP.md`, `STATUS.md`, the public docs, and the prompts README all tell the
  same story.

## Handoff

1. Propose the commit (and tag) and wait for approval.
2. Summarize for the user: what shipped, the version, what was waived or
   deferred, what is now unblocked, and the recommended next milestone.
3. Name the exact prompt to run next: usually `/milestone-plan` for the next
   roadmap milestone, or `/brainstorm` if the roadmap is empty.

## Guardrails

- Do not mark a criterion met on the strength of a plausible argument. Evidence
  or nothing.
- Do not claim UI or hardware behavior is verified unless the user confirmed it.
- Ask before tagging. Never push.
- No em dash in prose. No emojis in Markdown headers.
