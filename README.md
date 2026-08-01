# Open Media Disc

**Give the music you own a body again.** Open Media Disc (OMD) turns a folder of
FLAC files into a verified, self-describing album package: the first step toward a
cheap, collectable, rewritable physical music format. A package is just files on a
UDF disc, so it is media-agnostic; the reference medium is commodity 8cm DVD-RW,
but the same package can be burned to a CD, a standard DVD, or a Blu-ray.

This repo is **OMD v0.2 Write and Play**: a TypeScript SDK and the `omd` CLI. It
makes the format real and takes it to disc: package, validate, inspect, build a
UDF image, burn to 8cm DVD-RW (Windows), and play back.

- Status: **v0.2.0, working.** Build, tests, and lint are green.
- Input: a folder of owned FLAC files. Output: a portable OMD package you can
  burn to disc and play.
- Package, validate, and inspect need no hardware; burning is Windows-only.

## See it work

```bash
pnpm install
pnpm build

# Turn the bundled example album into a verified OMD package.
pnpm omd create ./examples/source-album --out ./build/OMD-000001

# Check it, then look inside.
pnpm omd validate ./build/OMD-000001
pnpm omd inspect ./build/OMD-000001
```

`inspect` shows the album, its tracks, and how much of the 8cm DVD-RW budget
(about 1.4 GB) the package uses. `validate` verifies structure, track files,
checksums, and capacity.

New here? Start with **[Getting Started](./documentation/getting-started.md)**.

## What a package looks like

An OMD package is just plain, recoverable files. No proprietary container, no
database, nothing you cannot open with ordinary tools.

```text
OMD-000001/
  OMD-MANIFEST.json     Album metadata and track table (authoritative)
  COVER.jpg             Cover art (optional, recommended)
  BOOKLET.pdf           Optional liner notes
  AUDIO/                FLAC tracks, numbered in playback order
    01 - Opening.flac
    02 - Second Track.flac
  CHECKSUMS.sha256      Integrity file for the whole package
```

## The `omd` CLI

| Command                               | What it does                                             |
| ------------------------------------- | -------------------------------------------------------- |
| `omd create <album> --out <dir>`      | Build a package from a FLAC album folder.                |
| `omd validate <package>`              | Verify structure, tracks, checksums, and capacity.       |
| `omd inspect <package>`               | Print the album, tracks, and disc-size usage.            |
| `omd checksum <package>`              | Recompute and check `CHECKSUMS.sha256`.                  |
| `omd image <package> --out <img>`     | Build a burn-ready UDF disc image (Windows).             |
| `omd burn <package\|image> [--drive]` | Burn to an 8cm DVD-RW and verify (Windows).              |
| `omd label <package> --out <svg>`     | Make a printable album-art label sheet (SVG).            |
| `omd play <package>`                  | Play the album with mpv/ffplay (preview if neither).     |
| `omd rip <disc> --out <dir>`          | Copy a disc back to disk as a verified package or album. |

Full details in the [CLI Reference](./documentation/cli-reference.md).

## Use it as a library

```ts
import { createPackage, validatePackage } from '@open-media-disc/core';

await createPackage({
  sourceDir: './my-album',
  outDir: './build/OMD-000002',
  discId: 'OMD-000002',
});

const result = await validatePackage('./build/OMD-000002');
if (!result.valid) {
  console.error(result.issues);
}
```

See the [SDK Reference](./documentation/sdk-reference.md) for the full API.

## OMD Studio (desktop and touch app)

OMD Studio is the Electron app for the same workflows with a GUI: browse a
catalog, package and label albums, burn and verify discs, and play them. It is one
touch-first UI for both a desktop window and a Raspberry Pi panel. It can
run on a **fixtures** library of generated, non-copyrighted demo albums and
capture screenshots headlessly, which is handy for documentation and blog posts:

```bash
pnpm --filter @open-media-disc/studio build
node packages/studio/bin/omd-studio-shots.mjs --out ./screenshots
```

See the [studio README](./packages/studio/README.md) for all data-mode, headless,
and screenshot options.

## Documentation

| Guide                                                 | For                              |
| ----------------------------------------------------- | -------------------------------- |
| [What is OMD?](./documentation/what-is-omd.md)        | The vision and design principles |
| [Project Status](./documentation/project-status.md)   | What is built and what is left   |
| [Installation](./documentation/installation.md)       | Setup and prerequisites          |
| [Getting Started](./documentation/getting-started.md) | Your first package, step by step |
| [Package Format](./documentation/package-format.md)   | Package anatomy                  |
| [CLI Reference](./documentation/cli-reference.md)     | Every `omd` command              |
| [SDK Reference](./documentation/sdk-reference.md)     | The `@open-media-disc/core` API  |
| [Validation Guide](./documentation/validation.md)     | Error and warning codes          |
| [Roadmap](./documentation/roadmap.md)                 | Where OMD is heading             |
| [OMD Studio](./documentation/omd-studio.md)           | The desktop and touch app        |
| [FAQ](./documentation/faq.md)                         | Common questions                 |
| [Glossary](./documentation/glossary.md)               | Terminology                      |

The **normative** format contract lives in [`spec/`](./spec). When the docs and
the spec disagree, the spec wins.

## Project layout

```text
open-media-disc/
  spec/            Normative format contract (Markdown + JSON Schema)
  documentation/   User and developer guide (start at documentation/README.md)
  packages/core/   @open-media-disc/core: the SDK
  packages/label/  @open-media-disc/label: printable label sheets
  packages/ui/     @open-media-disc/ui: shared theme engine and player model
  packages/cli/    @open-media-disc/cli: the omd CLI
  packages/studio/ @open-media-disc/studio: the desktop app (Electron)
  examples/        Sample album and generated packages
  scripts/         Tooling (pnpm gen:examples)
```

| Package                                        | Description                                                  |
| ---------------------------------------------- | ------------------------------------------------------------ |
| [`@open-media-disc/core`](./packages/core)     | Platform-independent SDK: create, validate, inspect.         |
| [`@open-media-disc/label`](./packages/label)   | Printable album-art label sheets (SVG).                      |
| [`@open-media-disc/ui`](./packages/ui)         | Shared theme engine and player model (Studio and Pi player). |
| [`@open-media-disc/cli`](./packages/cli)       | The `omd` command-line tool.                                 |
| [`@open-media-disc/studio`](./packages/studio) | The OMD Studio desktop and touch app (Electron, alpha).      |

## Where this is going

v0.1 proved the format; **v0.2 Write and Play** took it to disc and playback.
**OMD Studio (alpha)** is now in progress: a touch-first app wrapping the core,
with printable labels and an integrated player. Beyond it: multi-language SDKs, a
Raspberry Pi player, a writer dock, and eventually a cartridge shell. See the
[Roadmap](./documentation/roadmap.md) for the full picture.

## Contributing

Contributions are welcome. The golden rule: code and documentation change
together. Start with the [Contributing guide](./documentation/contributing.md),
and note that OMD is for music you own.

## Development

- Node.js 18 or newer, pnpm workspaces, TypeScript, Vitest.
- `pnpm build` compiles all packages.
- `pnpm test` runs the Vitest suite.
- `pnpm lint` and `pnpm format` lint and format.

## License

[MIT](./LICENSE)
