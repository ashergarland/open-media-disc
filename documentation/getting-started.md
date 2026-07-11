# Getting Started

This guide walks through creating and validating your first **Open Media Disc
(OMD)** package. Everything here is pure software — no optical drive, no
hardware, no burning.

If you haven't set up the project yet, do that first:
**[Installation](./installation.md)**.

## What you need

- A working install (see [Installation](./installation.md)).
- A folder of **FLAC** files you own the rights to.
- Optionally a cover image named `cover.jpg`, `cover.png`, `folder.jpg`, or
  `front.jpg` in that folder.

## 1. Create a package

Point `omd create` at an album folder. The tool reads FLAC tags, orders tracks,
normalizes filenames, copies audio into `AUDIO/`, detects cover art, and writes
the manifest and checksums.

```bash
pnpm omd create "./Albums/Blank Banshee 0" --out "./build/OMD-000001" --disc-id OMD-000001
```

Expected output:

```text
Created OMD package: ./build/OMD-000001
Disc ID: OMD-000001
Artist: Blank Banshee
Album: Blank Banshee 0
Tracks: 15
Audio: FLAC
Total Size: 412 MB
Status: VALID
```

Common options (full list in the [CLI Reference](./cli-reference.md)):

| Option | Meaning |
| --- | --- |
| `--out <dir>` | Output package folder (default `./build/<discId>`). |
| `--disc-id OMD-000001` | Stable disc identifier (default `OMD-000001`). |
| `--artist <name>` | Override the artist inferred from tags. |
| `--album <title>` | Override the album inferred from tags. |
| `--year <yyyy>` | Override the release year. |

## 2. Validate a package

```bash
pnpm omd validate "./build/OMD-000001"
```

Expected output:

```text
OMD Package: VALID

Disc ID: OMD-000001
Artist: Blank Banshee
Album: Blank Banshee 0
Format: OMD-FLAC-DATA v0.1.0
Tracks: 15
Audio: FLAC
Checksums: PASS
```

Validation reports **errors** (which make the package invalid) and **warnings**
(recommendations, like missing cover art or exceeding the 8cm DVD-RW budget).
Add `--strict` to turn a capacity overflow into an error. See the
[Validation Guide](./validation.md) for every code and how to fix it.

## 3. Inspect a package

```bash
pnpm omd inspect "./build/OMD-000001"
```

This prints album metadata, total duration, size versus the 8cm DVD-RW budget,
and the full track list in manifest order.

## 4. Verify checksums

```bash
pnpm omd checksum "./build/OMD-000001"           # verify against CHECKSUMS.sha256
pnpm omd checksum "./build/OMD-000001" --write   # (re)generate CHECKSUMS.sha256
```

## 5. Preview playback (stub)

```bash
pnpm omd play "./build/OMD-000001"
```

`omd play` lists tracks in manifest order but does **not** output audio in v0.1.
Audio playback belongs in a dedicated player app or the OMD Pi Player hardware.

## Package size and 8cm DVD-RW

OMD targets 8cm DVD-RW media with a usable budget of ~1.4 GB
(`1,400,000,000` bytes). Most FLAC albums fit easily. If a package is larger,
`inspect` shows it as over budget and `validate` warns (or errors with
`--strict`). Options for oversized albums (downsampled FLAC, multi-disc sets)
are future work.

## Using the library instead of the CLI

Everything the CLI does is available programmatically via
[`@open-album-cartridge/core`](./sdk-reference.md):

```ts
import { createPackage, validatePackage, inspectPackage } from '@open-album-cartridge/core';

await createPackage({
  sourceDir: './Albums/Blank Banshee 0',
  outDir: './build/OMD-000001',
  discId: 'OMD-000001',
});

const result = await validatePackage('./build/OMD-000001');
console.log(result.valid);
```

## What's next

- Learn the package anatomy → [Package Format](./package-format.md)
- Explore every command → [CLI Reference](./cli-reference.md)
- See the hardware plans → [Roadmap](./roadmap.md)
