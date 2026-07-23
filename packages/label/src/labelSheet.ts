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

/**
 * Split labels across as many pages as needed, packing each page left-to-right.
 * Unlike {@link layoutLabels}, this never throws for overflow: it starts a new
 * page whenever the next label would not fit. It still throws if a single label
 * is larger than the usable page area.
 */
export function paginateLabels(items: LabelItem[], page: LabelPage): LabelItem[][] {
  if (page.marginIn * 2 >= page.widthIn || page.marginIn * 2 >= page.heightIn) {
    throw new Error('Margins are too large for the page size.');
  }

  const maxX = page.widthIn - page.marginIn;
  const maxY = page.heightIn - page.marginIn;
  const usableWidth = page.widthIn - page.marginIn * 2;
  const usableHeight = page.heightIn - page.marginIn * 2;

  const pages: LabelItem[][] = [];
  let current: LabelItem[] = [];
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
    if (item.heightIn > usableHeight + 1e-4) {
      throw new Error(`Label is too tall for the page: ${item.heightIn} in.`);
    }

    if (x + item.widthIn > maxX + 1e-4) {
      x = page.marginIn;
      y += rowHeight + page.gapIn;
      rowHeight = 0;
    }
    if (y + item.heightIn > maxY + 1e-4) {
      if (current.length > 0) pages.push(current);
      current = [];
      x = page.marginIn;
      y = page.marginIn;
      rowHeight = 0;
    }

    current.push(item);
    x += item.widthIn + page.gapIn;
    rowHeight = Math.max(rowHeight, item.heightIn);
  }

  if (current.length > 0) pages.push(current);
  return pages;
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

/**
 * Render label sheets across as many pages as the items require. Each returned
 * sheet is a full, self-contained SVG page; use this instead of
 * {@link renderLabelSheet} when a batch may overflow a single page.
 */
export function renderLabelSheets(options: RenderLabelSheetOptions): LabelSheet[] {
  if (options.items.length === 0) {
    throw new Error('At least one label is required.');
  }
  const page: LabelPage = { ...DEFAULT_PAGE, ...(options.page ?? {}) };
  const pages = paginateLabels(options.items, page);
  return pages.map((items) =>
    renderLabelSheet({
      items,
      page,
      ...(options.cropMarks !== undefined ? { cropMarks: options.cropMarks } : {}),
    }),
  );
}

/* ------------------------------------------------------------------------- *
 * Label templates: named page + shape + layout presets.
 *
 * A template is plain data, so new label stock is added by describing it, not by
 * writing render code. Rectangular jewel-case inserts pack left-to-right on US
 * Letter; disc labels use fixed die-cut grid positions (for example a HERMA
 * CD-label sheet) and are clipped to a circle with a blank center hole.
 * ------------------------------------------------------------------------- */

/** The outline shape of a label. */
export type LabelShape = 'rect' | 'disc';

/** How a template places labels on the sheet. */
export type LabelLayout =
  | { kind: 'pack'; marginIn: number; gapIn: number }
  | {
      kind: 'grid';
      columns: number;
      rows: number;
      /** Center of the top-left label, from the sheet's top-left corner (inches). */
      firstCenterXIn: number;
      firstCenterYIn: number;
      /** Center-to-center spacing between columns and rows (inches). */
      pitchXIn: number;
      pitchYIn: number;
    };

/** A named label preset: sheet size, label shape/size, and how they lay out. */
export interface LabelTemplate {
  id: string;
  name: string;
  page: { widthIn: number; heightIn: number };
  shape: LabelShape;
  /** Printed label size in inches (diameter when {@link shape} is `disc`). */
  widthIn: number;
  heightIn: number;
  /** Center-hole diameter for a disc label, in inches. */
  holeDiameterIn?: number;
  layout: LabelLayout;
  /** Draw faint alignment outlines. Defaults to off (pre-die-cut sheets). */
  guides?: boolean;
}

const MM_PER_INCH = 25.4;
const mm = (value: number): number => value / MM_PER_INCH;

/** A4 sheet, in inches. */
export const A4_PAGE = { widthIn: mm(210), heightIn: mm(297) } as const;
/** US Letter sheet, in inches. */
export const LETTER_PAGE = { widthIn: 8.5, heightIn: 11 } as const;

/**
 * Built-in label templates. Rectangular jewel-case sizes print on US Letter and
 * pack left-to-right; the disc template matches a pre-die-cut A4 CD-label sheet
 * (HERMA 8619: six Ø78 mm discs in a 2 x 3 grid), printed with a small bleed so
 * the art reaches the cut edge and a blank hub hole.
 */
export const BUILTIN_LABEL_TEMPLATES: LabelTemplate[] = [
  {
    id: 'mini-cd-jewel',
    name: 'Mini CD jewel insert (3.44 in)',
    page: LETTER_PAGE,
    shape: 'rect',
    widthIn: MINI_CD_LABEL.widthIn,
    heightIn: MINI_CD_LABEL.heightIn,
    layout: { kind: 'pack', marginIn: 0.5, gapIn: 0.25 },
  },
  {
    id: 'square-3',
    name: 'Square (3 in)',
    page: LETTER_PAGE,
    shape: 'rect',
    widthIn: 3,
    heightIn: 3,
    layout: { kind: 'pack', marginIn: 0.5, gapIn: 0.25 },
  },
  {
    id: 'square-4',
    name: 'Square (4 in)',
    page: LETTER_PAGE,
    shape: 'rect',
    widthIn: 4,
    heightIn: 4,
    layout: { kind: 'pack', marginIn: 0.5, gapIn: 0.25 },
  },
  {
    id: 'cd-jewel',
    name: 'CD jewel insert (4.75 in)',
    page: LETTER_PAGE,
    shape: 'rect',
    widthIn: 4.75,
    heightIn: 4.75,
    layout: { kind: 'pack', marginIn: 0.5, gapIn: 0.25 },
  },
  {
    id: 'herma-8619-cd-a4',
    name: 'CD/DVD disc labels - 78 mm, 6 per A4 sheet (HERMA 8619)',
    page: A4_PAGE,
    shape: 'disc',
    // 80 mm printed diameter = a ~1 mm bleed over the 78 mm die-cut, so the art
    // reaches the cut edge with a little overprint rather than a white ring.
    widthIn: mm(80),
    heightIn: mm(80),
    holeDiameterIn: mm(17),
    layout: {
      kind: 'grid',
      columns: 2,
      rows: 3,
      firstCenterXIn: mm(59),
      firstCenterYIn: mm(59),
      pitchXIn: mm(92),
      pitchYIn: mm(89.5),
    },
  },
];

/** Look up a built-in label template by id. */
export function getLabelTemplate(id: string): LabelTemplate | undefined {
  return BUILTIN_LABEL_TEMPLATES.find((template) => template.id === id);
}

/** Options for {@link renderTemplateSheets}. */
export interface RenderTemplateOptions {
  template: LabelTemplate;
  /** Cover image hrefs (usually `data:` URIs), already expanded for copies. */
  covers: string[];
  /** How each cover fills its label. Defaults to `fill`. */
  fit?: LabelFit;
}

/**
 * Render one or more printable sheets for a template and a list of covers.
 * `pack` templates flow left-to-right and overflow onto more Letter pages;
 * `grid` templates place covers at fixed die-cut positions, a page at a time.
 */
export function renderTemplateSheets(options: RenderTemplateOptions): LabelSheet[] {
  const { template, covers } = options;
  if (covers.length === 0) {
    throw new Error('At least one cover is required.');
  }
  const fit = options.fit ?? 'fill';
  const layout = template.layout;

  if (layout.kind === 'pack') {
    const page: LabelPage = {
      widthIn: template.page.widthIn,
      heightIn: template.page.heightIn,
      marginIn: layout.marginIn,
      gapIn: layout.gapIn,
    };
    const items: LabelItem[] = covers.map((imageHref) => ({
      imageHref,
      widthIn: template.widthIn,
      heightIn: template.heightIn,
      fit,
    }));
    return renderLabelSheets({ items, page });
  }

  const perPage = layout.columns * layout.rows;
  const pages: LabelSheet[] = [];
  for (let start = 0; start < covers.length; start += perPage) {
    pages.push(renderGridSheet(template, layout, covers.slice(start, start + perPage), fit));
  }
  return pages;
}

/** Render a single fixed-grid sheet (used for die-cut disc/rect label stock). */
function renderGridSheet(
  template: LabelTemplate,
  grid: Extract<LabelLayout, { kind: 'grid' }>,
  covers: string[],
  fit: LabelFit,
): LabelSheet {
  const toUnits = (inches: number): number => round2(inches * UNITS_PER_INCH);
  const pageW = toUnits(template.page.widthIn);
  const pageH = toUnits(template.page.heightIn);
  const par = fitToPreserveAspectRatio(fit);
  const w = toUnits(template.widthIn);
  const h = toUnits(template.heightIn);
  const isDisc = template.shape === 'disc';
  const holeR = isDisc && template.holeDiameterIn ? round2((template.holeDiameterIn / 2) * UNITS_PER_INCH) : 0;

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${template.page.widthIn}in" height="${template.page.heightIn}in" viewBox="0 0 ${pageW} ${pageH}">`,
    `<rect x="0" y="0" width="${pageW}" height="${pageH}" fill="#ffffff"/>`,
  ];
  const defs: string[] = [];
  const placements: LabelPlacement[] = [];

  covers.forEach((imageHref, index) => {
    const col = index % grid.columns;
    const row = Math.floor(index / grid.columns);
    const centerXIn = grid.firstCenterXIn + col * grid.pitchXIn;
    const centerYIn = grid.firstCenterYIn + row * grid.pitchYIn;
    const xIn = centerXIn - template.widthIn / 2;
    const yIn = centerYIn - template.heightIn / 2;
    const cx = toUnits(centerXIn);
    const cy = toUnits(centerYIn);
    const x = toUnits(xIn);
    const y = toUnits(yIn);
    placements.push({ xIn: round2(xIn), yIn: round2(yIn), widthIn: template.widthIn, heightIn: template.heightIn });

    if (isDisc) {
      const r = round2(w / 2);
      const clipId = `omd-disc-${index}`;
      defs.push(`<clipPath id="${clipId}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`);
      parts.push(
        `<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${par}" clip-path="url(#${clipId})" href="${xmlEscape(imageHref)}"/>`,
      );
      if (template.guides) {
        parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#9a9a9a" stroke-width="0.4"/>`);
      }
      if (holeR > 0) {
        parts.push(`<circle cx="${cx}" cy="${cy}" r="${holeR}" fill="#ffffff"/>`);
        if (template.guides) {
          parts.push(`<circle cx="${cx}" cy="${cy}" r="${holeR}" fill="none" stroke="#9a9a9a" stroke-width="0.4"/>`);
        }
      }
    } else {
      parts.push(
        `<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${par}" href="${xmlEscape(imageHref)}"/>`,
      );
      if (template.guides) {
        parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#9a9a9a" stroke-width="0.4"/>`);
      }
    }
  });

  if (defs.length) parts.splice(1, 0, `<defs>${defs.join('')}</defs>`);
  parts.push('</svg>');

  const page: LabelPage = {
    widthIn: template.page.widthIn,
    heightIn: template.page.heightIn,
    marginIn: 0,
    gapIn: 0,
  };
  return { svg: parts.join('\n'), page, placements };
}
