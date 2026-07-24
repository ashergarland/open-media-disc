# @open-media-disc/label

The label generator behind [Open Media Disc](../../README.md). It turns an OMD
package into a printable **album-art label sheet** as SVG, sized in real inches so
it prints at true physical size. It is cross-platform and dependency-free, and it
powers both the `omd label` CLI and OMD Studio.

## Install

```bash
pnpm add @open-media-disc/label
```

## Quick start

```ts
import { buildPackageLabelSheet } from '@open-media-disc/label';
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
| `buildPackagesLabelSheet(options)` | Read many packages and lay their covers across as many pages as needed. Pass a `template` to use a preset, and `extraCovers` to add custom images. |
| `renderLabelSheet(options)` | Render a single sheet from raw label items (image href + size + fit). |
| `renderLabelSheets(options)` | Render label items across multiple pages when they overflow one sheet. |
| `renderTemplateSheets(options)` | Render sheets for a `LabelTemplate` and a list of cover hrefs (supports disc labels). |
| `BUILTIN_LABEL_TEMPLATES` | Built-in templates: jewel-case sizes plus a die-cut disc sheet. |
| `getLabelTemplate(id)` | Look up a built-in template by id. |
| `layoutLabels(items, page)` | Pack labels into rows within the page margins (single page). |
| `paginateLabels(items, page)` | Split labels across pages, packing each page in turn. |
| `DEFAULT_PAGE` | US Letter page defaults (0.5 in margin, 0.25 in gap). |
| `A4_PAGE` / `LETTER_PAGE` | Sheet sizes in inches. |
| `MINI_CD_LABEL` | Mini CD jewel-case label size (3.4375 x 3.3125 in). |

Fit modes: `fill` (center-crop, default), `fit` (letterbox), `stretch`. Crop marks
are drawn by default. Use `buildPackagesLabelSheet` / `renderLabelSheets` for batch
sheets that overflow onto additional pages.

## Templates

A `LabelTemplate` is plain data describing a sheet: page size, label `shape`
(`rect` or `disc`), label size (a diameter for discs, plus an optional
`holeDiameterIn` for the center cutout), and a `layout` that is either `pack`
(flow left-to-right, for loose-cut stock) or `grid` (fixed die-cut positions).
Disc labels clip the cover art to a circle and blank the hub hole.

Built-ins include the jewel-case sizes and `herma-8619-cd-a4`: six Ø78 mm CD/DVD
discs in a 2 x 3 grid on A4, printed with a small bleed so the art reaches the
die-cut edge. Adding new stock is just another data entry with its measurements.

```ts
import { buildPackagesLabelSheet, getLabelTemplate } from '@open-media-disc/label';

const result = await buildPackagesLabelSheet({
  packages: [{ packageDir: './build/OMD-000001', copies: 6 }],
  template: getLabelTemplate('herma-8619-cd-a4'),
});
// result.pages is one SVG per printable A4 sheet.
```

Print grid (die-cut) sheets at **100% / actual size** so the print lines up with
the pre-cut labels.

## License

MIT
