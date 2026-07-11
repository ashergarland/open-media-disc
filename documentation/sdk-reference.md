# SDK Reference

`@open-album-cartridge/core` is the platform-independent TypeScript SDK for
creating, validating, inspecting, and imaging OMD packages. Building a UDF disc
image uses the operating system's imaging tools (Windows IMAPI2 in v0.2); nothing
extra needs installing.

```bash
pnpm add @open-album-cartridge/core
```

```ts
import {
  createPackage,
  validatePackage,
  inspectPackage,
} from '@open-album-cartridge/core';
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
  outDir: './build/OMD-000001',
  discId: 'OMD-000001',
  // optional overrides:
  artist: 'Blank Banshee',
  album: 'Blank Banshee 0',
  releaseYear: 2013,
  budgetBytes: 1_400_000_000,
  generator: { name: 'OMD CLI', version: '0.1.0' },
  createdAt: new Date(), // pass a fixed Date for deterministic output in tests
});
```

`CreatePackageOptions` fields: `sourceDir`, `outDir`, `discId` (required);
`artist`, `album`, `releaseYear`, `budgetBytes`, `generator`, `createdAt`
(optional). Returns `{ outDir, manifest, validation }`.

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
manifest is missing or invalid — use `validatePackage` for graceful diagnostics.

```ts
const info = await inspectPackage('./build/OMD-000001');
console.log(info.artist, info.album, info.trackCount, info.totalDurationSeconds);
```

---

## Disc image API

### `buildDiscImage(options): Promise<BuildDiscImageResult>`

Build a burn-ready **UDF** disc image from a validated package. The image content
mirrors the package tree and its UDF volume label is the package `discId` unless
overridden. Building an image needs no optical drive.

```ts
const result = await buildDiscImage({
  packageDir: './build/OMD-000001',
  outPath: './build/OMD-000001.img',
  // optional:
  volumeLabel: 'OMD-000001', // defaults to the package discId
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
result. Blanks a non-blank rewritable disc first (unless disabled) and reads the
burned disc back to check it against `CHECKSUMS.sha256`. A failed verification is
reported (`verified: false`), not thrown.

```ts
const result = await burnImage({
  imagePath: './build/OMD-000001.img',
  drive: { mountPath: 'E:\\' },
  backend: myBurnBackend, // a BurnBackend; the Windows backend arrives next
  blank: true,            // blank a non-blank RW first (default true)
  verify: true,           // verify the burned disc (default true)
});
// result: { imagePath, drive, blanked, verified, verification?, backend }
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
isBlank(drive), blank(drive), writeImage(request) }`. `resolveBurnBackend()`
returns the platform backend, and a `BurnDrive` carries the `mountPath` where the
disc is read for verification.

Types: `BurnImageOptions`, `BurnImageResult`, `BurnPackageOptions`, `BurnBackend`,
`BurnDrive`, `BurnImageRequest`.

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

- `ValidationSeverity` — `'error' | 'warning' | 'info'`.
- `ValidationCode` — stable string codes (see [Validation Guide](./validation.md)).
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
