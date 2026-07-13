# CLI Reference

The `omd` command-line tool wraps [`@open-album-cartridge/core`](./sdk-reference.md).
It creates, validates, inspects, images, burns, and labels OMD packages. Burning
requires Windows (IMAPI2) with a writer attached.

Run commands from the repo root with `pnpm omd <command>` (after `pnpm build`),
or invoke the installed `omd` binary directly.

## Synopsis

```text
omd create <albumFolder> [--out <dir>] [--disc-id <disc title>] [--force]
                         [--artist <name>] [--album <title>] [--year <yyyy>]
omd validate <packageDir> [--strict]
omd inspect  <packageDir>
omd checksum <packageDir> [--write]
omd image    <packageDir> --out <imagePath> [--label <name>]
omd burn     <packageDir|imageFile> [--drive <path>] [--label <name>]
             [--no-blank] [--no-verify]
omd label    <packageDir> --out <file.svg> [--fit fill|fit|stretch] [--copies <n>]
omd play     <packageDir>
omd rip      <sourceDir|drive> [--out <dir>] [--mode package|album] [--force]

omd --help | -h        Show help
omd --version | -v     Show version
```

Exit codes: `0` success, `1` failure (e.g. invalid package), `2` usage error.

---

## `omd create`

Build a normalized OMD package from a source album folder of FLAC files.

```bash
omd create "./Albums/Blank Banshee 0" --out "./build/OMD-000001"
```

| Option | Default | Description |
| --- | --- | --- |
| `<albumFolder>` | - | Source folder containing `.flac` files (and optional cover). Required. |
| `--out <dir>` | `./build/<disc title>` | Output package directory (the title is slugified for the path). |
| `--disc-id <title>` | album title | Disc title stored as `discId`. Any Unicode text; defaults to the album title. |
| `--force` | off | Overwrite the output folder if it already exists. |
| `--artist <name>` | inferred from tags | Override album artist. |
| `--album <title>` | inferred from tags | Override album title. |
| `--year <yyyy>` | inferred from tags | Override release year. |

What it does: reads FLAC tags, orders tracks (by tag/filename number), normalizes
filenames, copies audio into `AUDIO/`, detects cover art, writes
`OMD-MANIFEST.json` and `CHECKSUMS.sha256`, then validates the result.

Sample output:

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

---

## `omd validate`

Validate a package directory against the OMD v0.1 rules.

```bash
omd validate "./build/OMD-000001"
```

| Option | Default | Description |
| --- | --- | --- |
| `<packageDir>` | - | Package directory to validate. Required. |
| `--strict` | off | Promote a capacity overflow from a warning to an error. |

Sample output:

```text
OMD Package: VALID

Disc title: Blank Banshee 0
Artist: Blank Banshee
Album: Blank Banshee 0
Format: OMD-FLAC-DATA v0.1.0
Tracks: 15
Audio: FLAC
Checksums: PASS
```

Errors and warnings are printed with stable codes. See the
[Validation Guide](./validation.md).

---

## `omd inspect`

Print an album/track summary from a package manifest.

```bash
omd inspect "./build/OMD-000001"
```

Shows disc id, artist, album, year, format/version, track count, total duration,
size versus the 8cm DVD-RW budget, and the track list in manifest order. The
header reads `OMD Disc` for a mounted optical disc and `OMD Package (folder)`
otherwise.

---

## `omd checksum`

Verify or regenerate the package `CHECKSUMS.sha256`.

```bash
omd checksum "./build/OMD-000001"           # verify against existing file
omd checksum "./build/OMD-000001" --write   # (re)generate the file
```

| Option | Default | Description |
| --- | --- | --- |
| `<packageDir>` | - | Package directory. Required. |
| `--write` | off | Regenerate `CHECKSUMS.sha256` instead of verifying. |

---

## `omd image`

Build a burn-ready **UDF** disc image from a validated package. The image content
mirrors the package tree and its UDF volume label is a best-effort rendering of
the disc title. Building an image needs no optical drive.

> Windows only in v0.2. Image creation uses IMAPI2; Linux and macOS backends are
> planned. See the [Roadmap](./roadmap.md).

```bash
omd image "./build/OMD-000001" --out "./build/OMD-000001.img"
```

| Argument / option | Description |
| --- | --- |
| `<packageDir>` | Package directory to image. Required. |
| `--out <imagePath>` | Destination image file. Required. |
| `--label <name>` | Override the UDF volume label (default: derived from the disc title). |

Sample output:

```text
Built disc image: ./build/OMD-000001.img
Volume label: OMD-000001
Filesystem: UDF
Size: 412 MB
Backend: Windows IMAPI2
```

---

## `omd burn`

Burn a package (or a prebuilt image) to writable DVD media (DVD-R, DVD-RW,
DVD+R, DVD+RW) and verify the result. A directory source is imaged to a temporary
UDF image first; a file source is written directly.

The disc is probed first: a non-blank **rewritable** disc is erased before writing
(unless `--no-blank`), while a non-blank **write-once** disc (DVD-R, DVD+R) is
refused because it cannot be reused. The command also checks the image fits the
disc capacity before writing.

After writing, the disc is remounted in place and read back to verify it against
`CHECKSUMS.sha256` (no reinsert needed). On success the disc is ejected as a
completion signal; use `--no-eject` to keep it in the drive (handy for burning
several discs in a row). A failed verification leaves the disc in the drive.

While burning, a live status line shows the current phase (building, writing,
verifying) and elapsed time.

> Windows only in v0.2, and destructive: burning erases a rewritable disc.
> Rewritable discs can be reused; a write-once disc must be blank.

```bash
omd burn "./build/OMD-000001" --drive "D:\\"
```

| Argument / option | Description |
| --- | --- |
| `<packageDir\|imageFile>` | A package directory or a prebuilt image file. Required. |
| `--drive <path>` | Target drive mount path (e.g. `D:\`). Optional if exactly one writer is present. |
| `--label <name>` | UDF volume label when imaging a package (default: derived from the disc title). |
| `--no-blank` | Do not blank a non-blank rewritable disc first. |
| `--no-verify` | Skip reading the burned disc back to verify it. |
| `--no-eject` | Keep the disc in the drive after a successful burn (default is to eject). |

Sample output:

```text
Burning ./build/OMD-000001 to D:\ (HL-DT-ST BD-RE BP60NB10)
Disc: DVD-RW (rewritable, 1.4 GB), not blank.
The rewritable disc will be erased first.
Disc blanked.
Wrote image to D:\.
Verification: PASS
Burn complete.
Disc ejected.
```

---

## `omd label`

Generate a printable **album-art label sheet** (SVG) from a package's cover art,
sized for mini CD jewel cases by default. Print it at 100% on US Letter, or let
OMD Studio print it.

```bash
omd label "./build/OMD-000001" --out "./build/OMD-000001-label.svg" --copies 4
```

| Argument / option | Description |
| --- | --- |
| `<packageDir>` | Package directory (must include cover art). Required. |
| `--out <file.svg>` | Destination SVG file. Required. |
| `--width <in>` | Label width in inches (default 3.4375, mini CD jewel case). |
| `--height <in>` | Label height in inches (default 3.3125). |
| `--fit <mode>` | `fill` (center-crop, default), `fit` (letterbox), or `stretch`. |
| `--copies <n>` | Number of labels to place on the sheet (default 1). |
| `--no-crop-marks` | Omit the cut outline and corner marks. |

Sample output:

```text
Wrote label sheet: ./build/OMD-000001-label.svg
Album: Blank Banshee - Blank Banshee 0
Disc title: Blank Banshee 0
Labels: 4
```

---

## `omd play`

Play a package (or a mounted disc) in manifest order using an installed player:
`mpv`, then `ffplay`. Without either, it prints the track list as a preview.

```bash
omd play "./build/OMD-000001"
omd play "./build/OMD-000001" --player mpv
```

| Option | Description |
| --- | --- |
| `<packageDir>` | A package directory or a mounted disc. Required. |
| `--player <name>` | Force a player (overrides `mpv`/`ffplay`). Also via `OMD_PLAYER`. |

Built-in audio decoding (no external player) is planned for the OMD Pi Player.

---

## `omd rip`

Copy a mounted OMD disc (or any OMD package folder) back to disk, verifying every
track against the manifest. Ripping is a verified file copy, not audio
re-encoding: OMD stores FLAC files in a UDF filesystem, so `omd rip` reproduces
those exact files and certifies them.

```bash
omd rip "D:\" --out "./rips/Blank Banshee 0"
omd rip "D:\" --out "./rips/Blank Banshee 0" --mode album
```

| Argument / option | Description |
| --- | --- |
| `<sourceDir\|drive>` | A mounted disc mount path (e.g. `D:\`) or an OMD package directory. Required. |
| `--out <dir>` | Destination directory. Defaults to `./build/<disc title>`. |
| `--mode <mode>` | `package` (default) makes a re-burnable clone; `album` makes a friendly FLAC + cover folder. |
| `--force` | Overwrite the output folder if it already exists. |
| `--no-validate` | Skip validating the source before ripping. |

Sample output:

```text
Ripped package clone to: ./rips/Blank Banshee 0
Disc title: Blank Banshee 0
Artist: Blank Banshee
Album: Blank Banshee 0
Tracks: 15/15 verified
Status: VERIFIED
```

---

## Global options

| Option | Description |
| --- | --- |
| `--help`, `-h` | Show usage help. |
| `--version`, `-v` | Print the CLI version. |
