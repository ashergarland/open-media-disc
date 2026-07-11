# OMD Format Specification

**Open Media Disc (OMD)** — Format version `0.1.0`
Format identifier: `OMD-FLAC-DATA`

> Status: Draft. This document defines the on-disc/on-package contract for OMD Core v0.1.
> It is intentionally minimal and stable so multiple language SDKs and future hardware
> players can implement the same format without ambiguity.

## 1. What Open Media Disc Is

Open Media Disc is an open-source **physical music format**. The long-term vision is a
rewritable optical album cartridge inspired by MiniDisc and UMD, built on commodity 8cm
DVD-RW media, FLAC audio, open metadata, and eventually dedicated Raspberry Pi-based
player and writer hardware.

The **cartridge is the format**; the DVD-RW is the storage layer. At v0.1, however, there
is no cartridge and no burning. v0.1 defines only the **software package format**: an
album folder in, a validated OMD package out.

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
| Target filesystem (future burn) | UDF (or ISO9660+UDF hybrid) |

## 3. Package vs. Disc

An **OMD package** is a plain directory tree on a normal filesystem. It is the unit that
OMD Core v0.1 creates, validates, and inspects. A future writer tool will turn a package
into a burn-ready image and write it to an 8cm DVD-RW; that step is **out of scope** for
v0.1.

Because the package is a plain directory of standard file formats (JSON, FLAC, JPEG/PNG,
PDF, SHA-256 text), it is always recoverable and inspectable with ordinary tools. This is
a core design principle: **the format must remain debuggable outside its own ecosystem.**

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

OMD keeps **format** and **software** versions separate:

- `omdFormat` + `omdVersion` describe the on-disc contract. A change to disc layout,
  required fields, or validation semantics is a deliberate format version bump.
- Library and CLI package versions follow independent semantic versioning and MUST NOT
  imply a format change.

v0.1 producers MUST write `omdFormat: "OMD-FLAC-DATA"` and `omdVersion: "0.1.0"`.
Consumers SHOULD reject an unknown `omdFormat` and SHOULD warn on a newer `omdVersion`
they do not understand.

## 7. Why FLAC Data, Not DVD-Audio

DVD-Audio is an optional future export mode, not the native OMD format. OMD optimizes for
cheap, repeatable, personal album writing/rewriting with directly recoverable files.
FLAC-in-a-data-package keeps the format simple to author, validate, and parse on future
embedded players.

## 8. Out of Scope for v0.1

Optical burning, UDF/ISO image creation, Raspberry Pi device services, hardware control,
cartridge mechanics, GUI/desktop/mobile apps, cloud accounts, DRM, DVD-Audio/Blu-ray, and
streaming integration are all explicitly out of scope. v0.1 is: **owned album folder in →
verified OMD package out.**
