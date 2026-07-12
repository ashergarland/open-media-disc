# OMD Disc Layout

**Open Media Disc (OMD)** (Format version `0.1.0`)

This document defines the required and optional paths in an OMD package. The layout is the
same whether the package lives in a build folder or is later burned to an 8cm DVD-RW.

## 1. Canonical Tree

```text
/OMD-MANIFEST.json     required   Album metadata + track table (authoritative)
/COVER.jpg             recommended  Cover art (COVER.png also accepted)
/BOOKLET.pdf           optional   Liner notes / booklet
/AUDIO/                required   Directory of FLAC tracks in playback order
  01 - Track Name.flac
  02 - Track Name.flac
  03 - Track Name.flac
/CHECKSUMS.sha256      required   sha256sum-style integrity file for the package
```

## 2. Path Rules

- **Root manifest.** `OMD-MANIFEST.json` MUST exist at the package root. There is exactly
  one manifest per package.
- **Audio directory.** All audio MUST live under `AUDIO/`. Every manifest track
  `filename` MUST be a relative path of the form `AUDIO/<name>.flac`.
- **Track ordering.** Track files SHOULD be named with a zero-padded, ordered numeric
  prefix (`01 - `, `02 - `, ...). The authoritative order is the `number` field in the
  manifest, not the filename.
- **Cover art.** Cover art is strongly recommended. Accepted root filenames when detected
  from a source folder: `cover.jpg`, `cover.png`, `folder.jpg`, `front.jpg`. In the
  package it is normalized to `COVER.jpg` or `COVER.png` and referenced by the manifest's
  `coverArt` field.
- **Checksums.** `CHECKSUMS.sha256` MUST list every file in the package except itself,
  using standard `"<hex>  <relative/path>"` lines (two spaces, forward slashes).
- **No OS junk.** Packages MUST NOT contain hidden OS artifacts (`.DS_Store`, `Thumbs.db`,
  `__MACOSX/`, etc.). Producers strip them; validators warn if present.
- **Filenames.** Filenames MUST be cross-platform safe (no `\\ / : * ? " < > |`, no
  trailing dots/spaces, no reserved device names). Producers normalize; validators warn.

## 3. Capacity Target

The target medium is 8cm DVD-RW. OMD Core uses a usable capacity budget of
**1,400,000,000 bytes (~1.4 GB)** by default. Packages that exceed this budget produce a
capacity warning (or an error in strict mode). See
[`OMD_VALIDATION_RULES.md`](./OMD_VALIDATION_RULES.md).

## 4. Reserved / Ignored

A consumer (player) SHOULD ignore files it does not recognize unless a debug mode is
enabled. Future format versions may reserve additional root paths; v0.1 producers SHOULD
NOT emit files outside the tree above.

## 5. Disc Image (UDF)

When a package is burned (v0.2 software), it is written as a **UDF** filesystem whose
content mirrors the tree in section 1 exactly, with no files added, removed, or renamed.
The UDF **volume label MUST be the package `discId`** (for example `OMD-000001`). A
non-empty rewritable disc is blanked before writing, so it contains only the OMD package.
After writing, the disc is verified by re-checking `CHECKSUMS.sha256` against the files on
the disc; a burn succeeds only if verification passes. The burned disc stays a plain,
browsable UDF filesystem, preserving recoverability.
