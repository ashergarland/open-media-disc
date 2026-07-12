# @open-album-cartridge/label

The label generator behind [Open Media Disc](../../README.md). It turns an OMD
package into a printable **album-art label sheet** as SVG, sized in real inches so
it prints at true physical size. It is cross-platform and dependency-free, and it
powers both the `omd label` CLI and OMD Studio.

## Install

```bash
pnpm add @open-album-cartridge/label
```

## Quick start

```ts
import { buildPackageLabelSheet } from '@open-album-cartridge/label';
import { writeFile } from 'node:fs/promises';

// Build a mini CD jewel-case label from a package's cover art.
const sheet = await buildPackageLabelSheet({
  packageDir: './build/OMD-000001',
  copies: 2, // optional; default 1
});
await writeFile('label.svg', sheet.svg, 'utf8');
```

Print `label.svg` from any browser or from OMD Studio at 100% scale on US Letter.

## API

| Export | Purpose |
| --- | --- |
| `buildPackageLabelSheet(options)` | Read an OMD package and render a label sheet from its cover art. |
| `renderLabelSheet(options)` | Render a sheet from raw label items (image href + size + fit). |
| `layoutLabels(items, page)` | Pack labels into rows within the page margins. |
| `DEFAULT_PAGE` | US Letter page defaults (0.5 in margin, 0.25 in gap). |
| `MINI_CD_LABEL` | Mini CD jewel-case label size (3.4375 x 3.3125 in). |

Fit modes: `fill` (center-crop, default), `fit` (letterbox), `stretch`. Crop marks
are drawn by default.

## License

MIT
