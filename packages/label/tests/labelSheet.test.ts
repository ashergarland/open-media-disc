import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE,
  MINI_CD_LABEL,
  layoutLabels,
  renderLabelSheet,
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
