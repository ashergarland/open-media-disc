# @open-album-cartridge/core

The platform-independent TypeScript SDK behind [Open Media Disc](../../README.md).
It creates, validates, and inspects OMD FLAC data packages: album folder in,
verified package out. No optical burning, no hardware, no GUI.

The SDK implements the format contract in the repository's [`spec/`](../../spec)
folder, and it powers the [`omd` CLI](../cli).

## Install

```bash
pnpm add @open-album-cartridge/core
```

## Quick start

```ts
import {
  createPackage,
  validatePackage,
  inspectPackage,
} from '@open-album-cartridge/core';

// Build a normalized OMD package from an album folder of FLAC files.
const { manifest, validation } = await createPackage({
  sourceDir: './Albums/Blank Banshee 0',
  outDir: './build/OMD-000001',
  discId: 'OMD-000001',
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
| `createManifest()` | Build a schema-valid manifest from track metadata. |
| `parseManifest()` | Parse manifest JSON text into an object. |
| `validateManifest()` | Validate an object against the manifest schema. |
| `calculateChecksums()` | Compute SHA-256 for every package file. |
| `estimateDiscSize()` | Compare package size to the 8cm DVD-RW budget. |

The full API, including types and helpers, is in the
[SDK Reference](../../documentation/sdk-reference.md).

## License

MIT
