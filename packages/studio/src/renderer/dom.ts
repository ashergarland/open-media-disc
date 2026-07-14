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
  | 'check';

const FILL = { fill: 'currentColor', stroke: 'none' };

function iconShapes(name: IconName): SVGElement[] {
  switch (name) {
    case 'create':
      return [
        shape('circle', { cx: '12', cy: '12', r: '9' }),
        shape('circle', { cx: '12', cy: '12', r: '2.6' }),
      ];
    case 'player':
      return [shape('polygon', { points: '9,7 18,12 9,17', ...FILL })];
    case 'catalog':
      return [
        shape('line', { x1: '4', y1: '7', x2: '20', y2: '7' }),
        shape('line', { x1: '4', y1: '12', x2: '20', y2: '12' }),
        shape('line', { x1: '4', y1: '17', x2: '14', y2: '17' }),
      ];
    case 'themes':
      return [
        shape('circle', { cx: '9', cy: '9.5', r: '3.4' }),
        shape('circle', { cx: '15', cy: '9.5', r: '3.4' }),
        shape('circle', { cx: '12', cy: '15', r: '3.4' }),
      ];
    case 'settings':
      return [
        shape('line', { x1: '4', y1: '8', x2: '20', y2: '8' }),
        shape('circle', { cx: '9', cy: '8', r: '2.3', ...FILL }),
        shape('line', { x1: '4', y1: '16', x2: '20', y2: '16' }),
        shape('circle', { cx: '15', cy: '16', r: '2.3', ...FILL }),
      ];
    case 'shuffle':
      return [
        shape('path', { d: 'M4 7 H9 L17 17 H20' }),
        shape('path', { d: 'M4 17 H9 L17 7 H20' }),
        shape('polyline', { points: '17,4 20,7 17,10' }),
        shape('polyline', { points: '17,14 20,17 17,20' }),
      ];
    case 'prev':
      return [
        shape('polygon', { points: '16,7 8,12 16,17', ...FILL }),
        shape('rect', { x: '6', y: '7', width: '1.7', height: '10', ...FILL }),
      ];
    case 'play':
      return [shape('polygon', { points: '9,7 18,12 9,17', ...FILL })];
    case 'pause':
      return [
        shape('rect', { x: '8', y: '7', width: '2.4', height: '10', ...FILL }),
        shape('rect', { x: '13.6', y: '7', width: '2.4', height: '10', ...FILL }),
      ];
    case 'next':
      return [
        shape('polygon', { points: '8,7 16,12 8,17', ...FILL }),
        shape('rect', { x: '16.3', y: '7', width: '1.7', height: '10', ...FILL }),
      ];
    case 'repeat':
      return [
        shape('path', { d: 'M7 8 H15 A4 4 0 0 1 19 12' }),
        shape('polyline', { points: '16,5 19,8 16,11' }),
        shape('path', { d: 'M17 16 H9 A4 4 0 0 1 5 12' }),
        shape('polyline', { points: '8,13 5,16 8,19' }),
      ];
    case 'volume':
      return [
        shape('polygon', { points: '4,10 7,10 11,6 11,18 7,14 4,14', ...FILL }),
        shape('path', { d: 'M14 9 A4 4 0 0 1 14 15' }),
        shape('path', { d: 'M16.5 6.5 A8 8 0 0 1 16.5 17.5' }),
      ];
    case 'check':
      return [shape('polyline', { points: '5,12 10,17 19,7' })];
    case 'note':
      return [
        shape('circle', { cx: '8', cy: '17', r: '2.6', ...FILL }),
        shape('path', { d: 'M10.6 17 V5 L17 7' }),
      ];
    case 'wave':
      return [
        shape('line', { x1: '4', y1: '10', x2: '4', y2: '14' }),
        shape('line', { x1: '8', y1: '7', x2: '8', y2: '17' }),
        shape('line', { x1: '12', y1: '9', x2: '12', y2: '15' }),
        shape('line', { x1: '16', y1: '6', x2: '16', y2: '18' }),
        shape('line', { x1: '20', y1: '10', x2: '20', y2: '14' }),
      ];
    default:
      return [];
  }
}

/** Build an inline SVG icon that inherits `currentColor`. */
export function svgIcon(name: IconName, size = 20): SVGElement {
  const svg = shape('svg', {
    viewBox: '0 0 24 24',
    width: String(size),
    height: String(size),
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.7',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  });
  for (const child of iconShapes(name)) svg.appendChild(child);
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

  const omd = shape('text', { x: '79', y: '35', class: 'wm-omd', 'text-anchor': 'middle' });
  omd.textContent = 'OMD';
  const studio = shape('text', { x: '79', y: '52', class: 'wm-studio', 'text-anchor': 'middle' });
  studio.textContent = 'STUDIO';
  svg.appendChild(omd);
  svg.appendChild(studio);
  return svg;
}
