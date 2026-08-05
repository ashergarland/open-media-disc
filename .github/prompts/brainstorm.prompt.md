---
mode: agent
description: Run a structured brainstorm for Open Media Disc and record the results in the planning idea catalog, or refine and triage what is already there.
---

# Brainstorm: grow and triage the idea catalog

This prompt feeds the front of the prompt-driven development loop. Ideas captured
here are **not commitments**. They become work only when the user selects them and
they are written into [`../planning/ROADMAP.md`](../planning/ROADMAP.md) as a
milestone.

## Read first

1. [`../planning/ideas/README.md`](../planning/ideas/README.md): the catalog
   index, the ID scheme, and what is already captured. Never duplicate an
   existing idea; extend it.
2. [`../planning/ROADMAP.md`](../planning/ROADMAP.md): the objectives (O1-O6).
   Every idea should serve at least one, or be honest that it serves none.
3. [`../planning/STATUS.md`](../planning/STATUS.md): what exists today, so ideas
   are grounded rather than re-proposing shipped work.
4. [`../context/product-context.md`](../context/product-context.md): the scope
   boundaries and ethics. Ideas that break them get recorded as rejected, with
   the reason, rather than silently dropped.

## Goal

Either **expand** the catalog with new, concrete, well-formed ideas in the
categories the user names, or **triage** the existing catalog: merge duplicates,
sharpen vague entries, correct stale value or effort estimates, and mark what is
scheduled, rejected, or delivered.

Ask the user which mode they want, and which categories, before writing.

## Work items

1. **Ask for the frame.** Expand or triage? Which categories? Any constraint
   worth knowing (time, platform, appetite for risk)? Do not skip this; a
   brainstorm without a frame produces filler.

2. **Ground before generating.** For the chosen categories, read the relevant
   code and docs so ideas are specific to this codebase. "Add plugins" is filler.
   "Expose the `BurnBackend` seam as a registry so a Linux backend can be
   registered from outside `core`" is an idea.

3. **Generate in quantity, then cut.** Prefer many concrete ideas over a few
   grand ones. Include the unglamorous: error messages, install friction,
   defaults, docs, and accessibility. Include at least a few ideas that would
   embarrass the current design if they are right.

4. **Write each idea in the catalog format.** Every idea gets:
   - a stable ID from its category prefix,
   - a one-line pitch that a stranger could understand,
   - a short "why it matters" tied to an objective,
   - **Value** and **Effort** (low, medium, high, with a reason if either is
     surprising),
   - **Depends on**, by idea or milestone ID,
   - **Risks or open questions**.

   Never renumber existing IDs. IDs are permanent, including for rejected ideas.

5. **Be honest about cost.** An idea that needs a native module, a second
   language toolchain, or ongoing maintenance of someone else's API must say so
   in Risks. Understating effort here produces a broken milestone later.

6. **Triage pass.** Merge duplicates (keep the older ID, note the merge), retire
   ideas overtaken by shipped work, and correct estimates that the last milestone
   proved wrong.

7. **Report.** Summarize what you added or changed, call out the three or four
   ideas you would actually pick and why, and name what you deliberately did not
   propose.

## Doc update requirements

| Change | File |
| --- | --- |
| New or edited ideas | The relevant file in [`../planning/ideas/`](../planning/ideas/README.md) |
| New category, or counts and index changes | [`../planning/ideas/README.md`](../planning/ideas/README.md) |
| An idea selected into a milestone | [`../planning/ROADMAP.md`](../planning/ROADMAP.md), and mark the idea scheduled |
| A decision about direction | Decision log in [`../planning/STATUS.md`](../planning/STATUS.md) |

No user-facing documentation changes: a brainstorm ships nothing.

## Verify

- Every new idea has an ID, pitch, value, effort, dependencies, and risks.
- No duplicate IDs, and no reused IDs.
- Every idea maps to an objective, or says plainly that it does not.
- Nothing violates the scope boundaries or ethics in the product context.
- No em dash characters; no emojis in Markdown headers.

## Handoff

1. Commit, for example `docs(planning): expand the idea catalog for <category>`.
2. Tell the user what changed and what you recommend selecting.
3. If the user selects ideas, write the milestone into `ROADMAP.md` with every
   required field, then point them at `/milestone-plan` to generate the chain.

## Guardrails

- Ideas are not commitments. Do not implement anything here.
- Do not delete rejected ideas. A recorded "no, because" is worth more than a
  gap, and stops the same idea coming back every quarter.
- Respect the ethics: OMD is for music the user owns. No DRM, no marketplace, no
  streaming playback integration.
- No em dash in prose. No emojis in Markdown headers.
