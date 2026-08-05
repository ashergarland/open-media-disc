# Ideas: CLI and automation

Prefix `CLI`. Changes to [`@open-media-disc/cli`](../../../packages/cli), the
`omd` command.

Current commands: `create`, `validate`, `inspect`, `checksum`, `image`, `burn`,
`play`, `label`, `rip`, with `--help`, `--version`, and a 0/1/2 exit-code
convention.

The strategic framing: the CLI is not a lesser Studio. It is the **integration
surface**. Anyone scripting OMD, running it on a server, or wiring it into
another tool goes through here, so its job is to be scriptable and unsurprising.

## CLI-1 `omd doctor`

**Pitch.** A diagnostics command that checks the environment and prints what is
present, what is missing, and what that prevents: Node version, ffmpeg, mpv or
ffplay, optical drives detected, write permissions, platform burn support.

**Why.** Most first-run failures are environmental, and the current error
messages surface them one at a time as mysterious failures deep in a workflow. A
single command that says "burning is unavailable on this platform" converts a bad
first impression into a clear expectation.

**Value** high · **Effort** low · **Serves** O2, O4 · **Depends on** none ·
**Status** open

**Risks.** Little. The main trap is letting it drift out of date as
prerequisites change; it should be driven by the same checks the commands use.

## CLI-2 JSON output on every command

**Pitch.** A `--json` flag on every command emitting a stable, documented
structure on stdout, with human output moved to stderr when it is set.

**Why.** This is what makes the CLI an integration point rather than a
destination. Any other tool, script, CI job, or language can then use OMD without
an SDK binding at all, which directly serves the "trivial to implement" goal at a
fraction of the cost of a second-language SDK.

**Value** high · **Effort** medium · **Serves** O1, O3 · **Depends on** SDK-5 ·
**Status** open

**Risks.** The JSON shape becomes a public API the moment anyone uses it, so it
needs versioning and a schema from day one, not later.

## CLI-3 Batch processing

**Pitch.** Run a command over a directory of album folders: `omd create ./music
--batch --out ./packages`, with a per-album summary and a non-zero exit if any
album failed.

**Why.** The first thing anyone with a real library wants to do is convert more
than one album. Doing it one command at a time is the difference between trying
OMD and adopting it.

**Value** high · **Effort** low · **Serves** O2 · **Depends on** none ·
**Status** open

**Risks.** Partial failure semantics need care: continue on error by default,
summarize at the end, and make the exit code meaningful.

## CLI-4 Shell completions

**Pitch.** Generated completions for PowerShell, bash, zsh, and fish, installable
through a documented one-liner.

**Why.** Cheap polish with a disproportionate effect on how finished a tool
feels, and it makes the command surface discoverable without reading docs.

**Value** low · **Effort** low · **Serves** O2, O6 · **Depends on** none ·
**Status** open

**Risks.** Completions drift from the real argument parser unless generated from
it.

## CLI-5 Watch a folder

**Pitch.** `omd watch <dir>` monitors a drop folder, packages each complete album
that appears, and reports results.

**Why.** It turns OMD into infrastructure: point a rip tool or a download folder
at it and packages appear. This is how the format ends up in someone's routine
rather than in their occasional projects.

**Value** medium · **Effort** medium · **Serves** O2, O3 · **Depends on** CLI-3
· **Status** open

**Risks.** Detecting when a folder has finished being written is genuinely hard
across platforms and network shares. Needs a settle timeout and idempotency.

## CLI-6 Actionable error messages

**Pitch.** Map every validation code and typed error to a short explanation and a
concrete next action, printed with the failure and linked to the docs anchor.

**Why.** Validation codes are stable and well documented, but the user meets them
as bare identifiers. Turning `NON_PORTABLE_FILENAME` into a sentence plus the
suggested fix removes most of the support burden the project will otherwise
accumulate.

**Value** high · **Effort** low · **Serves** O2, O4 · **Depends on** SDK-5 ·
**Status** open

**Risks.** The message table must live next to the codes so the two cannot drift.

## CLI-7 Export targets

**Pitch.** `omd export` writes a package out in other shapes: a plain album
folder with tags restored, an M3U playlist, a zip archive, or a directory tree
laid out for a media server.

**Why.** People will not adopt a format they feel locked into. A credible export
path is the strongest possible argument that OMD is not a silo, and it is far
more persuasive than saying so in the docs.

**Value** medium · **Effort** medium · **Serves** O3, O5 · **Depends on** SDK-7
· **Status** open

**Risks.** Writing tags back into audio files means modifying user audio, which
must be opt-in, never in place, and clearly reported.

## CLI-8 Documented automation contract

**Pitch.** Write down the exit codes, the stdout and stderr split, the
environment variables, and the non-interactive behavior, and test them.

**Why.** The 0/1/2 convention exists but is not something a script author can
rely on without reading source. Publishing it as a contract, with tests, is what
lets someone put `omd validate` in a CI pipeline.

**Value** medium · **Effort** low · **Serves** O1, O3 · **Depends on** CLI-2 ·
**Status** open

**Risks.** Once documented it is frozen, so it is worth designing before
publishing.

## CLI-9 Standalone disc verification

**Pitch.** `omd verify <drive-or-path>` reads a mounted OMD disc and checks every
file against the manifest and checksums, without burning or ripping anything.

**Why.** Verification currently exists only as a phase inside burn. Discs
degrade, and the promise that a disc still reads in ten years is only credible if
there is a one-command way to check.

**Value** medium · **Effort** low · **Serves** O5 · **Depends on** SDK-2 ·
**Status** open

**Risks.** Needs to distinguish a read error from a checksum mismatch, because
those mean very different things about the disc.

## CLI-10 Distribution beyond the monorepo

**Pitch.** Publish the CLI so it can be run without cloning: npm, `npx omd`, and
platform packages (winget, scoop, homebrew), ideally with a standalone binary.

**Why.** Today, trying OMD requires cloning a monorepo, installing pnpm, and
building. That is an enormous filter on adoption, and no amount of documentation
improvement compensates for it.

**Value** high · **Effort** medium · **Serves** O2, O4 · **Depends on** INF-1,
INF-2 · **Status** open

**Risks.** Publishing means supporting. Needs a release process, a versioning
policy, and a decision about whether the package names are claimed now or later.
