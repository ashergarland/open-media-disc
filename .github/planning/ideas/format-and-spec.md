# Ideas: format and spec

Prefix `FMT`. Changes to the normative contract in [`../../../spec/`](../../../spec).

These are the highest-stakes ideas in the catalog. OMD is still private and
pre-stable, so the current draft may break without a migration or compatibility
layer. This is the opportunity to correct the format before the first stable
release makes long-term readability a commitment.

Default assumption: draft compatibility is not a constraint. The first stable
format needs a deliberate version, a consumer policy for unknown fields, and the
commitment that packages created under it remain readable.

## FMT-1 Conformance suite and fixture corpus

**Pitch.** A language-neutral test corpus: a folder of golden packages, valid and
deliberately broken, each with a machine-readable file stating the exact
validation result an implementation must produce.

**Why.** Right now "open format" rests on one TypeScript implementation. A
conformance suite converts the spec from prose into something you can pass or
fail, which is the precondition for anyone else implementing OMD at all.

**Value** high · **Effort** medium · **Serves** O1, O5 · **Depends on** none ·
**Status** open

**Risks.** The corpus must stay small enough to live in git (synthetic,
metadata-only audio, never copyrighted material). Expected-results files become a
second source of truth that can drift from `OMD_VALIDATION_RULES.md` unless they
are generated from it.

## FMT-2 Replace the draft `OMD-FLAC-DATA` identifier

**Pitch.** Replace the private draft identifier with a codec-neutral format id
before the first stable release.

**Why.** The current id says FLAC while the format explicitly supports six
codecs. Every newcomer reads it as a contradiction, and it will keep costing an
explanation forever. Fixing it is cheap now and expensive after adoption.

**Value** medium · **Effort** low · **Serves** O1, O5 · **Depends on** FMT-11
· **Status** open

**Risks.** Every private fixture, schema, implementation, and document must move
together. No compatibility window is needed before stability.

## FMT-3 Gapless playback metadata

**Pitch.** Record encoder delay, padding, and intended track boundaries in the
manifest so a live album plays without a click between tracks.

**Why.** Gapless is the difference between "a folder of songs" and "an album".
It is the most common complaint about file-based album playback, and OMD is
explicitly an album format.

**Value** high · **Effort** medium · **Serves** O5, O6 · **Depends on** FMT-11 ·
**Status** open

**Risks.** Correct values require decoding or trusting the encoder. Lossy codecs
handle this very differently (LAME tags versus Opus pre-skip). Getting it subtly
wrong is worse than not claiming it.

## FMT-4 Loudness and ReplayGain fields

**Pitch.** Optional album and track loudness (EBU R128 / ReplayGain 2.0) fields
in the manifest, computed at package time.

**Why.** Compilations and mixtapes currently jump in volume between tracks. A
player that reads one number can fix it. Computing it once at authoring time is
far cheaper than every player analyzing at playback.

**Value** medium · **Effort** medium · **Serves** O5, O6 · **Depends on** FMT-11
· **Status** open

**Risks.** Requires an analysis pass over the audio at create time, which slows
packaging. Must be optional so minimal producers stay conformant.

## FMT-5 Multi-disc sets

**Pitch.** First-class fields linking discs into a set: a shared set id, disc
number, and disc total, plus a set title.

**Why.** A double album currently becomes two unrelated discs. Physical formats
have always had box sets, and this is the most obvious gap between OMD and the
formats it is imitating.

**Value** medium · **Effort** low · **Serves** O5, O6 · **Depends on** FMT-11 ·
**Status** open

**Risks.** Players must degrade gracefully when only one disc of a set is
present. Set identity must not depend on a central registry.

## FMT-6 Extended credits and roles

**Pitch.** Optional structured credits: composer, performers with roles,
producer, engineer, label, catalog number.

**Why.** Classical, jazz, and reissue collectors care about this more than
anything else in the metadata, and they are exactly the audience that buys
physical media. It is also what makes an OMD disc feel like a real release
rather than a rip.

**Value** medium · **Effort** medium · **Serves** O3, O6 · **Depends on** FMT-11
· **Status** open

**Risks.** Credit modeling is a swamp. Copying a subset of the MusicBrainz model
is safer than inventing one. Keep it strictly optional and shallow.

## FMT-7 Lyrics and liner text

**Pitch.** An optional `LYRICS/` directory with per-track plain or timed lyrics,
plus a liner notes text file alongside the existing `BOOKLET.pdf`.

**Why.** A booklet PDF is not readable on a small player panel. Plain text is,
and timed lyrics turn a static player screen into something people look at.

**Value** medium · **Effort** low · **Serves** O6 · **Depends on** none ·
**Status** open

**Risks.** Lyrics are copyrighted by third parties. The tooling must never fetch
or bundle them automatically; it can only carry what the user supplies.

## FMT-8 Optional manifest signature

**Pitch.** An optional detached signature over the manifest so a package can
prove it was produced by a given key and has not been altered.

**Why.** Checksums prove a disc is intact; they do not prove who made it. For
artists distributing their own OMD discs, provenance is the difference between a
disc and a credible release.

**Value** low · **Effort** medium · **Serves** O5 · **Depends on** FMT-11 ·
**Status** open

**Risks.** Key distribution is the hard part and we have no infrastructure for
it. Must never become a gate on playback: this is provenance, not DRM, and the
distinction has to be enforced in the spec text.

## FMT-9 Conformance profiles

**Pitch.** Define a Core profile (what every reader must support) and an Extended
profile (optional fields), so a minimal embedded player can be fully conformant
without implementing everything.

**Why.** As the manifest grows, the risk is that a future Pi player or a
third-party reader is technically non-conformant because it skipped lyrics.
Profiles keep the barrier to entry at "an afternoon".

**Value** medium · **Effort** low · **Serves** O1 · **Depends on** FMT-1 ·
**Status** open

**Risks.** Profiles can fragment an ecosystem if drawn badly. Only two levels,
and the Core profile never grows.

## FMT-10 Fidelity facts in the manifest

**Pitch.** Record sample rate, channel count, and bit depth or nominal bitrate
per track (or per package where they are uniform), captured at packaging time.

**Why.** The project has a hard rule about honest codec language: show sample
rate always, bit depth only when lossless, bitrate only when lossy. Today a
player cannot follow that rule without decoding the file itself. This makes the
honest statement free for every reader, including embedded ones.

**Value** high · **Effort** low · **Serves** O1, O5, O6 · **Depends on** FMT-11,
SDK-7 · **Status** open

**Risks.** Requires a metadata reader for every supported codec, not just FLAC.
Values must be measured, never guessed from the file extension.

## FMT-11 Version 0.2.0 planning and the unknown-field policy

**Pitch.** Decide and document how the format evolves: what a minor bump means,
how consumers treat unknown fields, and what a producer must do when targeting an
older version.

**Why.** Several ideas above are blocked on this. Without a stated policy, the
first additive change forces every reader to be rewritten, which is the exact
failure mode that kills open formats.

**Value** high · **Effort** low · **Serves** O1, O5 · **Depends on** none ·
**Status** open

**Risks.** Getting this wrong is the single most damaging possible mistake in the
project. It should be written once, carefully, and then treated as close to
immutable.

## FMT-12 Sort fields and non-Latin titles

**Pitch.** Optional `sortArtist` and `sortAlbum` fields, and explicit spec
guidance on Unicode normalization for titles and filenames.

**Why.** "The Beatles" sorting under T is the small thing that makes a catalog
feel amateur. Non-Latin titles currently degrade through the filename
normalization rules with no way to preserve the original for display.

**Value** low · **Effort** low · **Serves** O4, O6 · **Depends on** FMT-11 ·
**Status** open

**Risks.** Unicode normalization interacts with the portable-filename validation
rule and with UDF volume labels. Needs care, not much code.

## FMT-13 Additional artwork slots

**Pitch.** Named optional artwork beyond `COVER.*`: back cover, disc face, and
spine, at the package root.

**Why.** The label tooling already wants a disc face and a spine. Standardizing
the filenames means any tool, including third-party label printers, can find
them.

**Value** medium · **Effort** low · **Serves** O6 · **Depends on** none ·
**Status** open

**Risks.** Artwork inflates package size against a 1.4 GB budget. Needs guidance
on resolution and a validation warning when art is disproportionate.

## FMT-14 Compilation and mixtape semantics

**Pitch.** Make compilations explicit rather than inferred: a flag plus guidance
on when per-track artist, album, and year fields are authoritative.

**Why.** The per-track override fields already exist, but nothing says what a
player should display for a "Various Artists" disc. Two conformant players can
show different things today, which is a spec bug.

**Value** medium · **Effort** low · **Serves** O1, O6 · **Depends on** FMT-11 ·
**Status** open

**Risks.** Mostly a documentation and display-rules problem, so the temptation is
to skip it. Display ambiguity is exactly what makes formats feel inconsistent.
