# Project status

A high-level snapshot of what is built today and what is left, measured against
the goals in the [Roadmap](./roadmap.md). For the vision behind the project, see
[What is OMD?](./what-is-omd.md).

> Stability note: all current format and software versions are private,
> pre-stable development milestones. The draft format may change without
> backward compatibility until the first stable format release.

> Scope note: this page tracks the state of the **software** milestones. Hardware
> milestones are described in the [Roadmap](./roadmap.md) and are currently
> parked.

## In one line

Open Media Disc (OMD) is an open-source physical music format. The v0.1 format
turns a folder of owned audio files into a verified, self-describing album
package using one of six draft codecs. The v0.2 release, **Write and Play**, adds
building a UDF disc image, burning a package to 8cm DVD-RW and verifying it
(Windows), and playback with mpv or ffplay. **OMD Studio**, the desktop and touch
app, is implemented at the internal `studio-v0.2.0` milestone, including its
touch-first redesign. The project is now choosing its next set of software
milestones.

## What is implemented (through v0.2 and OMD Studio)

The repository delivers a working pnpm and TypeScript monorepo in four layers:

- **The normative format contract** in [`spec/`](../spec): `OMD_FORMAT_SPEC.md`,
  `OMD_DISC_LAYOUT.md`, `OMD_VALIDATION_RULES.md`, and `OMD_MANIFEST_SCHEMA.json`.
  The spec is the source of truth the code and docs follow. Format id is
  `OMD-FLAC-DATA`, version `0.1.0`; the legacy id does not make packages
  FLAC-only. The draft permits FLAC, MP3, AAC, Vorbis, Opus, or WAV, one per
  package.
- **The core SDK** `@open-media-disc/core` ([`packages/core`](../packages/core))
  covering the full package lifecycle:
  - `createPackage`, `validatePackage`, `inspectPackage`.
  - Manifest create, parse, and validate (Zod plus JSON Schema), SHA-256
    checksums, audio metadata reading, optional FFmpeg conversion, filename
    normalization, and 8cm DVD-RW disc-size estimation (about a 1.4 GB budget).
- **The `omd` CLI** `@open-media-disc/cli` ([`packages/cli`](../packages/cli))
  with commands `create`, `validate`, `inspect`, `checksum`, `image`, `burn`, and
  `play` (real playback via mpv/ffplay), plus `--help` and `--version` and a
  0/1/2 exit-code convention.
- **Supporting assets:** synthetic FLAC example fixtures generated via
  `pnpm gen:examples`, a passing Vitest suite, and clean lint. The public docs
  live in [`documentation/`](./README.md).

End to end, you can build a package from an album folder, validate its structure,
tracks, checksums, and capacity, inspect it, build a burn-ready UDF image, burn
and verify it on Windows, and play the album.

## Codec status

- **Current contract:** private draft `omdVersion` 0.1.0 permits FLAC, MP3, AAC,
  Vorbis, Opus, or WAV packages, with one codec shared by all tracks.
- **Current tooling:** Core recognizes those six source families and can convert
  between them when a caller supplies FFmpeg. OMD Studio bundles FFmpeg and
  presents all six package targets. `omd create` does not convert: it chooses the
  most common source codec and skips files in the others, so its source folder
  should use one codec.
- **Planned first stable contract:** FLAC and MP3 package codecs. The planned
  Studio importer automatically maps additional source formats into one of
  those two. This has not been implemented and is not part of draft v0.1.0.

See [Package Format](./package-format.md#codec-status) for the full distinction
between package codecs and import formats.

## What is left (per the roadmap)

Core v0.1, v0.2 Write and Play, and OMD Studio (alpha) are done. Everything below
builds outward from the proven format, media loop, and app.

| Milestone | Goal | Status |
| --- | --- | --- |
| Write and Play (v0.2) | Burn a package to 8cm DVD-RW and play it back from the CLI | Done |
| OMD Studio (alpha) | Desktop and touch app wrapping the core: import, package, label, burn, play, rip | Done |
| Next software milestones | Growing the OMD ecosystem: SDK, spec, apps, integrations, accessibility | Being planned |
| Multi-language SDKs | Shared conformance fixtures across TS (later Rust) | Planned |
| Writer Dock | Device: erase, burn, verify, eject 8cm DVD-RW | Parked |
| Pi Player | Raspberry Pi device that plays bare OMD discs | Parked |
| OMD Deck | Component-style home-audio player | Parked |
| Portable player | Battery, MiniDisc-style handheld | Parked |
| Cartridge-native | 8cm DVD-RW inside a serviceable cartridge shell | Parked |

Still **out of scope**: cartridge mechanics, cloud accounts, DRM,
DVD-Audio/Blu-ray authoring, marketplace features, and streaming playback
integration.

## The gap in plain terms

- **Done (v0.1):** the software format and its tooling (spec, SDK, CLI, docs, tests).
  The "album folder in, verified package out" loop.
- **Done (v0.2):** the host-side media loop: building a burn-ready UDF image,
  burning a package to 8cm DVD-RW and verifying it (Windows), and playback via
  mpv/ffplay.
- **Done (OMD Studio):** the desktop and touch app that puts the whole loop
  behind a UI, including labels and verified ripping.
- **Outstanding:** a manual burn-and-play acceptance test of the redesigned app
  on real hardware.
- **Being planned:** the next set of software milestones, aimed at growing the
  OMD ecosystem (cross-platform burning, conformance and other-language SDKs, new
  apps and surfaces, integrations, and accessibility).
- **Parked:** dedicated hardware (a writer dock, a Pi player, the cartridge
  shell).

The main known limitation today is that **burning is Windows-only**, which blocks
Linux and macOS users and every future hardware device.

## Keep this page current

Update this page whenever a milestone's status changes or a new public surface
lands, in the same change as the code. It should always reflect the real state of
the repository.
