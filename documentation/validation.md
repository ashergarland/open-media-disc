# Validation Guide

`omd validate` (and `validatePackage()`) check a package against the OMD v0.1
rules and report findings with a **severity** and a stable **code**. This page
explains each result and how to fix it.

> The normative source is [`spec/OMD_VALIDATION_RULES.md`](../spec/OMD_VALIDATION_RULES.md).

## Severities

| Severity | Meaning |
| --- | --- |
| `error` | The package is **invalid**. Fix before using or burning. |
| `warning` | Usable, but violates a recommendation or risks a problem. |
| `info` | Informational only. |

A package is **VALID** when it has zero `error` results. `--strict` (or
`{ strict: true }`) promotes a capacity overflow to an error.

## Error codes

| Code | What went wrong | How to fix |
| --- | --- | --- |
| `MISSING_MANIFEST` | No `OMD-MANIFEST.json` at the package root. | Recreate the package with `omd create`, or add the manifest. |
| `MANIFEST_PARSE_ERROR` | The manifest is not valid JSON. | Fix the JSON syntax or regenerate the package. |
| `MANIFEST_SCHEMA_ERROR` | The manifest doesn't match the schema. | Correct the offending field(s); see the reported path. |
| `UNSUPPORTED_FORMAT` | `omdFormat` is not `OMD-FLAC-DATA`. | Use a supported format id. |
| `MISSING_CHECKSUMS_FILE` | No `CHECKSUMS.sha256`. | Run `omd checksum <dir> --write`. |
| `MISSING_AUDIO_DIR` | No `AUDIO/` directory. | Ensure tracks live under `AUDIO/`. |
| `MISSING_TRACK_FILE` | A manifest track file doesn't exist. | Restore the file or fix the manifest path. |
| `TRACK_NOT_FLAC` | A listed track isn't a FLAC file. | Replace with a valid FLAC (must start with `fLaC`). |
| `DUPLICATE_TRACK_NUMBER` | Two tracks share a `number`. | Give each track a unique number. |
| `TRACK_COUNT_MISMATCH` | `trackCount` ≠ `tracks.length`. | Regenerate the manifest so counts match. |
| `CHECKSUM_MISMATCH` | A file's SHA-256 differs from the recorded value. | The file changed after checksums were written; re-run `omd checksum --write` or restore the file. |
| `CHECKSUM_MISSING_ENTRY` | A package file has no checksum entry. | Regenerate `CHECKSUMS.sha256` with `omd checksum --write`. |

## Warning codes

| Code | Meaning | How to address |
| --- | --- | --- |
| `MISSING_COVER_ART` | No cover art referenced. | Add `cover.jpg`/`cover.png` to the source and recreate. |
| `COVER_ART_NOT_FOUND` | `coverArt` set but file missing. | Add the file or clear the field. |
| `CAPACITY_WARNING` | Package exceeds the ~1.4 GB 8cm DVD-RW budget. | Reduce size (e.g. downsample FLAC) or plan a multi-disc set. Becomes an error in strict mode. |
| `NON_PORTABLE_FILENAME` | A filename isn't cross-platform safe. | Rename to remove illegal characters. |
| `OS_JUNK_FILE` | An OS artifact is present (`.DS_Store`, `Thumbs.db`, `__MACOSX/`). | Remove it before packaging. |
| `UNKNOWN_OMD_VERSION` | Manifest `omdVersion` is newer than this tool. | Update your OMD tooling. |

## Validation order

Checks run in this order and short-circuit on fatal structural problems:

1. **Structure**: manifest present, parseable, schema-valid; `CHECKSUMS.sha256`
   present; `AUDIO/` present.
2. **Format**: `omdFormat` supported, `omdVersion` known.
3. **Tracks**: files exist, are FLAC, unique numbers, count matches.
4. **Integrity**: recompute SHA-256 and compare to the manifest and
   `CHECKSUMS.sha256`.
5. **Metadata & portability**: cover art, filenames, OS junk.
6. **Capacity**: total size versus the media budget.

## Example: an intentionally invalid package

The repo ships an example that fails on purpose:

```bash
pnpm omd validate ./examples/invalid-omd-album
```

```text
OMD Package: INVALID
...
Checksums: FAIL

  error [CHECKSUM_MISMATCH] Checksum mismatch for AUDIO/02 - Test Tone Alpha.flac
  error [CHECKSUM_MISMATCH] Manifest sha256 mismatch for AUDIO/02 - Test Tone Alpha.flac
```

Compare with the passing [`examples/valid-omd-album`](../examples/valid-omd-album).
