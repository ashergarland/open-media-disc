/**
 * Printable label sheets as SVG.
 *
 * This module is pure and dependency-free: it turns label items into an SVG
 * string sized in real inches, so it renders and prints at true physical size on
 * any platform (browsers, Electron, print pipelines). Measurements follow the
 * reference print layout: a US Letter sheet of mini CD jewel-case labels with
 * corner crop marks.
 */

/** Page geometry, in inches. */
export interface LabelPage {
  widthIn: number;
  heightIn: number;
  marginIn: number;
  gapIn: number;
}

/** How a cover image fills its label rectangle. */
export type LabelFit = 'fill' | 'fit' | 'stretch';

/** A single label to place on the sheet. */
export interface LabelItem {
  /** Image reference for the SVG `<image>` element, usually a `data:` URI. */
  imageHref: string;
  /** Label width in inches. */
  widthIn: number;
  /** Label height in inches. */
  heightIn: number;
  /** Image fit within the label. Defaults to `fill` (center-crop). */
  fit?: LabelFit;
}

/** Options for {@link renderLabelSheet}. */
export interface RenderLabelSheetOptions {
  items: LabelItem[];
  page?: Partial<LabelPage>;
  /** Draw a cut outline and corner crop marks. Defaults to `true`. */
  cropMarks?: boolean;
}

/** A placed label on the sheet, in inches. */
export interface LabelPlacement {
  xIn: number;
  yIn: number;
  widthIn: number;
  heightIn: number;
}

/** Result of {@link renderLabelSheet}. */
export interface LabelSheet {
  svg: string;
  page: LabelPage;
  placements: LabelPlacement[];
}

/** US Letter page defaults, matching the reference print layout. */
export const DEFAULT_PAGE: LabelPage = {
  widthIn: 8.5,
  heightIn: 11,
  marginIn: 0.5,
  gapIn: 0.25,
};

/** Default label size: a mini CD jewel-case insert (3-7/16 x 3-5/16 inch). */
export const MINI_CD_LABEL = { widthIn: 3.4375, heightIn: 3.3125 } as const;

/** SVG user units per inch. One unit is 0.01 inch, keeping coordinates tidy. */
const UNITS_PER_INCH = 100;

/** Crop-mark geometry in SVG units (0.14 inch tick, 0.04 inch offset). */
const CROP_MARK = 14;
const CROP_OFFSET = 4;

function fitToPreserveAspectRatio(fit: LabelFit): string {
  switch (fit) {
    case 'fit':
      return 'xMidYMid meet';
    case 'stretch':
      return 'none';
    case 'fill':
    default:
      return 'xMidYMid slice';
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Pack labels left-to-right, wrapping to new rows, within the page margins.
 * Throws if a label is too wide or the set does not fit on one page.
 */
export function layoutLabels(items: LabelItem[], page: LabelPage): LabelPlacement[] {
  if (page.marginIn * 2 >= page.widthIn || page.marginIn * 2 >= page.heightIn) {
    throw new Error('Margins are too large for the page size.');
  }

  const maxX = page.widthIn - page.marginIn;
  const maxY = page.heightIn - page.marginIn;
  const usableWidth = page.widthIn - page.marginIn * 2;

  const placements: LabelPlacement[] = [];
  let x = page.marginIn;
  let y = page.marginIn;
  let rowHeight = 0;

  for (const item of items) {
    if (item.widthIn <= 0 || item.heightIn <= 0) {
      throw new Error('Label dimensions must be greater than zero.');
    }
    if (item.widthIn > usableWidth + 1e-4) {
      throw new Error(`Label is too wide for the page: ${item.widthIn} in.`);
    }

    if (x + item.widthIn > maxX + 1e-4) {
      x = page.marginIn;
      y += rowHeight + page.gapIn;
      rowHeight = 0;
    }
    if (y + item.heightIn > maxY + 1e-4) {
      throw new Error('Labels do not fit on one page. Use fewer or smaller labels.');
    }

    placements.push({ xIn: x, yIn: y, widthIn: item.widthIn, heightIn: item.heightIn });
    x += item.widthIn + page.gapIn;
    rowHeight = Math.max(rowHeight, item.heightIn);
  }

  return placements;
}

function cropMarksSvg(x: number, y: number, w: number, h: number): string {
  const tick = 'stroke="#3a3a3a" stroke-width="0.5"';
  return [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#5a5a5a" stroke-width="0.5" stroke-opacity="0.6"/>`,
    `<line x1="${x - CROP_OFFSET - CROP_MARK}" y1="${y}" x2="${x - CROP_OFFSET}" y2="${y}" ${tick}/>`,
    `<line x1="${x}" y1="${y - CROP_OFFSET - CROP_MARK}" x2="${x}" y2="${y - CROP_OFFSET}" ${tick}/>`,
    `<line x1="${x + w + CROP_OFFSET}" y1="${y}" x2="${x + w + CROP_OFFSET + CROP_MARK}" y2="${y}" ${tick}/>`,
    `<line x1="${x + w}" y1="${y - CROP_OFFSET - CROP_MARK}" x2="${x + w}" y2="${y - CROP_OFFSET}" ${tick}/>`,
    `<line x1="${x - CROP_OFFSET - CROP_MARK}" y1="${y + h}" x2="${x - CROP_OFFSET}" y2="${y + h}" ${tick}/>`,
    `<line x1="${x}" y1="${y + h + CROP_OFFSET}" x2="${x}" y2="${y + h + CROP_OFFSET + CROP_MARK}" ${tick}/>`,
    `<line x1="${x + w + CROP_OFFSET}" y1="${y + h}" x2="${x + w + CROP_OFFSET + CROP_MARK}" y2="${y + h}" ${tick}/>`,
    `<line x1="${x + w}" y1="${y + h + CROP_OFFSET}" x2="${x + w}" y2="${y + h + CROP_OFFSET + CROP_MARK}" ${tick}/>`,
  ].join('\n');
}

/**
 * Render a printable label sheet as an SVG string sized in real inches.
 * Covers are placed with `fill` (center-crop) by default; `fit` letterboxes and
 * `stretch` distorts. Corner crop marks are drawn unless disabled.
 */
export function renderLabelSheet(options: RenderLabelSheetOptions): LabelSheet {
  if (options.items.length === 0) {
    throw new Error('At least one label is required.');
  }

  const page: LabelPage = { ...DEFAULT_PAGE, ...(options.page ?? {}) };
  const placements = layoutLabels(options.items, page);
  const cropMarks = options.cropMarks !== false;

  const toUnits = (inches: number): number => round2(inches * UNITS_PER_INCH);
  const pageW = toUnits(page.widthIn);
  const pageH = toUnits(page.heightIn);

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${page.widthIn}in" height="${page.heightIn}in" viewBox="0 0 ${pageW} ${pageH}">`,
    `<rect x="0" y="0" width="${pageW}" height="${pageH}" fill="#ffffff"/>`,
  ];

  options.items.forEach((item, index) => {
    const placement = placements[index]!;
    const x = toUnits(placement.xIn);
    const y = toUnits(placement.yIn);
    const w = toUnits(placement.widthIn);
    const h = toUnits(placement.heightIn);
    const par = fitToPreserveAspectRatio(item.fit ?? 'fill');
    parts.push(
      `<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${par}" href="${xmlEscape(item.imageHref)}"/>`,
    );
    if (cropMarks) {
      parts.push(cropMarksSvg(x, y, w, h));
    }
  });

  parts.push('</svg>');
  return { svg: parts.join('\n'), page, placements };
}
