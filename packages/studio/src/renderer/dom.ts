/**
 * Tiny DOM helpers for the renderer.
 *
 * Everything is built with `textContent` and typed properties, never
 * `innerHTML`, so untrusted values can never inject markup. Dynamic inline
 * styles are set through the CSSOM (`element.style.setProperty`) by callers, not
 * via `style` attributes, to stay within the strict Content-Security-Policy.
 */

type ElValue = string | number | boolean | EventListener | null | undefined;

/** Create an element, assigning attributes, `class`, `text`, and `on*` handlers. */
export function el(
  tag: string,
  attrs: Record<string, ElValue> = {},
  children: (Node | string)[] = [],
): HTMLElement {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') {
      node.className = String(value);
    } else if (key === 'text') {
      node.textContent = String(value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) {
      node.setAttribute(key, '');
    } else {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of children) node.append(child);
  return node;
}

/** Remove all children of a node. */
export function clearChildren(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function shape(tag: string, attrs: Record<string, string>): SVGElement {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

export type IconName =
  | 'create'
  | 'player'
  | 'catalog'
  | 'themes'
  | 'settings'
  | 'shuffle'
  | 'prev'
  | 'play'
  | 'pause'
  | 'next'
  | 'repeat'
  | 'volume'
  | 'note'
  | 'wave'
  | 'check'
  | 'chevron-left'
  | 'chevron-right'
  | 'drive'
  | 'folder'
  | 'rip'
  | 'disc'
  | 'label';

interface IconDef {
  viewBox: string;
  shapes: SVGElement[];
}

/** Showcase Icon Library glyphs (paths lifted verbatim from the visual-theme showcases). */
function iconDef(name: IconName): IconDef {
  switch (name) {
    case 'create': // Write Disc
      return {
        viewBox: '0 0 64 64',
        shapes: [
          shape('circle', { cx: '32', cy: '32', r: '24', fill: 'none', stroke: 'currentColor', 'stroke-width': '3.2' }),
          shape('circle', { cx: '32', cy: '32', r: '7', fill: 'none', stroke: 'currentColor', 'stroke-width': '3.2' }),
          shape('path', { d: 'M32 8 A24 24 0 0 1 56 32', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.4', 'stroke-linecap': 'round' }),
        ],
      };
    case 'player':
    case 'play':
      return {
        viewBox: '0 0 24 24',
        shapes: [shape('path', { d: 'M8 5v14l11-7Z', fill: 'currentColor' })],
      };
    case 'pause':
      return {
        viewBox: '0 0 24 24',
        shapes: [
          shape('rect', { x: '5', y: '4', width: '5', height: '16', rx: '1.6', fill: 'currentColor' }),
          shape('rect', { x: '14', y: '4', width: '5', height: '16', rx: '1.6', fill: 'currentColor' }),
        ],
      };
    case 'prev':
      return {
        viewBox: '0 0 24 24',
        shapes: [
          shape('path', { d: 'M7 6v12', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.5', 'stroke-linecap': 'round' }),
          shape('path', { d: 'M17.5 6l-7 6l7 6V6Z', fill: 'currentColor' }),
          shape('path', { d: 'M12.3 6l-7 6l7 6V6Z', fill: 'currentColor' }),
        ],
      };
    case 'next':
      return {
        viewBox: '0 0 24 24',
        shapes: [
          shape('path', { d: 'M17 6v12', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.5', 'stroke-linecap': 'round' }),
          shape('path', { d: 'M6.5 6l7 6l-7 6V6Z', fill: 'currentColor' }),
          shape('path', { d: 'M11.7 6l7 6l-7 6V6Z', fill: 'currentColor' }),
        ],
      };
    case 'shuffle':
      return {
        viewBox: '0 0 24 24',
        shapes: [
          shape('path', { d: 'M3 7h3c2.3 0 3.6.5 5 2.2L16 15', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
          shape('path', { d: 'M16 7l4 0l-2.5 2.5', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
          shape('path', { d: 'M3 17h3c2.3 0 3.6-.5 5-2.2L16 9', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
          shape('path', { d: 'M16 17h4l-2.5-2.5', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
        ],
      };
    case 'repeat':
      return {
        viewBox: '0 0 24 24',
        shapes: [
          shape('polyline', { points: '17 1 21 5 17 9', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
          shape('path', { d: 'M3 11V9a4 4 0 0 1 4-4h14', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
          shape('polyline', { points: '7 23 3 19 7 15', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
          shape('path', { d: 'M21 13v2a4 4 0 0 1-4 4H3', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
        ],
      };
    case 'volume':
      return {
        viewBox: '0 0 24 24',
        shapes: [
          shape('path', { d: 'M4 9.5h3.2L12 5.5v13l-4.8-4H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z', fill: 'currentColor' }),
          shape('path', { d: 'M15.5 9a4 4 0 0 1 0 6', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' }),
          shape('path', { d: 'M18 6.5a7.5 7.5 0 0 1 0 11', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' }),
        ],
      };
    case 'catalog': // Library (record shelf)
      return {
        viewBox: '0 0 48 48',
        shapes: [
          shape('rect', { x: '9', y: '12', width: '6', height: '26', rx: '1.6', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.6' }),
          shape('rect', { x: '18', y: '9', width: '6', height: '29', rx: '1.6', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.6' }),
          shape('rect', { x: '27', y: '14', width: '6', height: '24', rx: '1.6', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.6' }),
          shape('path', { d: 'M6 40h37', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.6', 'stroke-linecap': 'round' }),
        ],
      };
    case 'themes': // Palette
      return {
        viewBox: '0 0 24 24',
        shapes: [
          shape('path', { d: 'M12 3.2c-5 0-9 3.6-9 8 0 3.4 2.8 5.8 6 5.8.9 0 1.6.7 1.6 1.6 0 .4-.2.8-.4 1.1-.2.3-.4.6-.4 1 0 .8.7 1.3 1.6 1.3 4.8 0 8-3.4 8-8.2 0-4.8-4-11-9-11Z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linejoin': 'round' }),
          shape('circle', { cx: '7.5', cy: '12', r: '1.1', fill: 'currentColor' }),
          shape('circle', { cx: '9.5', cy: '8', r: '1.1', fill: 'currentColor' }),
          shape('circle', { cx: '14.5', cy: '7.6', r: '1.1', fill: 'currentColor' }),
          shape('circle', { cx: '17', cy: '10.8', r: '1.1', fill: 'currentColor' }),
        ],
      };
    case 'settings': // Gear
      return {
        viewBox: '0 0 48 48',
        shapes: [
          shape('circle', { cx: '24', cy: '24', r: '6', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.8' }),
          shape('path', { d: 'M24 8v5M24 35v5M8 24h5M35 24h5M13 13l3.5 3.5M31.5 31.5L35 35M35 13l-3.5 3.5M16.5 31.5L13 35', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.6', 'stroke-linecap': 'round' }),
        ],
      };
    case 'label': // Tag
      return {
        viewBox: '0 0 24 24',
        shapes: [
          shape('path', { d: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7-7A2 2 0 0 1 3 12.2V5a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6l7 7a2 2 0 0 1 0 2.8Z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linejoin': 'round' }),
          shape('circle', { cx: '7.8', cy: '7.8', r: '1.5', fill: 'currentColor' }),
        ],
      };
    case 'drive': // Optical Drive
      return {
        viewBox: '0 0 24 24',
        shapes: [
          shape('rect', { x: '3', y: '6.5', width: '18', height: '11', rx: '2', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8' }),
          shape('line', { x1: '7', y1: '12', x2: '13', y2: '12', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' }),
          shape('circle', { cx: '17', cy: '12', r: '1.2', fill: 'currentColor' }),
        ],
      };
    case 'folder': // Open folder
      return {
        viewBox: '0 0 24 24',
        shapes: [
          shape('path', { d: 'M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2h7A1.5 1.5 0 0 1 19 8.5V9', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }),
          shape('path', { d: 'M2.6 10.5A1.4 1.4 0 0 1 4 9h16a1.4 1.4 0 0 1 1.35 1.76l-1.6 6A1.6 1.6 0 0 1 18.2 18H4.8a1.6 1.6 0 0 1-1.55-1.2l-1.2-4.8A1.4 1.4 0 0 1 2.6 10.5Z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linejoin': 'round' }),
        ],
      };
    case 'rip': // Rip disc to disk (disc + down arrow)
      return {
        viewBox: '0 0 24 24',
        shapes: [
          shape('circle', { cx: '12', cy: '8', r: '5.5', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8' }),
          shape('circle', { cx: '12', cy: '8', r: '1.5', fill: 'currentColor' }),
          shape('path', { d: 'M12 15.5V21M9.3 18.3 12 21l2.7-2.7', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
        ],
      };
    case 'disc': // Optical disc
      return {
        viewBox: '0 0 24 24',
        shapes: [
          shape('circle', { cx: '12', cy: '12', r: '9', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8' }),
          shape('circle', { cx: '12', cy: '12', r: '2.4', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8' }),
          shape('path', { d: 'M8.4 5.2A7.2 7.2 0 0 1 12 4.4', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round' }),
        ],
      };
    case 'note': // Tracks (music note)
      return {
        viewBox: '0 0 24 24',
        shapes: [
          shape('path', { d: 'M9 18V5l10-2v13', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linejoin': 'round' }),
          shape('circle', { cx: '6', cy: '18', r: '3', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8' }),
          shape('circle', { cx: '16', cy: '16', r: '3', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8' }),
        ],
      };
    case 'wave': // FLAC waveform
      return {
        viewBox: '0 0 24 24',
        shapes: [
          shape('line', { x1: '5', y1: '9', x2: '5', y2: '15', stroke: 'currentColor', 'stroke-width': '1.9', 'stroke-linecap': 'round' }),
          shape('line', { x1: '9', y1: '5', x2: '9', y2: '19', stroke: 'currentColor', 'stroke-width': '1.9', 'stroke-linecap': 'round' }),
          shape('line', { x1: '13', y1: '8', x2: '13', y2: '16', stroke: 'currentColor', 'stroke-width': '1.9', 'stroke-linecap': 'round' }),
          shape('line', { x1: '17', y1: '4', x2: '17', y2: '20', stroke: 'currentColor', 'stroke-width': '1.9', 'stroke-linecap': 'round' }),
          shape('line', { x1: '21', y1: '9', x2: '21', y2: '15', stroke: 'currentColor', 'stroke-width': '1.9', 'stroke-linecap': 'round' }),
        ],
      };
    case 'check': // Verified
      return {
        viewBox: '0 0 24 24',
        shapes: [
          shape('circle', { cx: '12', cy: '12', r: '9.5', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.9' }),
          shape('path', { d: 'M8 12.4l2.6 2.6L16 9.5', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.1', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
        ],
      };
    case 'chevron-right':
      return {
        viewBox: '0 0 24 36',
        shapes: [shape('path', { d: 'M6 4 L18 18 L6 32', fill: 'none', stroke: 'currentColor', 'stroke-width': '3.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })],
      };
    case 'chevron-left':
      return {
        viewBox: '0 0 24 36',
        shapes: [shape('path', { d: 'M18 4 L6 18 L18 32', fill: 'none', stroke: 'currentColor', 'stroke-width': '3.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })],
      };
    default:
      return { viewBox: '0 0 24 24', shapes: [] };
  }
}

/** Build an inline SVG icon (showcase Icon Library glyph) that inherits `currentColor`. */
export function svgIcon(name: IconName, size = 22): SVGElement {
  const def = iconDef(name);
  const svg = shape('svg', {
    viewBox: def.viewBox,
    width: String(size),
    height: String(size),
    'aria-hidden': 'true',
  });
  for (const child of def.shapes) svg.appendChild(child);
  return svg;
}

/** The "OMD STUDIO" wordmark as self-contained SVG artwork (not layout text). */
export function svgWordmark(): SVGElement {
  const svg = shape('svg', {
    viewBox: '0 0 158 58',
    width: '158',
    height: '58',
    class: 'brand-wordmark-svg',
    role: 'img',
    'aria-label': 'OMD Studio',
  });
  const defs = shape('defs', {});
  const grad = shape('linearGradient', { id: 'omdWordmarkFill', x1: '0', y1: '0', x2: '0', y2: '1' });
  const stops: [string, string][] = [
    ['0', '#5695d2'],
    ['0.5', '#1f6dba'],
    ['1', '#134a8a'],
  ];
  for (const [offset, color] of stops) {
    grad.appendChild(shape('stop', { offset, 'stop-color': color }));
  }
  defs.appendChild(grad);
  svg.appendChild(defs);

  const omd = shape('text', {
    x: '79',
    y: '40',
    'text-anchor': 'middle',
    fill: 'url(#omdWordmarkFill)',
    'font-family': "'Segoe UI', system-ui, sans-serif",
    'font-weight': '800',
    'font-size': '34',
    'letter-spacing': '-0.5',
  });
  omd.textContent = 'OMD';
  const studio = shape('text', {
    x: '79',
    y: '54',
    'text-anchor': 'middle',
    fill: 'url(#omdWordmarkFill)',
    'font-family': "'Segoe UI', system-ui, sans-serif",
    'font-weight': '700',
    'font-size': '12.5',
    'letter-spacing': '4',
  });
  studio.textContent = 'STUDIO';
  svg.appendChild(omd);
  svg.appendChild(studio);
  return svg;
}
