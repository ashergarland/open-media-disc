# Open Media Disc

**Give the music you own a body again.** Open Media Disc (OMD) turns a folder of
FLAC files into a verified, self-describing album package: the first step toward a
cheap, collectable, rewritable physical music format built on commodity 8cm
DVD-RW media.

This repo is **OMD Core v0.1**, a TypeScript SDK and the `omd` CLI. It makes the
format real as pure software, so everything that comes later (players, a writer
dock, a cartridge shell) has a solid foundation to build on.

- Status: **v0.1, working.** Build, tests, and lint are green.
- Input: a folder of owned FLAC files. Output: a portable OMD package.
- No burning, no hardware, no GUI required to try it.

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

| Command | What it does |
| --- | --- |
| `omd create <album> --out <dir>` | Build a package from a FLAC album folder. |
| `omd validate <package>` | Verify structure, tracks, checksums, and capacity. |
| `omd inspect <package>` | Print the album, tracks, and disc-size usage. |
| `omd checksum <package>` | Recompute and check `CHECKSUMS.sha256`. |
| `omd play <package>` | Preview playback order (audio output is a v0.1 stub). |

Full details in the [CLI Reference](./documentation/cli-reference.md).

## Use it as a library

```ts
import { createPackage, validatePackage } from "@open-album-cartridge/core";

await createPackage({
  sourceDir: "./my-album",
  outDir: "./build/OMD-000002",
  discId: "OMD-000002",
});

const result = await validatePackage("./build/OMD-000002");
if (!result.valid) {
  console.error(result.issues);
}
```

See the [SDK Reference](./documentation/sdk-reference.md) for the full API.

## Documentation

| Guide | For |
| --- | --- |
| [What is OMD?](./documentation/what-is-omd.md) | The vision and design principles |
| [Project Status](./documentation/project-status.md) | What is built and what is left |
| [Installation](./documentation/installation.md) | Setup and prerequisites |
| [Getting Started](./documentation/getting-started.md) | Your first package, step by step |
| [Package Format](./documentation/package-format.md) | Package anatomy |
| [CLI Reference](./documentation/cli-reference.md) | Every `omd` command |
| [SDK Reference](./documentation/sdk-reference.md) | The `@open-album-cartridge/core` API |
| [Validation Guide](./documentation/validation.md) | Error and warning codes |
| [Roadmap](./documentation/roadmap.md) | Where OMD is heading |
| [FAQ](./documentation/faq.md) | Common questions |
| [Glossary](./documentation/glossary.md) | Terminology |

The **normative** format contract lives in [`spec/`](./spec). When the docs and
the spec disagree, the spec wins.

## Project layout

```text
open-album-cartridge/
  spec/            Normative format contract (Markdown + JSON Schema)
  documentation/   User and developer guide (start at documentation/README.md)
  packages/core/   @open-album-cartridge/core: the SDK
  packages/cli/    @open-album-cartridge/cli: the omd CLI
  examples/        Sample album and generated packages
  scripts/         Tooling (pnpm gen:examples)
```

| Package | Description |
| --- | --- |
| [`@open-album-cartridge/core`](./packages/core) | Platform-independent SDK: create, validate, inspect. |
| [`@open-album-cartridge/cli`](./packages/cli) | The `omd` command-line tool. |

## Where this is going

v0.1 proves the format. The roadmap builds outward from there: burning to 8cm
DVD-RW, a Raspberry Pi player, a writer dock, and eventually a cartridge shell.
See the [Roadmap](./documentation/roadmap.md) for the full picture.

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
