# OMD Validation Rules

**Open Media Disc (OMD)** — Format version `0.1.0`

This document defines what OMD Core checks when validating a package, and how each result
is categorized. Multiple language SDKs should report equivalent categories so tools behave
consistently.

## 1. Result Severities

| Severity | Meaning |
| --- | --- |
| `error` | The package is **invalid**. A conforming consumer must not treat it as a valid OMD package. |
| `warning` | The package is usable but violates a recommendation or risks a downstream problem (e.g. capacity). |
| `info` | Informational note; does not affect validity. |

A package is **VALID** when it has zero `error` results. Warnings do not make a package
invalid, but strict mode (`strict: true`) promotes capacity overflow to an `error`.

## 2. Error Categories

Each result carries a stable `code` so other implementations can match behavior.

| Code | Category | Condition |
| --- | --- | --- |
| `MISSING_MANIFEST` | structure | `OMD-MANIFEST.json` is absent at the package root. |
| `MANIFEST_PARSE_ERROR` | manifest | Manifest exists but is not valid JSON. |
| `MANIFEST_SCHEMA_ERROR` | manifest | Manifest JSON does not satisfy the manifest schema. |
| `UNSUPPORTED_FORMAT` | manifest | `omdFormat` is not `OMD-FLAC-DATA`. |
| `MISSING_CHECKSUMS_FILE` | structure | `CHECKSUMS.sha256` is absent. |
| `MISSING_AUDIO_DIR` | structure | `AUDIO/` directory is absent. |
| `MISSING_TRACK_FILE` | tracks | A manifest track `filename` does not exist on disk. |
| `TRACK_NOT_FLAC` | tracks | A listed track is not a readable FLAC file (bad magic). |
| `DUPLICATE_TRACK_NUMBER` | tracks | Two or more tracks share the same `number`. |
| `TRACK_COUNT_MISMATCH` | tracks | `trackCount` does not equal `tracks.length`. |
| `CHECKSUM_MISMATCH` | integrity | A file's actual SHA-256 differs from the manifest/`CHECKSUMS.sha256` value. |
| `CHECKSUM_MISSING_ENTRY` | integrity | A package file has no entry in `CHECKSUMS.sha256`. |

## 3. Warning Categories

| Code | Category | Condition |
| --- | --- | --- |
| `MISSING_COVER_ART` | metadata | No cover art present or `coverArt` not set. |
| `COVER_ART_NOT_FOUND` | metadata | `coverArt` is set in the manifest but the file is missing. |
| `CAPACITY_WARNING` | capacity | `totalSizeBytes` exceeds the 8cm DVD-RW budget (default 1.4 GB). Becomes an error in strict mode. |
| `NON_PORTABLE_FILENAME` | portability | A filename is not cross-platform safe. |
| `OS_JUNK_FILE` | portability | An OS artifact (`.DS_Store`, `Thumbs.db`, `__MACOSX/`) is present. |
| `UNKNOWN_OMD_VERSION` | compatibility | `omdVersion` is newer than the validator understands. |

## 4. Validation Order

`validatePackage()` evaluates in this order and short-circuits on fatal structural errors:

1. **Structure** — manifest present, parseable, schema-valid; `CHECKSUMS.sha256` present;
   `AUDIO/` present. A `MISSING_MANIFEST`, `MANIFEST_PARSE_ERROR`, or
   `MANIFEST_SCHEMA_ERROR` stops further track/checksum checks (nothing reliable to check
   against).
2. **Format** — `omdFormat` supported, `omdVersion` known.
3. **Tracks** — each track file exists, is FLAC, numbers are unique, `trackCount` matches.
4. **Integrity** — recompute SHA-256 for each package file and compare to
   `CHECKSUMS.sha256` and the per-track `sha256` in the manifest.
5. **Metadata & portability** — cover art, filenames, OS junk.
6. **Capacity** — compare `totalSizeBytes` to the media budget.

## 5. Capacity Budget

| Constant | Value |
| --- | --- |
| `DVD_RW_8CM_USABLE_BYTES` | `1_400_000_000` (~1.4 GB) |

`estimateDiscSize()` returns the total package size, the budget, the remaining bytes, and a
boolean `overBudget`. In non-strict validation, overflow is a `CAPACITY_WARNING`; in strict
mode it is a `CAPACITY_WARNING`-coded `error`.

## 6. FLAC Recognition

A file is recognized as FLAC when its first four bytes are the ASCII magic `fLaC`
(`0x66 0x4C 0x61 0x43`). v0.1 does not require full FLAC frame decoding for validation; the
STREAMINFO metadata block is parsed opportunistically to populate duration.
