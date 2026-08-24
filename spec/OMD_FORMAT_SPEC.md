# OMD Format Specification

**Open Media Disc (OMD)** (Format version `0.1.0`)
Format identifier: `OMD-FLAC-DATA`

> Status: Draft. This document defines the on-disc and on-package contract for OMD. The
> **package format is version `0.1.0`**. The disc-image and burn/verify layer (section 3)
> was added for the v0.2 software without changing the 0.1.0 draft package contract. The
> contract is intentionally minimal so multiple language SDKs and future hardware
> players can implement it without ambiguity.
> OMD has not had a stable format release; this private draft may change without
> backward compatibility.

## 1. What Open Media Disc Is

Open Media Disc is an open-source **physical music format**. An OMD package is a UDF
filesystem of ordinary files (audio, an authoritative JSON manifest, and SHA-256
checksums), so it is a **media-agnostic data format**, not a medium-locked one like CD-DA
or DVD-Audio. The same package can be written to any standard writable optical disc: mini
or standard CD-R/RW, DVD±R/RW, or BD-R/RE. What changes between media is **capacity**,
expressed as a media profile (see section 2.1).

The **8cm DVD-RW is the reference medium** and the default profile. It is the target for
the future album cartridge and balances cost, physical size, and enough room (~1.4 GB) for
many full albums, including typical FLAC releases. The long-term vision is a rewritable optical album cartridge
inspired by MiniDisc and UMD, built on commodity 8cm DVD-RW media, standard digital audio,
open metadata, and eventually dedicated Raspberry Pi-based player and writer hardware.

The **cartridge is the format**; the disc is the storage layer, and the cartridge is the
only piece tied specifically to 8cm DVD-RW. There is no cartridge yet. The package format
(album folder in, validated OMD package out) is the foundation; the v0.2 software adds the
**media loop**: turning a validated package into a UDF disc image and burning it to a
writable optical disc. The cartridge shell remains future work.

## 2. Format Identity

| Field             | Value                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------- |
| Format name       | Open Media Disc                                                                        |
| Short name        | OMD                                                                                    |
| Data format id    | `OMD-FLAC-DATA` (legacy identifier; packages may use any supported codec)              |
| Format version    | `0.1.0`                                                                                |
| Supported media   | Any standard writable optical disc (CD-R/RW, DVD±R/RW, BD-R/RE), mini or standard size |
| Reference medium  | 8cm DVD-RW (~1.4 GB usable class); default profile and cartridge target                |
| Audio codec       | One per package: FLAC, MP3, AAC, Vorbis, Opus, or WAV                                  |
| Metadata          | `OMD-MANIFEST.json` (authoritative)                                                    |
| Integrity         | `CHECKSUMS.sha256` + per-track SHA-256 in manifest                                     |
| Disc filesystem   | UDF                                                                                    |
| Disc volume label | best-effort rendering of the disc title (see section 3)                                |

### 2.1 Media Profiles

An OMD package is medium-independent; only its **capacity budget** depends on the disc it
targets. A media profile names a medium and its usable capacity. Producers record the
chosen medium in the manifest `mediaType`, and validation checks package size against that
profile's budget (see [`OMD_VALIDATION_RULES.md`](./OMD_VALIDATION_RULES.md)).

| Media profile      | Usable capacity (approx) | Notes                                   |
| ------------------ | ------------------------ | --------------------------------------- |
| Mini CD-R/RW (8cm) | ~210 MB                  | Smallest; short or lower-bitrate albums |
| CD-R/RW (12cm)     | ~700 MB                  | Widely available                        |
| 8cm DVD±R/RW       | ~1.4 GB                  | **Reference profile**; cartridge target |
| DVD±R/RW (12cm)    | ~4.7 GB                  | Long or hi-res albums                   |
| DVD±R DL (12cm)    | ~8.5 GB                  | Dual layer                              |
| BD-R/RE (12cm)     | ~25 GB and up            | Large or high-resolution releases       |

The reference tooling defaults to the 8cm DVD-RW profile, and its burn path currently
targets 8cm DVD-RW on Windows. Imaging, validation, inspection, and playback are
medium-independent and work regardless of the target profile.

## 3. Package, Disc Image, and Burning

An **OMD package** is a plain directory tree on a normal filesystem. It is the unit that
OMD Core creates, validates, and inspects.

Because the package is a plain directory of standard file formats (audio, JSON, JPEG/PNG,
PDF, SHA-256 text), it is always recoverable and inspectable with ordinary tools. This is
a core design principle: **the format must remain debuggable outside its own ecosystem.**

### 3.1 Disc image

The v0.2 software turns a validated package into a burn-ready **disc image**. The image
uses the **UDF** filesystem, and its content **mirrors the package tree exactly**:
`OMD-MANIFEST.json` at the root, the `AUDIO/` directory, `CHECKSUMS.sha256`, and any
`COVER.*` or `BOOKLET.pdf`. No files are added, removed, or renamed. The UDF **logical
volume identifier (volume label) is a best-effort rendering of the disc title**; a disc's
identity is read from the manifest `discId`, never from the volume label. When the title
cannot be stored verbatim, the label degrades in order to an ASCII rendering of the title,
the first track title, the artist, and finally `OMD-<short hash>`, so a burn never fails on
the title alone. Building an image needs no optical hardware, so it can be produced and
inspected on any supported machine.

### 3.2 Burning

OMD can be burned to any supported writable optical medium (section 2.1); the reference
tooling currently targets 8cm DVD-RW on Windows. Before writing, a non-empty rewritable
disc **MUST be blanked** so the result contains only the OMD package. The burned disc is a
plain UDF filesystem readable with ordinary tools, preserving recoverability.

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

- `OMD-MANIFEST.json`: required, at package root. The album table of contents.
- `CHECKSUMS.sha256`: required. Standard `sha256sum`-style file for the whole package.
- `AUDIO/`: required. Audio tracks (all one codec), numbered in playback order.
- `COVER.jpg` / `COVER.png`: recommended cover art at the root.
- `BOOKLET.pdf`: optional.

## 5. Manifest

The manifest is the bridge between a generic data folder and a dedicated album object.
It is authoritative: a player reads it first and presents album mode rather than a folder
browser. The machine-checkable contract is [`OMD_MANIFEST_SCHEMA.json`](./OMD_MANIFEST_SCHEMA.json)
(JSON Schema draft-07). See the schema for exact field types and constraints.

All tracks in a package share a single `audioCodec` (one of `FLAC`, `MP3`, `AAC`, `Vorbis`,
`Opus`, `WAV`); mixed-codec packages are not permitted. The codec is chosen when the package
is created and every track file uses the matching extension.

Each track may carry optional per-track `artist`, `album`, and `year` fields. These are
written only when they differ from the album-level values, so ordinary single-artist albums
stay uncluttered while compilations (e.g. a "Various Artists" mix) can name each track's
own artist.

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
  did not change the draft package contract, so `omdVersion` stays `0.1.0`.
- Library and CLI package versions follow independent semantic versioning and MUST NOT
  imply a format change.

Version 0.1.0 is a private, pre-stable draft. Producers and consumers have no
backward-compatibility obligation until OMD declares its first stable format.

Producers MUST write `omdFormat: "OMD-FLAC-DATA"` and `omdVersion: "0.1.0"`. Consumers
SHOULD reject an unknown `omdFormat` and SHOULD warn on a newer `omdVersion` they do not
understand.

## 7. Why a Data Format, Not CD-DA or DVD-Audio

OMD is a UDF **data disc**, so it will not play in a Red Book CD player, and that is by
design. CD-DA and DVD-Audio lock audio into medium-specific structures that are hard to
recover and tied to one disc type. OMD instead stores ordinary files, which is what makes
it media-agnostic and recoverable on any computer optical drive. DVD-Audio remains an
optional future export mode, not the native OMD format. OMD optimizes for cheap,
repeatable, personal album writing/rewriting with directly recoverable files.
A small, explicit set of ordinary audio codecs keeps the format straightforward to author,
validate, recover, and parse on future embedded players.

## 8. Out of Scope

Optical burning and UDF image creation are addressed by the v0.2 software (see section 3).
Still out of scope: Raspberry Pi device services, hardware control beyond writing a disc,
cartridge mechanics, GUI/desktop/mobile apps, cloud accounts, DRM, DVD-Audio/Blu-ray
authoring, and streaming integration. The foundation remains: owned album folder in,
verified OMD package out, now optionally burned to a verified writable optical disc.
