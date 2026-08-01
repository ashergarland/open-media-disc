# @open-media-disc/studio

**OMD Studio**, the desktop app for [Open Media Disc](../../README.md). It wraps
the OMD core in a guided flow: select an album, package and validate it, generate
a printable label, burn and verify it to disc, and play a mounted disc in an
integrated player. The GUI reuses the same core modules as the `omd` CLI.

Built with Electron. The main process reuses `@open-media-disc/core`
directly; the renderer calls a small, explicit `window.omd` API exposed by a
preload bridge (context isolation on, no Node in the renderer).

> Alpha and in progress. This package currently scaffolds the app: a window that
> shows the OMD version and lists optical drives. Screens for packaging, labeling,
> burning, and playing land in later increments.

## Develop

```bash
pnpm --filter @open-media-disc/studio build   # type-check + bundle to dist/
pnpm --filter @open-media-disc/studio start   # launch the built app
```

`build` runs `tsc --noEmit` for type-checking, then bundles with esbuild (main and
preload as CommonJS with core bundled in, renderer as a browser ES module).

## Data modes, headless, and screenshots

The app can run against **live data** (real core + optical drives, the default) or
a **fixtures** library of generated, non-copyrighted demo albums. Fixtures mode
uses fake burn/image backends, so it needs no optical hardware and never touches
copyrighted audio or artwork, which makes it ideal for tests and screenshots.

```bash
# Interactive window on fixtures data
pnpm studio:fixtures

# Headless: capture a PNG of every view into ./screenshots (fixtures data)
pnpm studio:screenshots
```

For a path-independent one-liner (for example from another repo, capturing into
that repo's image folder), use the `omd-studio-shots` bin. It wraps the harness
with friendlier flag names and writes PNGs relative to the current directory:

```bash
# From the OMD repo, after `pnpm --filter @open-media-disc/studio build`:
node packages/studio/bin/omd-studio-shots.mjs --views home,disc --out ./images

# --views <all|list>  --out <dir>  --data <fixtures|real>
# --theme <id>  --size <WxH>  --reset-fixtures   (--help for all)
```

The pnpm scripts and the bin are thin wrappers over `electron .` with `--omd-*`
flags (env vars in parentheses):

| Flag | Purpose |
| --- | --- |
| `--omd-data=fixtures\|real` (`OMD_STUDIO_DATA`) | Data source. Default `real`. |
| `--omd-headless` (`OMD_STUDIO_HEADLESS`) | Run without a visible window. |
| `--omd-screenshots[=all\|a,b,c]` (`OMD_STUDIO_SCREENSHOTS`) | Capture the listed views (implies headless). |
| `--omd-out=<dir>` (`OMD_STUDIO_OUT`) | Screenshot output folder. Default `./screenshots`. |
| `--omd-view=<id>` (`OMD_STUDIO_VIEW`) | Open a specific view on boot. |
| `--omd-theme=<id>` (`OMD_STUDIO_THEME`) | Apply a theme on boot. |
| `--omd-size=<WxH>` (`OMD_STUDIO_SIZE`) | Capture window size. Default `1440x900`. |
| `--omd-reset-fixtures` (`OMD_STUDIO_RESET_FIXTURES`) | Regenerate the fixture library. |

Views: `home`, `disc`, `catalog`, `burn`, `labels`, `themes`, `settings`. The
fixture library is generated once under the app's user-data folder.

## Layout

```text
packages/studio/
  build.mjs                esbuild bundler for main, preload, and renderer
  bin/omd-studio-shots.mjs Launcher for headless screenshot capture
  src/main/main.ts         Electron main process; reuses core, registers IPC
  src/main/config.ts       Parses --omd-* flags / env into runtime config
  src/main/fixtureLibrary.ts  Generates the demo library + fake optical backends
  src/main/fixtures.ts     Installs fixtures mode (backends + IPC overrides)
  src/main/harness.ts      Headless screenshot harness (drives views, captures)
  src/main/preload.ts      Context-isolated bridge exposing window.omd + omdConfig
  src/renderer/            The UI (index.html, renderer.ts, shell.css, themes/)
  src/shared/types.ts      Types shared across main, preload, and renderer
```

## License

MIT
