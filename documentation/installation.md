# Installation

OMD is a Node.js/TypeScript monorepo. Creating, validating, and inspecting
packages runs locally with no optical drive or hardware. Burning a disc needs
Windows and a writer; playback uses an installed audio player.

## Prerequisites

| Requirement | Version | Notes |
| --- | --- | --- |
| [Node.js](https://nodejs.org) | 18 or newer | LTS recommended. |
| [pnpm](https://pnpm.io) | 8+ | Preferred package manager for this workspace. |
| Git | any recent | To clone the repository. |
| `mpv` or `ffplay` | any recent | Optional, for `omd play` audio. Without one, play prints a preview. |
| Windows (IMAPI2) | built in | Optional, for `omd image` / `omd burn`. No install needed; other platforms are planned. |

Install pnpm if you don't have it:

```bash
npm install -g pnpm
```

> On some Windows setups, `corepack enable` may fail with a permissions error on
> `C:\Program Files\nodejs`. Installing pnpm with `npm install -g pnpm` avoids
> that.

## Get the code

```bash
git clone <your-fork-or-repo-url> open-album-cartridge
cd open-album-cartridge
```

## Install, build, and verify

```bash
pnpm install    # install all workspace dependencies
pnpm build      # compile @open-album-cartridge/core and /cli
pnpm test       # run the Vitest suite (should be all green)
```

You should see the test suite pass. If `pnpm test` passes, your environment is
ready.

## Run the CLI

The root `omd` script runs the compiled CLI. **Run `pnpm build` first** so the
`dist/` output exists.

```bash
pnpm omd --help
```

You can also try it against the bundled example album:

```bash
pnpm omd create ./examples/source-album --out ./build/OMD-000001
pnpm omd validate ./build/OMD-000001
pnpm omd inspect ./build/OMD-000001
```

## Regenerate example fixtures (optional)

The `examples/` folder ships with small, synthetic (silent, non-copyrighted)
FLAC test fixtures. To rebuild them:

```bash
pnpm gen:examples
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `omd: command not found` / "Command 'omd' not found" | Run `pnpm build` first; the root `pnpm omd` script runs `packages/cli/dist/bin/omd.js`. |
| `No FLAC files found in source folder` | Point `create` at a folder that directly contains `.flac` files. |
| Tests fail after editing code | Re-run `pnpm build`, then `pnpm test`; check `pnpm lint`. |

Next: **[Getting Started](./getting-started.md)**.
