# OMD Format Specification

**Open Media Disc (OMD)** — Format version `0.1.0`
Format identifier: `OMD-FLAC-DATA`

> Status: Draft. This document defines the on-disc and on-package contract for OMD. The
> **package format is version `0.1.0`**. The disc-image and burn/verify layer (section 3)
> was added for the v0.2 software and is backward compatible with 0.1.0 packages. The
> contract is intentionally minimal and stable so multiple language SDKs and future
> hardware players can implement it without ambiguity.

## 1. What Open Media Disc Is

Open Media Disc is an open-source **physical music format**. The long-term vision is a
rewritable optical album cartridge inspired by MiniDisc and UMD, built on commodity 8cm
DVD-RW media, FLAC audio, open metadata, and eventually dedicated Raspberry Pi-based
player and writer hardware.

The **cartridge is the format**; the DVD-RW is the storage layer. There is no cartridge
yet. The package format (album folder in, validated OMD package out) is the foundation;
the v0.2 software adds the **media loop**: turning a validated package into a UDF disc
image and burning it to 8cm DVD-RW. The cartridge shell remains future work.

## 2. Format Identity

| Field | Value |
| --- | --- |
| Format name | Open Media Disc |
| Short name | OMD |
| Data format id | `OMD-FLAC-DATA` |
| Format version | `0.1.0` |
| Primary medium (target) | 8cm DVD-RW (~1.4 GB usable class) |
| Audio codec | FLAC |
| Metadata | `OMD-MANIFEST.json` (authoritative) |
| Integrity | `CHECKSUMS.sha256` + per-track SHA-256 in manifest |
| Disc filesystem | UDF |
| Disc volume label | `discId` (e.g. `OMD-000001`) |

## 3. Package, Disc Image, and Burning

An **OMD package** is a plain directory tree on a normal filesystem. It is the unit that
OMD Core creates, validates, and inspects.

Because the package is a plain directory of standard file formats (JSON, FLAC, JPEG/PNG,
PDF, SHA-256 text), it is always recoverable and inspectable with ordinary tools. This is
a core design principle: **the format must remain debuggable outside its own ecosystem.**

### 3.1 Disc image

The v0.2 software turns a validated package into a burn-ready **disc image**. The image
uses the **UDF** filesystem, and its content **mirrors the package tree exactly**:
`OMD-MANIFEST.json` at the root, the `AUDIO/` directory, `CHECKSUMS.sha256`, and any
`COVER.*` or `BOOKLET.pdf`. No files are added, removed, or renamed. The UDF **logical
volume identifier (volume label) MUST be the package `discId`** (for example
`OMD-000001`). Building an image needs no optical hardware, so it can be produced and
inspected on any supported machine.

### 3.2 Burning

The target medium is an 8cm DVD-RW. Before writing, a non-empty rewritable disc **MUST be
blanked** so the result contains only the OMD package. The burned disc is a plain UDF
filesystem readable with ordinary tools, preserving recoverability.

### 3.3 Verification

A burn is complete only after **verification**: the burned disc is read back and every
file is checked against `CHECKSUMS.sha256` and the per-track `sha256` in the manifest, by
the same rules as package validation (see
[`OMD_VALIDATION_RULES.md`](./OMD_VALIDATION_RULES.md)). Verification compares **file
content**, not raw image bytes, so incidental filesystem metadata such as timestamps does
not affect the result.

## 4. Package Contents

See [`OMD_DISC_LAYOUT.md`](./OMD_DISC_LAYOUT.md) for the exact tree. In summary, a valid
package contains:

- `OMD-MANIFEST.json` — required, at package root. The album table of contents.
- `CHECKSUMS.sha256` — required. Standard `sha256sum`-style file for the whole package.
- `AUDIO/` — required. FLAC tracks, numbered in playback order.
- `COVER.jpg` / `COVER.png` — recommended cover art at the root.
- `BOOKLET.pdf` — optional.

## 5. Manifest

The manifest is the bridge between a generic data folder and a dedicated album object.
It is authoritative: a player reads it first and presents album mode rather than a folder
browser. The machine-checkable contract is [`OMD_MANIFEST_SCHEMA.json`](./OMD_MANIFEST_SCHEMA.json)
(JSON Schema draft-07). See the schema for exact field types and constraints.

Example:

```json
{
  "omdFormat": "OMD-FLAC-DATA",
  "omdVersion": "0.1.0",
  "discId": "OMD-000001",
  "mediaType": "8cm DVD-RW",
  "filesystemTarget": "UDF",
  "artist": "Artist Name",
  "album": "Album Title",
  "releaseYear": 2026,
  "audioCodec": "FLAC",
  "trackCount": 2,
  "totalDurationSeconds": 372,
  "totalSizeBytes": 84000000,
  "coverArt": "COVER.jpg",
  "tracks": [
    {
      "number": 1,
      "title": "Track One",
      "filename": "AUDIO/01 - Track One.flac",
      "durationSeconds": 128,
      "sizeBytes": 42000000,
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    },
    {
      "number": 2,
      "title": "Track Two",
      "filename": "AUDIO/02 - Track Two.flac",
      "durationSeconds": 244,
      "sizeBytes": 42000000,
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    }
  ],
  "createdAt": "2026-07-08T00:00:00.000Z",
  "generator": {
    "name": "OMD CLI",
    "version": "0.1.0"
  }
}
```

## 6. Versioning

OMD keeps the **package format**, the **software**, and the **burn/disc-image layer**
versions separate:

- `omdFormat` + `omdVersion` describe the **package contract**: the manifest fields, the
  file tree, and the checksum rules. Bump `omdVersion` only when that package contract
  changes.
- The disc-image and burn/verify layer (section 3) and the library/CLI package versions
  are **independent of `omdVersion`**. Formalizing the UDF burn layer in the v0.2 software
  is additive and backward compatible, so `omdVersion` stays `0.1.0`.
- Library and CLI package versions follow independent semantic versioning and MUST NOT
  imply a format change.

Producers MUST write `omdFormat: "OMD-FLAC-DATA"` and `omdVersion: "0.1.0"`. Consumers
SHOULD reject an unknown `omdFormat` and SHOULD warn on a newer `omdVersion` they do not
understand.

## 7. Why FLAC Data, Not DVD-Audio

DVD-Audio is an optional future export mode, not the native OMD format. OMD optimizes for
cheap, repeatable, personal album writing/rewriting with directly recoverable files.
FLAC-in-a-data-package keeps the format simple to author, validate, and parse on future
embedded players.

## 8. Out of Scope

Optical burning and UDF image creation are addressed by the v0.2 software (see section 3).
Still out of scope: Raspberry Pi device services, hardware control beyond writing a disc,
cartridge mechanics, GUI/desktop/mobile apps, cloud accounts, DRM, DVD-Audio/Blu-ray
authoring, and streaming integration. The foundation remains: owned album folder in,
verified OMD package out, now optionally burned to a verified 8cm DVD-RW.
