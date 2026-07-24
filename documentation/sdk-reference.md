# SDK Reference

`@open-media-disc/core` is the platform-independent TypeScript SDK for
creating, validating, inspecting, and imaging OMD packages. Building a UDF disc
image uses the operating system's imaging tools (Windows IMAPI2 in v0.2); nothing
extra needs installing.

```bash
pnpm add @open-media-disc/core
```

```ts
import {
  createPackage,
  validatePackage,
  inspectPackage,
} from '@open-media-disc/core';
```

> Types shown here mirror the source in
> [`packages/core/src`](../packages/core/src). When the code changes, this page
> must be updated (see [Contributing](./contributing.md)).

---

## High-level API

### `createPackage(options): Promise<CreatePackageResult>`

Build a normalized OMD package from a source album folder.

```ts
const { outDir, manifest, validation } = await createPackage({
  sourceDir: './Albums/Blank Banshee 0',
  // Optional. discId defaults to the album title; outDir to build/<slug>.
  outDir: './build/OMD-000001',
  discId: 'Blank Banshee 0',
  // optional overrides:
  artist: 'Blank Banshee',
  album: 'Blank Banshee 0',
  releaseYear: 2013,
  budgetBytes: 1_400_000_000,
  generator: { name: 'OMD CLI', version: '0.1.0' },
  createdAt: new Date(), // pass a fixed Date for deterministic output in tests
});
```

`CreatePackageOptions` fields: `sourceDir` (required); `outDir`, `discId`,
`overwrite`, `artist`, `album`, `releaseYear`, `budgetBytes`, `generator`,
`createdAt`, `onProgress` (optional). `discId` is the disc title and defaults to
the resolved album title; `outDir` defaults to `build/<slugified title>`;
`overwrite` replaces an existing folder (otherwise an `OutputExistsError` is
thrown). `onProgress(p)` reports `{ phase: 'reading' | 'processing' |
'finalizing', done, total }` as each track is packaged, for a UI progress bar.
Returns `{ outDir, manifest, validation }`.

### `validatePackage(packageDir, options?): Promise<PackageValidationResult>`

Validate a package directory against the OMD v0.1 rules.

```ts
const result = await validatePackage('./build/OMD-000001', { strict: false });
if (!result.valid) {
  for (const e of result.errors) console.error(e.code, e.message);
}
```

`ValidatePackageOptions`: `budgetBytes?` (default 1.4 GB), `strict?` (promote
capacity overflow to an error). Returns a `PackageValidationResult` with
`valid`, `issues`, `errors`, and `warnings`.

### `inspectPackage(packageDir): Promise<PackageInspection>`

Read a package manifest and return an album/track summary. Throws if the
manifest is missing or invalid; use `validatePackage` for graceful diagnostics.

```ts
const info = await inspectPackage('./build/OMD-000001');
console.log(info.artist, info.album, info.trackCount, info.totalDurationSeconds);
```

### `playlistPaths(packageDir): Promise<string[]>`

Return the package's audio track paths in playback (manifest `number`) order, as
absolute paths. Works for a package folder or a mounted disc.

```ts
const tracks = await playlistPaths('./build/OMD-000001');
```

### `detectMediaKind(targetPath): Promise<'disc' | 'package'>`

Detect whether a path is a mounted optical disc or an ordinary folder (a Windows
drive-type check). Degrades to `'package'` on other platforms or when the medium
cannot be determined.

---

## Disc image API

### `buildDiscImage(options): Promise<BuildDiscImageResult>`

Build a burn-ready **UDF** disc image from a validated package. The image content
mirrors the package tree and its UDF volume label is a best-effort rendering of
the disc title unless overridden. Building an image needs no optical drive.

```ts
const result = await buildDiscImage({
  packageDir: './build/OMD-000001',
  outPath: './build/OMD-000001.img',
  // optional:
  volumeLabel: 'Blank Banshee 0', // defaults to a label derived from the disc title
  validate: true,            // validate the package first (default true)
  // backend: myBackend,     // inject a DiscImageBackend (mainly for tests)
});
// result: { outPath, volumeLabel, sizeBytes, backend }
```

> v0.2 ships a Windows (IMAPI2) backend only. On other platforms `buildDiscImage`
> throws until a backend is available. See the [Roadmap](./roadmap.md).

`resolveDiscImageBackend()` returns the platform backend. `DiscImageBackend` is
the injectable seam: `{ name, isAvailable(), build(request) }`.

Types: `BuildDiscImageOptions`, `BuildDiscImageResult`, `DiscImageBackend`,
`DiscImageBuildRequest`.

---

## Burn API

### `burnImage(options): Promise<BurnImageResult>`

Write a burn-ready image to a disc through a `BurnBackend`, then verify the
result. It probes the disc first, so it handles **rewritable** (DVD-RW, DVD+RW,
BD-RE) and **write-once** (DVD-R, DVD+R, CD-R, BD-R) media correctly and checks
that the image fits the disc capacity before writing. A non-blank rewritable disc
is erased first (unless disabled); a non-blank write-once disc is refused (it
cannot be reused). After writing it remounts the disc in place and reads it back
to check it against `CHECKSUMS.sha256`. A failed verification is reported
(`verified: false`), not thrown. On success the disc is ejected (unless
`eject: false`); a failed burn is left in the drive.

```ts
const result = await burnImage({
  imagePath: './build/OMD-000001.img',
  drive: { mountPath: 'E:\\' },
  backend: myBurnBackend, // a BurnBackend; the Windows backend arrives next
  blank: true,            // blank a non-blank RW first (default true)
  verify: true,           // verify the burned disc (default true)
  eject: true,            // eject on success (default true; false keeps it in)
  onProgress: (p) => console.log(p.phase), // optional live phase reporting
});
// result: { imagePath, drive, blanked, verified, verification?, ejected, media?, backend }
// media: { kind: 'rewritable' | 'write-once' | 'unknown', blank, typeName?, capacityBytes? }
```

### `verifyDisc(mountPath, options?): Promise<PackageValidationResult>`

Verify a mounted disc by validating it as an OMD package (integrity against
`CHECKSUMS.sha256` and the per-track `sha256`). Returns the same result shape as
`validatePackage`.

```ts
const check = await verifyDisc('E:\\');
if (!check.valid) console.error(check.errors);
```

### `burnPackage(options): Promise<BurnImageResult>`

Burn a package directory (imaged to a temporary UDF image first) or a prebuilt
image file to a disc, then verify. Uses the platform burn backend
(`resolveBurnBackend()`) unless a `backend` or `imageBackend` is injected.

```ts
const result = await burnPackage({
  source: './build/OMD-000001', // a package directory or an image file
  drive: { mountPath: 'D:\\' },
  // optional: backend, imageBackend, volumeLabel, blank, verify
});
```

`BurnBackend` is the injectable seam: `{ name, isAvailable(), listDrives(),
isBlank(drive), blank(drive), writeImage(request) }`, plus optional
`probeMedia(drive)` (report media kind, blank state, name, and capacity),
`remount(drive)` (re-read the burned disc in place before verifying), and
`eject(drive)` (the completion eject). `resolveBurnBackend()` returns the platform
backend, and a `BurnDrive` carries the `mountPath` where the disc is read for
verification.

Types: `BurnImageOptions`, `BurnImageResult`, `BurnPackageOptions`, `BurnBackend`,
`BurnDrive`, `BurnImageRequest`, `MediaInfo`, `DiscMediaKind`, `BurnProgress`,
`BurnPhase`.

---

## Rip API

### `ripPackage(options): Promise<RipResult>`

Copy a mounted OMD disc (or any OMD package folder) back to disk, verifying every
track against the manifest. This is a verified file copy, not audio re-encoding.

```ts
const result = await ripPackage({
  sourceDir: 'D:\\',                 // a mounted disc or an OMD package folder
  outDir: './rips/Blank Banshee 0', // defaults to build/<slugified title>
  mode: 'package',                  // 'package' (re-burnable clone) or 'album' (FLAC + cover)
  // overwrite: true,               // replace an existing folder (else OutputExistsError)
  // validate: false,               // skip validating the source first (default validates)
});
console.log(result.verified, `${result.filesMatched}/${result.filesTotal}`);
```

`package` mode reproduces the whole tree and re-validates the clone
(`result.validation`); `album` mode writes only the FLAC tracks and cover art.
`result.files` lists each track with its `sha256` and whether it `matched`. An
optional `onProgress(p)` reports `{ phase: 'validating' | 'copying' |
'finalizing', done, total }` as each track is copied, for a UI progress bar.

Types: `RipOptions`, `RipResult`, `RippedFile`, `RipMode`, `RipProgress`.

---

## Manifest API

| Function | Signature | Purpose |
| --- | --- | --- |
| `createManifest` | `(input: CreateManifestInput) => OmdManifest` | Build a schema-valid manifest; derives `trackCount` and totals. |
| `parseManifest` | `(json: string) => unknown` | Parse manifest JSON text (throws on bad JSON). |
| `validateManifest` | `(data: unknown) => ManifestValidationResult` | Validate against the schema; returns `{ valid, manifest?, issues }`. |
| `stringifyManifest` | `(manifest: OmdManifest) => string` | Deterministic pretty JSON with trailing newline. |
| `manifestSchema` / `trackSchema` | Zod schemas | Runtime schema source of truth. |

Types: `OmdManifest`, `OmdTrack`, `ManifestValidationResult`,
`CreateManifestInput`.

---

## Checksums API

| Function | Purpose |
| --- | --- |
| `calculateChecksums(packageDir)` | SHA-256 for every package file (excludes the checksums file). Returns `ChecksumEntry[]`. |
| `sha256File(filePath)` | Streamed SHA-256 of a file. |
| `sha256Buffer(buf)` | SHA-256 of a buffer. |
| `formatChecksumsFile(entries)` | Render `sha256sum`-style file body. |
| `parseChecksumsFile(content)` | Parse a `sha256sum`-style file body. |
| `readChecksumsFile(packageDir)` | Read + parse `CHECKSUMS.sha256`. |
| `listPackageFiles(packageDir)` | Deterministic list of package-relative paths. |
| `totalPackageSize(packageDir)` | Total bytes of all package files. |

Type: `ChecksumEntry { sha256, relativePath }`.

---

## FLAC + filename helpers

| Function | Purpose |
| --- | --- |
| `isFlacBuffer(buf)` | True if the buffer starts with the `fLaC` marker. |
| `parseFlacMetadata(buf)` | Parse STREAMINFO + Vorbis comments → `FlacMetadata`. |
| `isPortableFilename(name)` | Cross-platform-safe filename check. |
| `normalizeFilename(name)` | Normalize to a safe filename. |
| `isOsJunkName(name)` | Detect `.DS_Store`, `Thumbs.db`, `__MACOSX`, etc. |

Type: `FlacMetadata { isFlac, sampleRate?, channels?, bitsPerSample?, totalSamples?, durationSeconds?, tags }`.

---

## Disc-size helpers

| Function | Purpose |
| --- | --- |
| `estimateDiscSize(totalSizeBytes, budgetBytes?)` | Compare size to the media budget → `DiscSizeEstimate`. |
| `formatBytes(bytes)` | Human-readable size (e.g. `412 MB`). |
| `formatDuration(seconds)` | `M:SS` or `H:MM:SS`. |

Type: `DiscSizeEstimate { totalSizeBytes, budgetBytes, remainingBytes, usedFraction, overBudget }`.

---

## Validation types

- `ValidationSeverity`: `'error' | 'warning' | 'info'`.
- `ValidationCode`: stable string codes (see [Validation Guide](./validation.md)).
- `ValidationIssue { severity, code, message, path? }`.
- `PackageValidationResult { valid, issues, errors, warnings }`.

---

## Constants

Notable exports from `constants.ts`:

| Constant | Value |
| --- | --- |
| `OMD_FORMAT` | `'OMD-FLAC-DATA'` |
| `OMD_VERSION` | `'0.1.0'` |
| `MANIFEST_FILENAME` | `'OMD-MANIFEST.json'` |
| `CHECKSUMS_FILENAME` | `'CHECKSUMS.sha256'` |
| `AUDIO_DIR` | `'AUDIO'` |
| `DVD_RW_8CM_USABLE_BYTES` | `1_400_000_000` |
| `DEFAULT_MEDIA_TYPE` | `'8cm DVD-RW'` |
| `DEFAULT_FILESYSTEM_TARGET` | `'UDF'` |

Also exported: `AUDIO_CODEC`, `BOOKLET_FILENAME`, `COVER_ART_SOURCE_NAMES`,
`OS_JUNK_NAMES`, `OS_JUNK_PREFIXES`, `FLAC_MAGIC`.
