# Product context for AI agents

This file is **agent-facing background**, not user documentation. It captures the
"why" behind Open Media Disc so agents make decisions that match the project's
intent. It is intentionally kept out of the README, which should stay short and
developer-focused. The public-facing version of this vision lives in
[`documentation/what-is-omd.md`](../../documentation/what-is-omd.md); keep the two
aligned when the vision changes.

## The core idea

A recorded blank should feel like a legitimate album object, not a homemade
substitute. OMD gives owned digital albums a satisfying physical form using
commodity 8cm DVD-RW media, in the spirit of MiniDisc or UMD.

## The mental model that guides decisions

**The cartridge is the format; the DVD-RW is the storage layer.** Reason about the
project in layers, and prove each layer before moving to the next:

1. The **package format** (manifest + audio + checksums). This is v0.1.
2. The **media loop** (burning to and reading from 8cm DVD-RW).
3. The **cartridge shell** and dedicated player/writer hardware.

Everything downstream (Raspberry Pi players, a writer dock, a cartridge-native
drive, multi-language SDKs, OMD Studio) depends on the format being stable,
inspectable, and verifiable first. When unsure, protect the format's stability
and recoverability over convenience.

## Why v0.1 is a FLAC data package (and only that)

- A solid, verifiable album package unblocks every future tool without drift.
- FLAC-in-a-data-package is simple to author, validate, and parse, including on
  future embedded players.
- Plain files (FLAC, JSON, SHA-256) stay recoverable with ordinary tools and are
  never locked inside a proprietary silo.
- DVD-Audio is optimized for authored audiophile releases and niche players, so
  it is not the native format. It may become an optional export mode later.

## Scope boundaries for v0.1 (assume these unless told otherwise)

In scope: read an owned FLAC album folder, normalize track order/metadata/
filenames, emit `OMD-MANIFEST.json` + cover art + `CHECKSUMS.sha256`, and
validate structure, tracks, checksums, and 8cm DVD-RW capacity (~1.4 GB).

Out of scope: optical burning, UDF/ISO image creation, Raspberry Pi device
services, hardware control, cartridge mechanics, GUI/desktop/mobile apps, cloud
accounts, DRM, DVD-Audio/Blu-ray authoring, marketplace features, and streaming
integration. v0.1 makes the format real, nothing more.

## Guiding principles (apply when making design calls)

- **Spec first, implementation second.** Interoperability decisions live in
  `spec/` before code.
- **The disc stays recoverable.** The format must be debuggable outside its own
  ecosystem with ordinary tools.
- **Album-first, not folder-first.** A player reads the manifest and shows an
  album, never a file browser.
- **Deterministic and verifiable.** Same input produces the same output; every
  package carries checksums.
- **Do not block on the hard part.** Cartridge mechanics come only after the
  software and media loop are proven.

## Ethics

OMD is for music the user owns. Never help use OMD to distribute music the user
does not own.
