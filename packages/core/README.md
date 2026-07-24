# @open-media-disc/core

The platform-independent TypeScript SDK behind [Open Media Disc](../../README.md).
It creates, validates, inspects, and images OMD FLAC data packages: album folder
in, verified package out. Building a burn-ready UDF disc image and burning it to
an 8cm DVD-RW are supported on Windows.

The SDK implements the format contract in the repository's [`spec/`](../../spec)
folder, and it powers the [`omd` CLI](../cli).

## Install

```bash
pnpm add @open-media-disc/core
```

## Quick start

```ts
import {
  createPackage,
  validatePackage,
  inspectPackage,
} from '@open-media-disc/core';

// Build a normalized OMD package from an album folder of FLAC files.
const { manifest, validation } = await createPackage({
  sourceDir: './Albums/Blank Banshee 0',
  outDir: './build/OMD-000001',
  discId: 'Blank Banshee 0', // the disc title; defaults to the album title
});

// Validate an existing package.
const result = await validatePackage('./build/OMD-000001');
console.log(result.valid, result.errors, result.warnings);

// Inspect the album and track summary.
const info = await inspectPackage('./build/OMD-000001');
console.log(info.artist, info.album, info.trackCount);
```

## Main API

| Function | Purpose |
| --- | --- |
| `createPackage()` | Build a full OMD package from an album folder. |
| `validatePackage()` | Validate a package directory against the OMD rules. |
| `inspectPackage()` | Return an album and track summary from a package. |
| `playlistPaths()` | Ordered absolute track paths for playback. |
| `buildDiscImage()` | Build a burn-ready UDF disc image from a package (Windows). |
| `burnImage()` | Write an image to a disc and verify it (needs a burn backend). |
| `burnPackage()` | Burn a package or image to a disc and verify (Windows). |
| `verifyDisc()` | Verify a mounted disc against its `CHECKSUMS.sha256`. |
| `detectMediaKind()` | Tell a mounted disc from an ordinary folder (Windows). |
| `createManifest()` | Build a schema-valid manifest from track metadata. |
| `parseManifest()` | Parse manifest JSON text into an object. |
| `validateManifest()` | Validate an object against the manifest schema. |
| `calculateChecksums()` | Compute SHA-256 for every package file. |
| `estimateDiscSize()` | Compare package size to the 8cm DVD-RW budget. |

The full API, including types and helpers, is in the
[SDK Reference](../../documentation/sdk-reference.md).

## License

MIT
