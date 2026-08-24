# FAQ

## What is Open Media Disc in one sentence?

An open-source physical music format that turns owned digital albums into
verified, self-describing packages meant for cheap, rewritable optical media
(8cm DVD-RW is the reference medium).

## Is this a backup tool?

No. OMD is an **album format**. It produces album objects with a manifest, cover
art, and checksums, so the disc is presented as an album, not a folder of files.

## Does OMD burn discs?

The v0.1 format is pure software: **album folder in → verified package out**. The
v0.2 tools add imaging and burning to 8cm DVD-RW on Windows (IMAPI2), plus
playback. See the [Roadmap](./roadmap.md).

## Which audio codecs does OMD use?

There are two contracts to keep separate:

- The current private draft (`omdVersion` 0.1.0) permits FLAC, MP3, AAC,
  Vorbis, Opus, or WAV, with exactly one codec in each package.
- The planned first stable format permits FLAC and MP3 packages. Its producer
  plan preserves compatible uniform FLAC or MP3, routes PCM WAV, AIFF, and
  ALAC-family sources to FLAC, and routes AAC/M4A, Vorbis, Opus, and applicable
  mixed sources to MP3.

The stable plan is non-normative and not implemented. AIFF and ALAC are planned
import formats, not package codecs. See
[Package Format](./package-format.md#codec-status) for current tool behavior.

DVD-Audio is optimized for authored disc releases and niche players; OMD uses
ordinary recoverable files and may add DVD-Audio only as a future export mode.

## Can current OMD tools play every draft codec?

They pass audio to the available playback environment. `omd play` uses `mpv`,
`ffplay`, or a player selected by the user. OMD Studio uses Electron/Chromium.
Whether a track decodes therefore depends on that player. The repository does
not currently provide end-to-end playback fixtures for all six draft codecs.

## Why 8cm DVD-RW?

It's the **reference medium**: a cheap, rewritable, commodity optical disc with a
satisfying small-disc/cartridge feel (~1.4 GB usable), which fits many albums,
and it is the target for the future cartridge.

## Can OMD use other discs, like a CD or Blu-ray?

Yes. An OMD package is a UDF filesystem of ordinary files, so it is media-agnostic
and can be written to any standard writable optical disc: mini or standard CD-R/RW,
DVD±R/RW, or BD-R/RE. What changes per medium is capacity (a media profile). 8cm
DVD-RW is the default profile the tools use; other media work as data discs. Only
the future cartridge is tied specifically to 8cm DVD-RW.

## My album is larger than 1.4 GB. What happens?

`inspect` shows it as over budget and `validate` warns (an error with
`--strict`). The package is still created. Prepare smaller files or choose a
medium profile with sufficient capacity; multi-disc sets are future work.

## Can I use the library without the CLI?

Yes. Everything the CLI does is available in
[`@open-media-disc/core`](./sdk-reference.md).

## What does "VALID" actually guarantee?

Zero `error`-severity findings: required files present, manifest schema-valid,
every listed track exists and its extension matches the package's declared
codec, track numbers are unique, counts match, and all checksums verify.
Warnings (like missing cover art) don't affect validity. See the
[Validation Guide](./validation.md).

## Where's the authoritative format definition?

In [`spec/`](../spec). When documentation and spec disagree, the spec wins.
Please report the doc bug.

## Can I distribute music with OMD?

Only music you own the rights to. OMD is for personal, owned-library album
objects. It has no DRM and takes no position on licensing beyond "don't infringe."

## The `omd` command isn't found. Why?

Run `pnpm build` first. The root `pnpm omd` script runs the compiled CLI at
`packages/cli/dist/bin/omd.js`. See [Installation](./installation.md).

## How do I contribute?

See [Contributing](./contributing.md). One rule up front: **code and docs change
together**.
