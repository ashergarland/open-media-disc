# CLI Reference

The `omd` command-line tool wraps [`@open-album-cartridge/core`](./sdk-reference.md).
It creates and validates OMD packages. It does **not** burn optical media or
drive hardware.

Run commands from the repo root with `pnpm omd <command>` (after `pnpm build`),
or invoke the installed `omd` binary directly.

## Synopsis

```text
omd create <albumFolder> [--out <dir>] [--disc-id OMD-000001]
                         [--artist <name>] [--album <title>] [--year <yyyy>]
omd validate <packageDir> [--strict]
omd inspect  <packageDir>
omd checksum <packageDir> [--write]
omd play     <packageDir>

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
| `<albumFolder>` | — | Source folder containing `.flac` files (and optional cover). Required. |
| `--out <dir>` | `./build/<discId>` | Output package directory. |
| `--disc-id <id>` | `OMD-000001` | Stable disc identifier (`OMD-` + 6+ digits). |
| `--artist <name>` | inferred from tags | Override album artist. |
| `--album <title>` | inferred from tags | Override album title. |
| `--year <yyyy>` | inferred from tags | Override release year. |

What it does: reads FLAC tags, orders tracks (by tag/filename number), normalizes
filenames, copies audio into `AUDIO/`, detects cover art, writes
`OMD-MANIFEST.json` and `CHECKSUMS.sha256`, then validates the result.

Sample output:

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

---

## `omd validate`

Validate a package directory against the OMD v0.1 rules.

```bash
omd validate "./build/OMD-000001"
```

| Option | Default | Description |
| --- | --- | --- |
| `<packageDir>` | — | Package directory to validate. Required. |
| `--strict` | off | Promote a capacity overflow from a warning to an error. |

Sample output:

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

Errors and warnings are printed with stable codes. See the
[Validation Guide](./validation.md).

---

## `omd inspect`

Print an album/track summary from a package manifest.

```bash
omd inspect "./build/OMD-000001"
```

Shows disc id, artist, album, year, format/version, track count, total duration,
size versus the 8cm DVD-RW budget, and the track list in manifest order.

---

## `omd checksum`

Verify or regenerate the package `CHECKSUMS.sha256`.

```bash
omd checksum "./build/OMD-000001"           # verify against existing file
omd checksum "./build/OMD-000001" --write   # (re)generate the file
```

| Option | Default | Description |
| --- | --- | --- |
| `<packageDir>` | — | Package directory. Required. |
| `--write` | off | Regenerate `CHECKSUMS.sha256` instead of verifying. |

---

## `omd play`

> **v0.1 stub.** OMD Core does not bundle an audio backend.

```bash
omd play "./build/OMD-000001"
```

Reads the manifest and lists tracks in playback order so you can preview what a
player would present. It does **not** output audio. Real playback belongs in a
player app or the OMD Pi Player hardware.

---

## Global options

| Option | Description |
| --- | --- |
| `--help`, `-h` | Show usage help. |
| `--version`, `-v` | Print the CLI version. |
