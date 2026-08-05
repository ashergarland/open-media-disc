# Ideas: core SDK

Prefix `SDK`. Changes to [`@open-media-disc/core`](../../../packages/core), the
library that the CLI, Studio, and every future app are built on.

The SDK is the leverage point of the whole project. Anything that makes it easier
to build an OMD tool multiplies across every surface in this catalog.

Current surface: `createPackage`, `validatePackage`, `inspectPackage`, manifest
create/parse/validate, checksums, FLAC metadata, filename normalization, disc
size estimation, `discImage`, `burn` (Windows/IMAPI2), `rip`, `mediaKind`,
`audioConvert`.

## SDK-1 Cross-platform burn backends

**Pitch.** Implement the existing `BurnBackend` seam for Linux (`xorriso` or
`growisofs`) and macOS (`drutil` or `hdiutil`), and turn the seam into a registry
so a backend can be contributed without editing `core`.

**Why.** Burning is the point of the project and it works on one operating
system. Every hardware milestone, the Pi player included, is gated on a Linux
backend. This is the single largest hole in the software today.

**Value** high · **Effort** high · **Serves** O2, O4 · **Depends on** SDK-2,
INF-1 · **Status** open

**Risks.** Cannot be verified without hardware on each platform, which is exactly
the constraint that parked the hardware work. Mitigate with an image-level test
path (INF-9) plus a clearly labelled "unverified on this platform" state.

## SDK-2 Cross-platform disc detection and media probe

**Pitch.** Extend `mediaKind` and the disc-probe path beyond Windows PowerShell:
Linux via `/sys/block` and `udev`, macOS via `diskutil`.

**Why.** Studio's Create a Disc screen and the whole insert-a-disc flow depend on
knowing what is in the drive. On Linux today it knows nothing, so the app is
effectively read-only there.

**Value** high · **Effort** medium · **Serves** O2, O4 · **Depends on** none ·
**Status** open

**Risks.** Optical drive reporting is inconsistent across kernels and drives.
Needs a conservative "unknown" state that degrades safely rather than guessing.

## SDK-3 Platform-independent UDF image building

**Pitch.** Build the burn-ready UDF image without depending on Windows-only
tooling, either through a bundled `xorriso` or a pure implementation of the
subset OMD needs.

**Why.** Imaging is described in the spec as hardware-free and therefore possible
anywhere, but the implementation is not. Fixing this lets anyone produce and
inspect a real OMD image, which is a much lower bar for participation than
burning.

**Value** high · **Effort** high · **Serves** O1, O4 · **Depends on** none ·
**Status** open

**Risks.** UDF is a large specification. Writing a correct minimal writer is a
serious project; bundling a binary tool adds a native dependency and licensing
questions. The choice between those two is the real decision.

## SDK-4 Progress and event reporting for long operations

**Pitch.** A consistent progress and phase event stream from `createPackage`,
`burn`, `rip`, and checksum verification, rather than each caller inventing its
own.

**Why.** Studio already needs this and has bespoke plumbing for it. Every future
app will need the same. Standardizing it in the SDK is what makes a third-party
GUI feasible.

**Value** medium · **Effort** medium · **Serves** O1 · **Depends on** none ·
**Status** open

**Risks.** Async iterator versus callback versus event emitter is an API choice
that is hard to reverse. Pick once, document it, and use it everywhere.

## SDK-5 Typed errors with stable codes

**Pitch.** Replace thrown strings and ad hoc errors with a typed error hierarchy
carrying stable machine-readable codes, in the same spirit as the existing
`ValidationCode` values.

**Why.** Validation codes are already treated as a stable API and that has worked
well. Runtime errors are not, so every consumer either swallows them or matches
English text. This is the main reason an outside developer would find the SDK
unpleasant.

**Value** high · **Effort** medium · **Serves** O1 · **Depends on** none ·
**Status** open

**Risks.** It is a breaking change to anything catching current errors, which
today is only our own code. Doing it before there are outside consumers is much
cheaper than after.

## SDK-6 Cancellation support

**Pitch.** Accept an `AbortSignal` in every long-running operation and honor it
promptly, including partial cleanup.

**Why.** A user who starts a rip of a scratched disc currently has to kill the
app. Cancellation is table stakes for any GUI and is nearly free if designed in
alongside SDK-4.

**Value** medium · **Effort** medium · **Serves** O2 · **Depends on** SDK-4 ·
**Status** open

**Risks.** Cancelling a burn mid-write is not safe and must be refused explicitly
rather than half-supported. The API needs to distinguish cancellable phases from
uncancellable ones.

## SDK-7 Metadata readers for every supported codec

**Pitch.** Extend the dependency-free FLAC reader approach to MP3, AAC, Vorbis,
Opus, and WAV: duration, sample rate, channels, bit depth or bitrate, and
embedded tags.

**Why.** The format supports six codecs but the SDK can only truly read one, so
five sixths of possible packages get worse metadata. This also blocks FMT-10,
which is the idea that makes honest codec language possible everywhere.

**Value** high · **Effort** high · **Serves** O1, O3 · **Depends on** none ·
**Status** open

**Risks.** Six parsers is real work and a long tail of malformed files. An
existing library would be faster but adds a dependency to a package that is
deliberately dependency-light. That tradeoff needs an explicit decision.

## SDK-8 Package repair

**Pitch.** A `repairPackage` operation that recomputes checksums, regenerates a
missing `CHECKSUMS.sha256`, fixes track counts and sizes, and normalizes
filenames, reporting every change it makes.

**Why.** Today a package that drifts even slightly is simply invalid, and the
only fix is to rebuild it from source audio the user may no longer have. For a
format that promises recoverability, that is a gap.

**Value** medium · **Effort** medium · **Serves** O5 · **Depends on** SDK-5 ·
**Status** open

**Risks.** Repair must never silently mask real corruption. A checksum mismatch
against intact audio is a very different situation from a missing checksums file,
and conflating them would undermine the integrity guarantee.

## SDK-9 Package and disc comparison

**Pitch.** A `diffPackages` operation that reports exactly how two packages, or a
package and a mounted disc, differ.

**Why.** It answers the two questions people actually ask: "is this disc the same
as my library copy?" and "what changed when I re-created this package?". It is
also the natural basis for a smarter verify.

**Value** medium · **Effort** low · **Serves** O5 · **Depends on** none ·
**Status** open

**Risks.** Little. Mostly a matter of choosing a good report shape.

## SDK-10 Determinism tests

**Pitch.** Tests that build the same package twice from the same source and
assert byte-identical output, including manifest key order and timestamps.

**Why.** Determinism is a stated design commitment but nothing currently enforces
it. It is the kind of property that silently breaks and is then very hard to
restore.

**Value** medium · **Effort** low · **Serves** O5 · **Depends on** none ·
**Status** open

**Risks.** `createdAt` and the generator version are legitimately non-
deterministic, so the test needs a documented injection point for both.

## SDK-11 Browser and WASM compatible read path

**Pitch.** Split the pure parts of the SDK (manifest parse and validate,
checksums, size math, filename rules) so they run unchanged in a browser or a
worker with no Node APIs.

**Why.** It is the precondition for a web inspector (APP-1) and for embedding
validation in other people's web tools. It also forces a healthy separation
between format logic and filesystem plumbing.

**Value** medium · **Effort** medium · **Serves** O1, O3 · **Depends on** none ·
**Status** open

**Risks.** Requires discipline about entry points and conditional exports. Doable
incrementally, but easy to regress without a build check.

## SDK-12 Pluggable conversion backends

**Pitch.** Make `audioConvert` a documented seam so ffmpeg is one implementation
rather than the assumption, and so a caller can supply its own transcoder.

**Why.** ffmpeg is a large dependency to force on every consumer, and some
environments (an embedded player, a locked-down machine) cannot ship it. A seam
lets the core stay light while Studio keeps its bundled binary.

**Value** low · **Effort** low · **Serves** O4 · **Depends on** none ·
**Status** open

**Risks.** Little, beyond the usual cost of one more abstraction.

## SDK-13 Public API surface freeze

**Pitch.** Generate an API report from the exported surface, commit it, and fail
the build when it changes without an intentional update.

**Why.** `index.ts` currently re-exports everything from every module, so
internal helpers are public API by accident. Once other people build on the SDK,
every accidental export becomes a compatibility obligation.

**Value** medium · **Effort** low · **Serves** O1, O5 · **Depends on** INF-1 ·
**Status** open

**Risks.** Requires deciding what is genuinely public, which will surface some
uncomfortable answers about the current shape of the module boundaries.
