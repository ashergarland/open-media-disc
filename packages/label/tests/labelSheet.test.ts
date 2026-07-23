import { describe, expect, it } from 'vitest';
import {
  BUILTIN_LABEL_TEMPLATES,
  DEFAULT_PAGE,
  MINI_CD_LABEL,
  getLabelTemplate,
  layoutLabels,
  paginateLabels,
  renderLabelSheet,
  renderLabelSheets,
  renderTemplateSheets,
  type LabelItem,
} from '../src/index.js';

function coverItem(overrides: Partial<LabelItem> = {}): LabelItem {
  return {
    imageHref: 'data:image/png;base64,AAAA',
    widthIn: MINI_CD_LABEL.widthIn,
    heightIn: MINI_CD_LABEL.heightIn,
    fit: 'fill',
    ...overrides,
  };
}

describe('renderLabelSheet', () => {
  it('renders a Letter-sized SVG with one label at the top-left margin', () => {
    const sheet = renderLabelSheet({ items: [coverItem()] });

    expect(sheet.svg).toContain('width="8.5in"');
    expect(sheet.svg).toContain('height="11in"');
    expect(sheet.svg).toContain('viewBox="0 0 850 1100"');
    expect(sheet.placements).toHaveLength(1);
    expect(sheet.placements[0]!.xIn).toBeCloseTo(0.5);
    expect(sheet.placements[0]!.yIn).toBeCloseTo(0.5);
    expect(sheet.svg).toContain('<image ');
    expect(sheet.svg).toContain('data:image/png;base64,AAAA');
  });

  it('maps fit to preserveAspectRatio', () => {
    expect(renderLabelSheet({ items: [coverItem({ fit: 'fill' })] }).svg).toContain(
      'preserveAspectRatio="xMidYMid slice"',
    );
    expect(renderLabelSheet({ items: [coverItem({ fit: 'fit' })] }).svg).toContain(
      'preserveAspectRatio="xMidYMid meet"',
    );
    expect(renderLabelSheet({ items: [coverItem({ fit: 'stretch' })] }).svg).toContain(
      'preserveAspectRatio="none"',
    );
  });

  it('includes crop marks by default and omits them when disabled', () => {
    expect(renderLabelSheet({ items: [coverItem()] }).svg).toContain('<line ');
    expect(renderLabelSheet({ items: [coverItem()], cropMarks: false }).svg).not.toContain('<line ');
  });

  it('places a second label in the same row when it fits, then wraps', () => {
    const sheet = renderLabelSheet({ items: [coverItem(), coverItem()] });
    expect(sheet.placements).toHaveLength(2);
    expect(sheet.placements[1]!.yIn).toBeCloseTo(sheet.placements[0]!.yIn);
    expect(sheet.placements[1]!.xIn).toBeGreaterThan(sheet.placements[0]!.xIn);
  });

  it('escapes XML-special characters in the image href', () => {
    const sheet = renderLabelSheet({
      items: [coverItem({ imageHref: 'data:image/png;base64,AA&<>"BB' })],
    });
    expect(sheet.svg).toContain('AA&amp;&lt;&gt;&quot;BB');
  });

  it('throws when no items are provided', () => {
    expect(() => renderLabelSheet({ items: [] })).toThrow(/at least one/i);
  });
});

describe('layoutLabels', () => {
  it('throws when a label is wider than the usable page width', () => {
    expect(() =>
      layoutLabels([{ imageHref: 'x', widthIn: 9, heightIn: 3 }], DEFAULT_PAGE),
    ).toThrow(/too wide/i);
  });

  it('throws when the labels do not fit on one page', () => {
    const many = Array.from({ length: 20 }, () => ({
      imageHref: 'x',
      widthIn: MINI_CD_LABEL.widthIn,
      heightIn: MINI_CD_LABEL.heightIn,
    }));
    expect(() => layoutLabels(many, DEFAULT_PAGE)).toThrow(/do not fit/i);
  });
});

describe('paginateLabels', () => {
  it('splits a batch that overflows one page across multiple pages', () => {
    const many = Array.from({ length: 20 }, () => coverItem());
    const pages = paginateLabels(many, DEFAULT_PAGE);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.reduce((total, group) => total + group.length, 0)).toBe(20);
    expect(pages[0]).toHaveLength(4);
  });

  it('keeps a small batch on a single page', () => {
    const pages = paginateLabels([coverItem(), coverItem(), coverItem()], DEFAULT_PAGE);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveLength(3);
  });
});

describe('renderLabelSheets', () => {
  it('renders one full SVG page per paginated page', () => {
    const many = Array.from({ length: 20 }, () => coverItem());
    const sheets = renderLabelSheets({ items: many });
    expect(sheets).toHaveLength(paginateLabels(many, DEFAULT_PAGE).length);
    for (const sheet of sheets) {
      expect(sheet.svg).toContain('width="8.5in"');
      expect(sheet.svg).toContain('<image ');
    }
  });

  it('throws when no items are provided', () => {
    expect(() => renderLabelSheets({ items: [] })).toThrow(/at least one/i);
  });
});

describe('label templates', () => {
  const cover = 'data:image/png;base64,AAAA';

  it('exposes the built-in HERMA disc template', () => {
    const template = getLabelTemplate('herma-8619-cd-a4');
    expect(template).toBeDefined();
    expect(template!.shape).toBe('disc');
    expect(template!.layout.kind).toBe('grid');
    expect(BUILTIN_LABEL_TEMPLATES.some((t) => t.id === 'mini-cd-jewel')).toBe(true);
  });

  it('renders a disc sheet as an A4 page with clipped circles and a blank hole', () => {
    const template = getLabelTemplate('herma-8619-cd-a4')!;
    const sheets = renderTemplateSheets({ template, covers: [cover, cover] });
    expect(sheets).toHaveLength(1);
    const svg = sheets[0]!.svg;
    // A4 in inches (210 x 297 mm).
    expect(svg).toContain(`width="${template.page.widthIn}in"`);
    expect(svg).toContain('<clipPath');
    expect(svg).toContain('<circle');
    // Two covers placed, both clipped.
    expect(svg.match(/<image /g)).toHaveLength(2);
    // Top-left disc center at 59 mm = 2.3228 in -> 232.28 units.
    expect(svg).toContain('cx="232.28"');
  });

  it('paginates a disc grid at six labels per A4 sheet', () => {
    const template = getLabelTemplate('herma-8619-cd-a4')!;
    const covers = Array.from({ length: 7 }, () => cover);
    const sheets = renderTemplateSheets({ template, covers });
    expect(sheets).toHaveLength(2);
    expect(sheets[0]!.placements).toHaveLength(6);
    expect(sheets[1]!.placements).toHaveLength(1);
  });

  it('renders rectangular pack templates on Letter', () => {
    const template = getLabelTemplate('mini-cd-jewel')!;
    const sheets = renderTemplateSheets({ template, covers: [cover] });
    expect(sheets[0]!.svg).toContain('width="8.5in"');
    expect(sheets[0]!.svg).not.toContain('<clipPath');
  });

  it('throws when no covers are provided', () => {
    const template = getLabelTemplate('herma-8619-cd-a4')!;
    expect(() => renderTemplateSheets({ template, covers: [] })).toThrow(/at least one/i);
  });
});
