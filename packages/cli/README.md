# @open-album-cartridge/cli

`omd`, the command-line tool for [Open Media Disc](../../README.md). It turns an
album folder of FLAC files into a verified OMD package, then validates, inspects,
images, burns, and previews it. It wraps [`@open-album-cartridge/core`](../core).
Burning requires Windows (IMAPI2) with a writer attached.

## Commands

```bash
omd create <albumFolder> [--out <dir>] [--disc-id OMD-000001] \
                         [--artist <name>] [--album <title>] [--year <yyyy>]
omd validate <packageDir> [--strict]
omd inspect <packageDir>
omd checksum <packageDir> [--write]
omd image <packageDir> --out <imagePath> [--label <name>]
omd burn <packageDir|imageFile> [--drive <path>] [--label <name>] [--no-blank] [--no-verify]
omd play <packageDir>
```

| Command | What it does |
| --- | --- |
| `create` | Build a package from a FLAC album folder. |
| `validate` | Verify structure, tracks, checksums, and capacity. |
| `inspect` | Print the album, tracks, and disc-size usage. |
| `checksum` | Recompute and check `CHECKSUMS.sha256` (use `--write` to save). |
| `image` | Build a burn-ready UDF disc image (Windows in v0.2). |
| `burn` | Burn a package or image to an 8cm DVD-RW and verify (Windows in v0.2). |
| `play` | Preview playback order (audio output is a v0.1 stub). |

### Examples

```bash
omd create "./Albums/Blank Banshee 0" --out "./build/OMD-000001"
omd validate "./build/OMD-000001"
omd inspect "./build/OMD-000001"
```

`omd play` previews the manifest track order but does not output audio in v0.1.
Real playback belongs in a player app or OMD hardware.

Full details are in the [CLI Reference](../../documentation/cli-reference.md).

## License

MIT
