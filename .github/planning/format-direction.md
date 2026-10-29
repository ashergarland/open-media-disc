# OMD format direction

This document records decisions for the next OMD format revision while the
design is being discussed. It is a planning document, not a normative contract.
The current private draft remains `omdVersion` 0.1.0 as defined in
[`../../spec/`](../../spec/).

No implementation should treat the design below as shipped until a format
milestone updates the specification, schema, validation rules, implementation,
fixtures, and public documentation together.

OMD has not had its first stable format release. Draft packages, manifests,
fixtures, and tools may be changed or replaced without backward compatibility
while the format is private and pre-stable. Compatibility guarantees begin with
the first stable format release, not with `omdVersion` 0.1.0 or the software's
internal milestone versions.

## Strategic frame

The format serves the strategy in [`strategy.md`](./strategy.md):

> Make the digital-to-physical album experience so good that collectors and
> independent artists voluntarily adopt OMD before dedicated hardware exists.

When technical options are otherwise comparable, choose the one that best serves
personal physical album creation, independent-artist short runs, recoverability,
and an open ecosystem.

## Settled directions

### Release format and physical bindings

The core OMD object is a verifiable media package, not an optical filesystem.
Optical disc, removable storage, an ordinary folder, and the future cartridge
are bindings or representations of that package.

The cartridge remains the flagship physical experience. It does not gate access
to the open format.

Consequences for the next spec:

- Core package validity must not depend on a target disc type or filesystem.
- Capacity and write constraints belong to a target binding.
- The optical binding keeps OMD's UDF, blanking, writing, and read-back
  verification rules.
- Other bindings must preserve the same release identity and integrity
  guarantees.

### One package, one music release

An OMD package represents exactly one music release. A release may include rich
supporting material such as:

- Cover and additional artwork.
- Animated artwork.
- Credits, lyrics, liner notes, and a booklet.
- Music videos and related release video.

Standalone movies and general video are not part of the next core format. They
may use a future profile if a distinct need justifies one.

### Minimum core manifest

The following example describes a simple core-compatible presentation, not a
final constraint that every enhanced release must contain this exact
top-level stereo audio object. The format revision must settle how the
canonical album track list relates to declared presentations.

The working core baseline contains only standardized identity, attribution,
playback, and factual audio data:

```json
{
  "format": "org.openmediadisc.release",
  "version": "<next-format-version>",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Compilation Title",
  "albumArtist": "Various Artists",
  "audio": {
    "codec": "FLAC",
    "sampleRateHz": 44100,
    "channelCount": 2,
    "bitDepth": 16
  },
  "tracks": [
    {
      "number": 1,
      "title": "Track One",
      "artist": "Artist Name feat. Guest",
      "path": "AUDIO/01 - Track One.flac",
      "durationMs": 213042
    }
  ],
  "extensions": {}
}
```

The persistent `id` identifies one authored OMD release. It is a randomly
generated UUID assigned when the release is first created:

- The ID is preserved when the release is copied, burned, converted between its
  directory and `.omd` representations, or written to another medium.
- Optional metadata, artwork, and other enrichment may change without changing
  the ID.
- Changing track order, the track list, or audio content creates a new authored
  release and therefore a new ID.
- Independently rebuilding from a source album creates a new ID unless the
  producer explicitly supplies and preserves an existing one.

**Multi-presentation revision:** stripping an optional mix changes package
contents without necessarily changing the authored music-release identity.
The rules for retained release ID, package identity, derivative provenance,
and checksums are an explicit design question, not yet a settled extension
of the current identity policy.

The human-facing title is separate and replaces the display purpose currently
overloaded onto `discId`. Existing private draft packages may be regenerated; no
`discId` compatibility layer is required.

`albumArtist` is the release-level display credit and may be `Various Artists`.
Each track has its own required display artist credit. Structured contributors
and roles belong in an official credits extension.

Per-track duration is required as integer milliseconds. Package-level track
count, total duration, and total size are derived rather than duplicated.
`CHECKSUMS.sha256` remains the required integrity mechanism, so the manifest
does not add a second content hash or repeat per-track hashes.

Release date, label, catalog number, genre, copyright, UPC/EAN, and ISRC belong
in an official release-metadata extension because they are useful but not
universally available.

### Multiple audio presentations (revised direction, 2026-10-28)

**This revision supersedes the prior one-uniform-audio-profile-per-release
design for the next OMD format.** A publisher may include multiple distinct
stereo, multichannel or immersive mixes in one verifiable music-release package.
The publisher chooses which mixes to ship; there is no requirement to store a
separate precomputed file for every output device.

Audio facts are uniform *within a single presentation* where that is useful for
interoperability, but presentations within a release may differ in codec,
container, sample rate, bit depth, channel layout, mix and mastering.

Treat the package, the artist-authored audio presentations, and runtime output
rendering as separate concepts. A calculated stereo downmix or a binaural
headphone rendering is not automatically an artist-authored stereo master.

**Preferred packaging and playback model, subject to feasibility testing:**

- A versioned official audio-presentations extension declares included mixes,
  audio facts, file mappings, optional publisher preferences and the decoder or
  output capabilities they require.
- OMD Studio can remove selected optional presentations to produce a smaller,
  separately verified package for CD, DVD, Blu-ray or other media, with explicit
  warnings about lost playback options. Retained originals are not silently
  re-encoded.
- OMD Player may select a compatible presentation and perform explicitly
  supported runtime output adaptation (stereo downmix, 5.1/7.1 mapping,
  binaural headphone rendering, or immersive passthrough).
- The player must distinguish an original artist mix from generated output and
  give a clear compatibility error if no playable path exists.
- The format's universal-playback promise needs a deliberate revision:
  evaluate requiring a core stereo presentation versus allowing a declared
  surround-only/immersive-only package with capability-negotiated playback.
  The choice remains open; the format should not quietly hardcode either.

The current private v0.1.0 draft and the next-stable **core decoder baseline**
remain distinct from this proposed package architecture; they must not be
mistaken for the final multi-presentation specification.

The draft change proposal and retained alternatives are documented in
[`spec/proposals/OMD_AUDIO_PRESENTATIONS_VNEXT.md`](../../spec/proposals/OMD_AUDIO_PRESENTATIONS_VNEXT.md).
See also [Issue #1](https://github.com/ashergarland/open-media-disc/issues/1).

### Uniform codec facts within individual presentations

Each presentation must declare a coherent, verifiable audio profile and track
mapping. Codec, sample rate, channel count/layout, bit depth where applicable,
and measured bitrate fields must describe the actual stored files. The
mechanism for continuous mixes, per-track variations, and gapless alignment
remains under investigation.

The earlier one-codec-per-**release** invariant is not a constraint on the
new format. Its implementation must be revised together with the manifest
schema, validator, SDK, CLI, Studio and reference player.

MP3 bitrate has one deliberate exception because preserving an existing VBR
album is more important than forcing a metadata shape that requires re-encoding:

- The album profile declares `bitrateMode` as `CBR` or `VBR`.
- A CBR release declares one album-level `bitrateKbps` shared by every track.
- A VBR release records measured `bitrateKbps` on each track.
- Players display the single value for CBR or a derived per-track range for VBR.
- Players and importers support compatible CBR and VBR MP3.
- Producers use a fixed MP3 output profile when normalization requires MP3
  encoding. VBR encoding is not required.
- Producers must preserve compatible owned VBR files without re-encoding merely
  to obtain one bitrate.

The per-track VBR measurement and validation tolerance must be defined
codec-by-codec. No album-average bitrate is stored.

### Player codec interoperability

An unqualified conforming OMD Player must implement every decoder required by
the stable core decoder profile. This does not itself imply that every advanced
multi-presentation package, especially one with no core-compatible mix, will be
playable. Conformance rules for advanced-only packages, optional rendering and
graceful failure must be defined before the revised format becomes normative.

The first stable core permits:

- FLAC.
- MP3.

Every OMD Player supports both.

The stable FLAC profile is:

- Native `.flac` streams with the `fLaC` marker, not FLAC wrapped in Ogg,
  Matroska, MP4, or another container.
- Sample rates of 44.1, 48, 88.2, 96, 176.4, or 192 kHz.
- Bit depths of 16 or 24 bits.
- Mono or stereo.
- One sample rate, bit depth, and channel count across every track in an
  individual core FLAC presentation, pending the multichannel spec revision.
- Full compliance with the RFC 9639 FLAC streamable subset.
- Fixed, common block sizes within the subset limits.
- Complete STREAMINFO with a known total sample count and non-zero decoded-audio
  MD5.
- No custom channel masks, uncommon bit depths, multichannel layouts, escaped
  Rice partitions, forbidden bit patterns, or other non-subset constructs in
  the proposed **core stereo FLAC decoder profile**. This limitation does
  **not** prohibit optional multichannel FLAC presentations in the revised
  package format; the multichannel extension rules remain under investigation.

Every OMD Player decodes the complete stable FLAC profile through 24-bit/192 kHz.
This intentionally requires more capable hardware than the cheapest embedded
decoder chips so OMD can preserve common purchased high-resolution releases and
artist masters without resampling.

Integer PCM WAV, AIFF, and ALAC input within this profile is normalized to FLAC.
32-bit integer or floating-point input is normalized to 24-bit before FLAC
encoding. Inputs with unsupported channel layouts or sample rates outside the
stable set are rejected with an actionable explanation rather than silently
mapped to an unrelated profile.

The stable MP3 profile is MPEG-1 Audio Layer III in `.mp3` files:

- Sample rates of 32, 44.1, or 48 kHz.
- Mono, stereo, or joint stereo.
- Legal MPEG-1 Layer III CBR rates from 32 through 320 kbps.
- VBR using legal MPEG-1 Layer III per-frame rates.
- One sample rate and channel count across every track in an individual MP3 presentation.
- One presentation-level bitrate mode. CBR tracks share one bitrate; VBR tracks
  carry measured per-track bitrate and players may derive a displayed range.
- MPEG-2, MPEG-2.5, Layer I/II, dual-channel, free-format, invalid or reserved
  frame headers, and codec-extension mismatches are rejected.

Existing uniform compatible MP3 presentations are preserved. Normalization uses
44.1 kHz stereo at 320 kbps CBR, or 44.1 kHz mono at 160 kbps CBR.

The stable list is deliberately small enough for desktop, embedded, portable,
and future cartridge players to implement reliably. Additional codecs in the basic decoder profile
require a future format decision. Optional advanced presentation codecs can
be introduced through versioned capabilities once the revised negotiation and
conformance contracts are settled.

### Import codecs and package codecs

Producer import support may grow independently from the stable core codec list.
The following automatic normalization policy remains a candidate for
single-presentation releases. The revised multi-presentation authoring workflow
must **not** apply it indiscriminately across intentionally distinct artist
masters, collapsing their codecs or layouts.

For ordinary single-presentation releases, the current plan is:

1. A release that is already uniform FLAC is preserved.
2. A release that is already uniform MP3 is preserved, including compatible VBR.
3. A release made only from FLAC, common PCM WAV, AIFF, or ALAC is normalized to
   FLAC.
4. AAC/M4A, Vorbis, Opus, or any mixture containing compressed sources is
   normalized as one release to MPEG-1 Audio Layer III at 44.1 kHz, stereo,
   320 kbps CBR. Mono input is normalized at 44.1 kHz, mono, 160 kbps CBR,
   preserving the channel layout while using the same nominal bits per channel.
5. DRM-protected, encrypted, or undecodable input is rejected with an actionable
   explanation.

AAC and other non-core imports may rely on an available external or system
decoder. Their decoders are not part of OMD Player conformance.

Normalization is an internal packaging step, not a separate conversion product.
The manifest records only the packaged codec and measured audio facts. It does
not record source codec, conversion history, or claims about the audio's history.
Studio may preview the resulting codec and measured profile before creation, but
does not ask the user to choose a target codec in the standard workflow.

OMD never presents audio with `lossless` or `lossy` category labels. User-facing
surfaces state the codec and applicable measured facts: sample rate, channel
count, bit depth, bitrate, and bitrate mode.

Bitrate describes the packaged file. It is not a quality score and does not
certify the source or the audio's history. The 320 kbps normalization target is
chosen to limit additional encoding impact and provide predictable capacity, not
to imply that lower-rate input became higher quality.

### Role-based conformance

OMD uses role-based conformance rather than permanent Core and Full tiers:

- **OMD Reader:** parses the core manifest, ignores unknown fields safely,
  preserves unknown extension data when rewriting, and exposes release metadata.
- **OMD Validator:** verifies the complete core manifest, paths, structure,
  checksums, and audio-profile requirements.
- **OMD Player:** fulfills the Reader and Validator requirements and plays every
  codec permitted by the stable core format.
- **OMD Producer:** creates deterministic conforming releases and accurately
  measures and records core audio facts.
- **OMD Writer:** writes one unpacked release to a supported physical binding and
  verifies its contents by reading them back.

A product may claim one or more roles. Official extensions define their own
capability requirements. Products declare supported extensions, such as static
artwork, animated artwork, lyrics, or music video, without creating a moving
Full profile or weakening core playback conformance.

### One physical medium, one release

Every physical OMD medium contains exactly one music release. This applies to an
optical disc and the future cartridge. The package remains directly discoverable
at the medium root, with no `OMD-VOLUME.json` wrapper or `RELEASES/` collection
layer.

This preserves the physical-album interaction:

- One object has one identity, title, artist, and artwork.
- Insertion unambiguously selects the release and may start playback.
- Players do not need a collection browser merely to read physical media.
- Burn, verify, rip, recovery, capacity, and labeling workflows operate on one
  release.

An ordinary folder, USB device, SD card, or other storage location may contain
many standalone `.omd` files or package directories. Applications may scan that
location as a library, but the storage device does not become a special
multi-release OMD volume and requires no OMD index.

Multi-release physical media, box sets, and anthologies are deferred. They may
later use an optional collection extension or a separate binding profile if a
concrete workflow justifies the additional discovery, playback, integrity, and
UI rules. Core players are not required to support them.

### Directory and single-file representations

The standard preserves the inspectable directory representation and adds a
single-file `.omd` representation for transfer, download, library storage, and
sharing. Both representations contain exactly one release and preserve the same
identity and integrity.

A `.omd` file is a deterministic, store-only ZIP64 archive:

```text
album.omd
  OMD-MANIFEST.json
  AUDIO/
  EXTENSIONS/
  CHECKSUMS.sha256
```

The package contents appear directly at the archive root, with no enclosing
directory. `OMD-MANIFEST.json` is the first entry. ZIP64 permits releases larger
than 4 GB. Entries use normalized paths, ordering, timestamps, and permissions
so the same package produces the same archive bytes.

Archive entries are stored without ZIP compression. Audio, images, and video are
normally already compressed, and store-only output avoids codec-dependent
archive results while supporting simple readers. Ordinary ZIP tools can inspect
and extract the release.

Readers must reject absolute paths, parent traversal, duplicate names, and
case-colliding paths. Extracting a `.omd` file must produce a directory package
that validates identically. Physical media contains the unpacked package at its
root so minimal physical players do not require ZIP support.

### Forward-compatible fields and extensions

Readers must not reject a compatible package solely because it contains fields
they do not recognize.

The first stable compatibility policy should require:

- Readers ignore unknown fields they do not need.
- Validators warn about unknown fields rather than failing package validity.
- Tools that read and rewrite a manifest preserve unknown fields when practical.
- Optional official and third-party capabilities use one namespaced `extensions`
  object to prevent collisions with present and future standard fields.
- Required behavior is determined by the declared format version and profile,
  not by the mere presence of an unknown field.

Official extensions use the `org.openmediadisc.*` namespace and have published
specifications and schemas. Community and vendor extensions use a namespace they
control, preferably in reverse-domain form. Each extension versions its own
contract independently.

Extensions are always optional and safely ignorable. A reader that does not
understand one must still be able to identify, verify, and play the core music
release. A capability that is necessary for core playback belongs in the core
format or a declared conformance profile, not in an extension.

Small extension metadata may live inline in the manifest. Larger assets may be
referenced from a standardized `EXTENSIONS/<namespace>/` path and remain covered
by the package checksums. Tools validate extensions they understand, warn about
unknown extensions at most, and preserve unknown extension data when practical.

For example:

```json
{
  "extensions": {
    "org.openmediadisc.edition": {
      "version": "1.0.0",
      "name": "2026 Tour Edition",
      "number": 7,
      "total": 50
    }
  }
}
```

Edition numbering is metadata, not proof of authenticity. A future provenance
extension may define signatures, but unsigned extension data must not be
presented as verified.

Cover and additional artwork belong to an official, optional
`org.openmediadisc.artwork` extension. Artwork is strongly recommended because
it is central to the physical album experience, but a package without it remains
a conforming, playable OMD release. Full-featured OMD players should support the
official artwork extension; minimal readers may safely ignore it.

The artwork extension may describe static and animated assets with standardized
roles. A player chooses the richest asset it supports and falls back to the
static cover. Animated cover art belongs in this same extension rather than a
separate capability.

The exact major/minor compatibility rules and extension schema-discovery
mechanism remain to be designed. Validators must not require network access to
interpret a package.

The proposed audio-presentations extension is different from optional artwork:
whether it may contain the only playable mix determines whether a reader can
ignore it and still play audio. Distinguish *safe to parse and skip unknown
metadata* from *guaranteed playable on a particular device*. This is an
intentional revision of earlier universal-playback expectations, not an
implementation detail to assume away.

## Open design questions

The discussion must still settle:

1. Codec-neutral gapless playback fields and behavior.
2. Rich supporting-media paths, metadata, and playback expectations.
3. Audio regions for continuous mixes and chapter-like
   content.
4. Replacement of the draft `OMD-FLAC-DATA` identifier throughout the private
   implementation and fixtures.
5. The version number and compatibility contract for the first stable format.
6. Multi-presentation manifest schema, file layout, track mapping, gapless
   behavior and package identity after optional-mix removal.
7. Whether conforming releases must include a core-compatible presentation or
   can be advanced-only with explicit device-capability requirements.
8. Runtime playback selection, channel mapping, headphone binaural rendering,
   immersive bitstream passthrough, and negotiation/failure behavior.
9. Storage, decoder, platform, licensing and conformance tests for the
   preferred model versus bundled, single-master, scalable and pre-rendered
   alternatives.
