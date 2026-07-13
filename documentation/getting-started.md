# Getting Started

This guide walks through creating and validating your first **Open Media Disc
(OMD)** package. The core flow is pure software (no optical drive or hardware).
Building an image and burning a disc (later sections, Windows-only) are optional.

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
pnpm omd create "./Albums/Blank Banshee 0" --out "./build/OMD-000001"
```

Expected output:

```text
Created OMD package: ./build/OMD-000001
Disc title: Blank Banshee 0
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
| `--out <dir>` | Output package folder (default `./build/<disc title>`). |
| `--disc-id <title>` | Disc title stored as `discId` (default: the album title). |
| `--force` | Overwrite the output folder if it already exists. |
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

## 5. Play a package

```bash
pnpm omd play "./build/OMD-000001"
```

`omd play` plays the album in manifest order using an installed player (`mpv`,
then `ffplay`; override with `--player` or `OMD_PLAYER`). Without either player it
prints the track list as a preview. It also plays a mounted disc.

## 6. Build a disc image (Windows)

Turn a validated package into a burn-ready **UDF** disc image. This needs no
optical drive.

```bash
pnpm omd image "./build/OMD-000001" --out "./build/OMD-000001.img"
```

```text
Built disc image: ./build/OMD-000001.img
Volume label: OMD-000001
Filesystem: UDF
Size: 412 MB
Backend: Windows IMAPI2
```

The image mirrors the package and its volume label is the `discId`. Image
building is Windows-only in v0.2 (IMAPI2); other platforms are planned. To write
it to a disc, see the next section.

## 7. Burn to a disc (Windows)

Write a package (or a prebuilt image) to writable DVD media and verify it. Insert
a blank disc first (a rewritable DVD-RW/DVD+RW, or a blank write-once DVD-R/DVD+R).

```bash
pnpm omd burn "./build/OMD-000001" --drive "D:\\"
```

> Burning is destructive: a non-blank rewritable disc is erased first (pass
> `--no-blank` to skip), while a non-blank write-once disc is refused. It is
> Windows-only in v0.2. With exactly one writer attached you can omit `--drive`.
> The disc ejects on success; pass `--no-eject` to keep it in for the next burn.

## 8. Print a label (any platform)

Make a printable album-art label sheet (SVG) from the package cover art, sized
for mini CD jewel cases by default.

```bash
pnpm omd label "./build/OMD-000001" --out "./build/OMD-000001-label.svg" --copies 4
```

Open the SVG in a browser and print it at 100% scale on US Letter, or let OMD
Studio print it. Use `--fit`, `--width`/`--height`, or `--no-crop-marks` to adjust
the layout.

## 9. Rip a disc back

Copy a mounted OMD disc (or any package folder) back to disk, verifying every
track against the manifest. This is a verified file copy, not audio re-encoding.

```bash
pnpm omd rip "D:\" --out "./rips/Blank Banshee 0"
pnpm omd rip "D:\" --out "./rips/Blank Banshee 0" --mode album
```

`package` mode (default) makes a re-burnable clone that re-validates on its own;
`album` mode makes a friendly folder of FLAC tracks and cover art.

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
