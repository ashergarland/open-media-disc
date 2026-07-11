---
mode: agent
description: Cut a visible version checkpoint for OMD. Verifies the tree is green, bumps the version per policy, and proposes a commit and tag at a clean, demoable point.
---

# Release checkpoint

Use this at the end of a stage or a meaningful increment to make progress visible
as a version. The goal is a clean, demoable point someone can check out and run.

## Step 1: confirm the tree is green

Run and require all three to pass:

```bash
pnpm build
pnpm test
pnpm lint
```

Then confirm the end-to-end flow still works:

```bash
pnpm omd create ./examples/source-album --out ./build/OMD-check
pnpm omd validate ./build/OMD-check
pnpm omd inspect ./build/OMD-check
```

If anything fails, stop and fix it before checkpointing.

## Step 2: confirm docs are in sync

- README and `documentation/` match the current behavior.
- If the format changed, the spec, schema, and `omdVersion` are consistent.
- No em dash and no emoji headers were introduced.

## Step 3: choose the version bump

Follow the versioning policy exactly:

- **Patch bump** for incremental progress within the roadmap (for example
  v0.2.9 to v0.2.10). This is the default.
- **Minor bump** only when the maintainer explicitly says this checkpoint is a
  milestone release.
- **Never a major bump** without explicit instruction.

Remember the format version (`omdVersion`) and the package/tool versions move
independently. A tool release does not silently change the format.

Update the version in the relevant `package.json` files (and any changelog if one
exists). Ask which packages should be bumped if it is ambiguous.

## Step 4: propose the commit and tag (confirm-first)

Do not commit, tag, or push on your own. Propose:

- A clear, imperative commit message summarizing the stage or increment.
- A suggested tag (for example `v0.2.10`).
- A one-paragraph summary of what a viewer would see at this checkpoint (what now
  works that did not before).

Wait for approval before running any git command. Pushing and force operations
always require explicit confirmation.

## Guardrails

- A checkpoint is only valid if build, tests, and lint are green and docs match.
- Never bypass verification hooks to force a checkpoint.
- No em dash. No emojis in Markdown headers.
