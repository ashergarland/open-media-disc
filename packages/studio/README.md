# @open-album-cartridge/studio

**OMD Studio**, the desktop app for [Open Media Disc](../../README.md). It wraps
the OMD core in a guided flow: select an album, package and validate it, generate
a printable label, burn and verify it to disc, and play a mounted disc in an
integrated player. The GUI reuses the same core modules as the `omd` CLI.

Built with Electron. The main process reuses `@open-album-cartridge/core`
directly; the renderer calls a small, explicit `window.omd` API exposed by a
preload bridge (context isolation on, no Node in the renderer).

> Alpha and in progress. This package currently scaffolds the app: a window that
> shows the OMD version and lists optical drives. Screens for packaging, labeling,
> burning, and playing land in later increments.

## Develop

```bash
pnpm --filter @open-album-cartridge/studio build   # type-check + bundle to dist/
pnpm --filter @open-album-cartridge/studio start   # launch the built app
```

`build` runs `tsc --noEmit` for type-checking, then bundles with esbuild (main and
preload as CommonJS with core bundled in, renderer as a browser ES module).

## Layout

```text
packages/studio/
  build.mjs            esbuild bundler for main, preload, and renderer
  sync-themes.mjs      generates renderer/themes/<id>.css from the theme showcases
  src/main/main.ts     Electron main process; reuses core, registers IPC
  src/main/preload.ts  Context-isolated bridge exposing window.omd
  src/renderer/        The UI (index.html, renderer.ts, shell.css, themes/)
  src/shared/types.ts  Types shared across main, preload, and renderer
```

## License

MIT
