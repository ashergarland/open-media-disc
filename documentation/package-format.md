# Package Format

An **OMD package** is a plain directory tree of standard file formats. It is the
unit OMD Core creates, validates, and inspects — and the thing a future writer
tool will burn to an 8cm DVD-RW.

> This page is the friendly overview. The **normative** contract is in
> [`spec/OMD_FORMAT_SPEC.md`](../spec/OMD_FORMAT_SPEC.md),
> [`spec/OMD_DISC_LAYOUT.md`](../spec/OMD_DISC_LAYOUT.md), and
> [`spec/OMD_MANIFEST_SCHEMA.json`](../spec/OMD_MANIFEST_SCHEMA.json).

## Anatomy

```text
/OMD-MANIFEST.json     required     Album metadata + track table (authoritative)
/COVER.jpg             recommended  Cover art (COVER.png also accepted)
/BOOKLET.pdf           optional     Liner notes / booklet
/AUDIO/                required     FLAC tracks, numbered in playback order
  01 - Track Name.flac
  02 - Track Name.flac
  03 - Track Name.flac
/CHECKSUMS.sha256      required     sha256sum-style integrity file for the package
```

| File / folder | Required | Purpose |
| --- | --- | --- |
| `OMD-MANIFEST.json` | Yes | The album table of contents. Read first by any player. |
| `AUDIO/` | Yes | FLAC audio files, in playback order. |
| `CHECKSUMS.sha256` | Yes | SHA-256 for every package file (integrity). |
| `COVER.jpg` / `COVER.png` | Recommended | Cover art, referenced by the manifest. |
| `BOOKLET.pdf` | Optional | Booklet / liner notes. |

## Identity

| Field | Value |
| --- | --- |
| Format name | Open Media Disc |
| Data format id | `OMD-FLAC-DATA` |
| Format version | `0.1.0` |
| Audio codec | FLAC |
| Target medium | 8cm DVD-RW (~1.4 GB usable) |
| Target filesystem (future burn) | UDF (or ISO9660+UDF) |

## The manifest

`OMD-MANIFEST.json` is authoritative: it defines album metadata, track order,
relative paths, sizes, and per-track checksums. A player reads it first and
presents an album, not a folder.

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
    }
  ],
  "createdAt": "2026-07-08T00:00:00.000Z",
  "generator": { "name": "OMD CLI", "version": "0.1.0" }
}
```

### Field reference

| Field | Type | Notes |
| --- | --- | --- |
| `omdFormat` | string | Always `OMD-FLAC-DATA` in v0.1. |
| `omdVersion` | string | Format contract version, e.g. `0.1.0`. |
| `discId` | string | Stable id like `OMD-000001`. |
| `mediaType` | string | Target medium, default `8cm DVD-RW`. |
| `filesystemTarget` | string | `UDF`, `ISO9660`, or `ISO9660+UDF`. |
| `artist`, `album` | string | Album identity. |
| `releaseYear` | integer | Optional. |
| `audioCodec` | string | Always `FLAC` in v0.1. |
| `trackCount` | integer | Must equal `tracks.length`. |
| `totalDurationSeconds` | number | Sum of track durations. |
| `totalSizeBytes` | integer | Sum of track sizes. |
| `coverArt` | string | Optional relative path (e.g. `COVER.jpg`). |
| `booklet` | string | Optional relative path (e.g. `BOOKLET.pdf`). |
| `tracks[]` | array | Ordered tracks; see below. |
| `createdAt` | string | ISO-8601 UTC timestamp. |
| `generator` | object | `{ name, version }` of the producing tool. |

Each `tracks[]` entry has `number`, `title`, `filename` (an `AUDIO/*.flac`
relative path), optional `durationSeconds`, `sizeBytes`, and `sha256`.

## Path rules (summary)

- Exactly one `OMD-MANIFEST.json` at the package root.
- Every track `filename` is `AUDIO/<name>.flac`.
- The authoritative order is the manifest `number`, not the filename.
- Filenames must be cross-platform safe; OS junk (`.DS_Store`, `Thumbs.db`,
  `__MACOSX/`) must not be present.
- `CHECKSUMS.sha256` lists every file except itself, one `"<hex>  <path>"` line
  each, using forward slashes.

See [`spec/OMD_DISC_LAYOUT.md`](../spec/OMD_DISC_LAYOUT.md) for the full rules.

## Versioning

OMD keeps **format** and **software** versions separate. `omdFormat` +
`omdVersion` describe the on-disc contract; library and CLI versions move
independently and never imply a format change. A format change (new required
field, layout change, or validation-semantics change) is a deliberate
`omdVersion` bump.

## Why plain files?

Because the package is standard JSON, FLAC, JPEG/PNG, PDF, and SHA-256 text, it
is always recoverable and inspectable with ordinary tools. Keeping the format
debuggable outside its own ecosystem is a core design principle.
