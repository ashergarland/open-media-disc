# OMD vNext Proposal: Audio Presentations and Adaptive Playback

**Status:** Proposed format revision; design intent accepted, implementation and conformance details under investigation.
**Decision date:** 2026-10-28
**Discussion:** [Issue #1](https://github.com/ashergarland/open-media-disc/issues/1)
**Current implemented contract:** OMD `omdVersion` 0.1.0, unchanged by this document.

This proposal is **not yet normative**. It documents a revision of the intended next OMD format, not new behavior that existing readers, validators, CLI tools, or Studio builds implement. Promote it into the normative spec, JSON Schema, validation rules, fixtures, tools, and public documentation together after technical validation.

## 1. Design decision

**The next OMD format shall allow a publisher to package multiple independently authored audio presentations of one music release.** It must no longer impose one codec, sample rate, channel count, or mastering profile across the *entire release*. Such uniformity can still be required *within an individual presentation* where that is useful for decoding, verification, and gapless playback.

An audio presentation may be a stereo master, a discrete 4.0 / 5.0 / 5.1 / 7.1 mix, or an immersive-format master. The publisher selects which presentations to include; OMD does not require a distinct file for every possible listening device.

The format shall separate:

- **Release:** the authored musical work, its track/segment organization, credits, and identity.
- **Presentation:** a concrete supplied mix/master with declared codec, container, channel/spatial characteristics, track mapping, and media assets.
- **Output rendering:** playback-time adaptation for a connected device, such as stereo downmix, binaural headphone rendering, channel-layout adaptation, format-compatible decoding, or immersive passthrough.
- **Package representation:** the particular verified set of assets written to a folder, a portable `.omd` archive, an optical disc, or other binding.

Different presentations can be artistically distinct. A computed downmix must not be labeled or treated as the artist's independently mastered stereo version.

## 2. Publisher control and optional space optimization

A publisher may include one or more source presentations. An editor may remove selected presentations to make a smaller derived package, provided the operation:

1. Explicitly identifies which mix(es) will be removed and what playback capabilities will be lost.
2. Does not transcode or modify retained original masters unless a separate, explicitly authorized conversion is requested.
3. Updates every manifest reference and index; deletes unreferenced assets only when safe.
4. Rebuilds `CHECKSUMS.sha256`, validates the entire package, and verifies the target binding after writing.
5. Provides an intelligible warning when the removed presentation has unique artistic content or leaves the release unplayable on target devices.
6. Does not claim that generated stereo/binaural outputs are included when they exist only as playback-time processing.

The optimization tool must not silently remove original mixes or misrepresent what remains on disc. A complete archival package and a smaller playback-oriented package can be equally intentional publisher choices.

## 3. Manifest extension and capability model

Use the already planned versioned, namespaced `extensions` mechanism, with a possible official identifier `org.openmediadisc.audio-presentations`. The exact schema and version are undecided.

Each presentation must be independently identifiable and report its measured or verified technical facts, relevant track mapping, assets, and playback requirements. Candidate fields:

- Stable presentation ID, label and role, e.g. original stereo mix or artist-authored surround mix.
- Codec and container, sample rate, bit depth where defined, channel count and explicit standardized channel layout, or immersive/spatial format.
- Track or continuous-program mapping, exact boundaries, durations, path references and any gapless transition metadata.
- Required decoder, output and rendering capabilities, distinguishing direct decoding, passthrough and conversion.
- Optional preference or default-selection hints supplied by the publisher.
- Integrity inherited from the package-level checksums, not invented codec-level quality scores.

### Illustrative non-normative manifest fragment

```json
{
  "format": "org.openmediadisc.release",
  "version": "<future-format-version>",
  "title": "Example Album",
  "albumArtist": "Example Artist",
  "tracks": [
    { "number": 1, "title": "Opening", "artist": "Example Artist", "durationMs": 220000 }
  ],
  "extensions": {
    "org.openmediadisc.audio-presentations": {
      "version": "0.1.0-proposal",
      "presentations": [
        {
          "id": "stereo",
          "label": "Artist Stereo Mix",
          "codec": "FLAC",
          "sampleRateHz": 96000,
          "bitDepth": 24,
          "channelLayout": "2.0",
          "segments": [{ "trackNumber": 1, "path": "AUDIO/STEREO/01.flac" }]
        },
        {
          "id": "surround",
          "label": "Artist 5.1 Mix",
          "codec": "FLAC",
          "sampleRateHz": 96000,
          "bitDepth": 24,
          "channelLayout": "5.1",
          "segments": [{ "trackNumber": 1, "path": "AUDIO/SURROUND/01.flac" }]
        }
      ]
    }
  }
}
```

This is a *shape illustration only*; it is intentionally not a replacement for the current JSON Schema. The final model must avoid ambiguity about the top-level core `audio` field, physical layout, the relationship between the canonical track list and presentation-specific segments, and optional extension requirements.

## 4. Runtime playback and headphone support

The player must first identify presentations and their declared requirements, then compare them with its actual decoder, renderer, and output-device capabilities.

**Preferred behavior to investigate:**

1. If the listener explicitly selected a particular original mix and it is supported, use it without substituting a different mix.
2. Otherwise prefer a supported artist-authored presentation appropriate for the output.
3. If no directly playable match exists, offer supported runtime conversions: e.g. 5.1 -> stereo, 5.1/7.1 -> binaural headphones, 7.1 -> 5.1, resampling, or supported immersive rendering.
4. If proprietary immersive bitstream passthrough is supported, preserve the encoded master and metadata instead of flattening it unnecessarily.
5. If no valid playback path exists, report the incompatibility and available options rather than silently selecting an unsupported path.

Provide a visible signal path: source presentation, actual codec/layout, renderer or conversion performed, and effective output device/layout. Headphone mode must not double-apply spatial processing. The default selection policy, clipping protection, downmix coefficients, head tracking, HRTF selection and quality bounds remain open for experimentation.

**Do not assume every player can decode proprietary Atmos or DTS formats or an IAMF master.** These would be capability-declared implementations or downstream passthrough paths, subject to licensing and device support.

## 5. Compatibility and versioning to resolve

This proposal explicitly **supersedes the planned global one-codec/one-profile-per-release design** for the future format. It does **not** retroactively change `omdVersion` 0.1.0 packages.

The existing next-stable plan also states that every unqualified player must play every core package and that optional extensions are safely ignorable. Multi-presentation packages expose a real tension: a package containing only surround or immersive content may not be playable on a basic stereo-only player.

Evaluate at least two policies before choosing normative requirements:

- **Baseline presentation required:** Every release includes a profile compatible with basic OMD players; optional additional mixes are safely ignored by those players. More predictable, but requires additional storage and may prohibit advanced-only releases.
- **Capability-declared release:** Any release has at least one presentation, which may be surround/immersive only; the format distinguishes *valid package* from *playable on this device*, and requires explicit incompatibility signaling. More flexible and compact, but changes the universal playback promise.

A hybrid profile model may prove preferable. Neither policy is finalized yet. A stereo file must never be silently fabricated and presented as an independently authored artist mix.

Also resolve the relationship between the stable release UUID, package-content identity and checksum set when optional presentations are removed. Preferred principle: removing an optional presentation should not mutate the retained original audio or the underlying artistic identity, but the exact identifier and derivation rules need formal specification.

## 6. Alternatives kept in scope

| Candidate | Advantages | Limitations |
| --- | --- | --- |
| **Multiple optional original mixes + runtime adaptation (preferred)** | Balances artistic fidelity, flexibility, and media size | Decoder negotiation, conformance, and stripping semantics |
| Bundle all discrete versions | Simple and predictable playback | Duplicate data, larger physical media |
| One multichannel FLAC master | Minimal source storage | Downmix differs from dedicated stereo master |
| Single immersive master / IAMF | Potentially flexible speaker and headphone rendering | Player support and lossless implementation must be validated |
| Scalable/layered encoding | Possible space savings | Decoder complexity and faithful mix reconstruction uncertain |
| Pre-rendered stereo / binaural assets | Works on simpler devices | Duplicated storage and maintenance |

Do not build a custom compressed or object-based audio codec merely to support OMD. Test existing FLAC, PCM, IAMF, and optional standard immersive bitstreams first.

## 7. Required feasibility work before normative adoption

- Verify native multichannel FLAC decoding, channel order, interop and PCM output on target runtimes (FFmpeg/mpv, Studio/Electron, Windows, Pi).
- Prototype one multi-presentation package with a stereo and a 5.1 original mix, including checksum validation and exact source selection.
- Prototype optional-mix removal, a derived package, size estimation by CD/DVD/BD carrier, and re-verification.
- Prototype 5.1 -> 2.0 downmix and 5.1 -> HRTF binaural headphones; test channel mapping, clipping, and no double processing.
- Investigate immersive passthrough and IAMF rendering separately. Confirm licensing and real player support instead of inferring compatibility from file extension.
- Test original-versus-derived artistic stereo choice, playback failure behavior, gapless multi-mix program mapping, and release identity.
- Benchmark disc size and CPU/RAM requirements using licensed or synthetic stereo, 5.1, 7.1 and immersive masters.
- Design conformance fixtures covering unknown extensions, unsupported assets, partial stripping, and malformed layout/paths.

**Adoption gate:** revise the normative format specification, manifest schema, disc layout, validation rules, core SDK, CLI, Studio, reference player, fixtures, and user documentation consistently. Determine format-version and extension-version compatibility prior to declaring stability.
