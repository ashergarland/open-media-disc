/**
 * The Labels view.
 *
 * A batch label-sheet builder: choose a library folder, pick one or more OMD
 * packages, set how many copies of each, and lay their covers out across as many
 * printable US Letter pages as needed. The sheet can be saved as SVG or printed.
 */

import type { CatalogEntry, StudioLabelSheetRequest } from '../shared/types';
import { clearChildren, el, svgIcon, type IconName } from './dom';

interface LabelSize {
  key: string;
  label: string;
  widthIn: number;
  heightIn: number;
}

const SIZES: LabelSize[] = [
  { key: 'mini', label: 'Mini CD jewel (3.44 in)', widthIn: 3.4375, heightIn: 3.3125 },
  { key: 'square3', label: 'Square (3 in)', widthIn: 3, heightIn: 3 },
  { key: 'square4', label: 'Square (4 in)', widthIn: 4, heightIn: 4 },
  { key: 'cd', label: 'CD jewel (4.75 in)', widthIn: 4.75, heightIn: 4.75 },
];

type Fit = 'fill' | 'fit' | 'stretch';

const FITS: { key: Fit; label: string }[] = [
  { key: 'fill', label: 'Fill (crop to fit)' },
  { key: 'fit', label: 'Fit (letterbox)' },
  { key: 'stretch', label: 'Stretch' },
];

interface LabelsState {
  libraryDir?: string;
  entries?: CatalogEntry[];
  loading: boolean;
  error?: string;
  selected: Map<string, number>;
  sizeKey: string;
  fit: Fit;
  building: boolean;
  pages?: string[];
  buildError?: string;
  labelCount: number;
  skipped: string[];
  saveNotice?: string;
}

let state: LabelsState;
let host: HTMLElement;
let buildTimer: ReturnType<typeof setTimeout> | undefined;

function initialState(): LabelsState {
  return {
    loading: false,
    selected: new Map(),
    sizeKey: 'mini',
    fit: 'fill',
    building: false,
    labelCount: 0,
    skipped: [],
  };
}

/** Build (and reset) the Labels view. */
export function renderLabelsView(): HTMLElement {
  state = initialState();
  host = el('div', { class: 'view labels-view' });
  render();
  return host;
}

function render(): void {
  clearChildren(host);
  const children: (Node | string)[] = [
    el('div', { class: 'view-head' }, [
      el('h1', { class: 'view-title', text: 'Labels' }),
      el('p', {
        class: 'view-lead',
        text: 'Print album-art label sheets. Pick albums, set copies, and lay them out across pages.',
      }),
    ]),
  ];

  if (state.loading) {
    children.push(el('section', { class: 'card' }, [spinnerRow('Scanning...')]));
  } else if (state.error) {
    children.push(el('section', { class: 'card' }, [el('p', { class: 'select-lead', text: state.error })]));
  } else if (state.entries) {
    children.push(state.entries.length === 0 ? emptyPanel() : buildPanel(state.entries));
  } else {
    children.push(
      el('section', { class: 'card' }, [
        el('div', { class: 'select-hero' }, [
          el('span', { class: 'select-icon' }, [svgIcon('label', 54)]),
          el('p', {
            class: 'select-lead',
            text: 'Choose a folder of OMD packages to pick which albums to make labels for.',
          }),
          primaryButton('Choose folder...', chooseFolder, 'label'),
        ]),
      ]),
    );
  }
  host.append(...children);
}

/** Path + change/rescan row shown atop the loaded panels. */
function sourceRow(): HTMLElement {
  return el('div', { class: 'burn-source' }, [
    el('span', { class: 'burn-source-path', text: state.libraryDir ?? '' }),
    el('div', { class: 'bc-actions' }, [
      secondaryButton('Rescan', rescan),
      secondaryButton('Change folder...', chooseFolder),
    ]),
  ]);
}

function emptyPanel(): HTMLElement {
  return el('section', { class: 'card' }, [
    sourceRow(),
    el('p', {
      class: 'select-lead',
      text: 'No OMD packages here. Choose a folder that contains package subfolders (for example your build output).',
    }),
  ]);
}

function buildPanel(entries: CatalogEntry[]): HTMLElement {
  return el('section', { class: 'card' }, [
    sourceRow(),
    el('div', { class: 'grid cols-2' }, [
      el('div', { class: 'stack' }, [
        el('div', { class: 'labels-col-head' }, [
          el('p', { class: 'eyebrow', text: 'Albums' }),
          el('div', { class: 'labels-col-tools' }, [
            textButton('Select all', () => {
              for (const entry of entries) {
                if (entry.coverDataUri && !state.selected.has(entry.source)) {
                  state.selected.set(entry.source, 1);
                }
              }
              scheduleBuild();
            }),
            textButton('Clear', () => {
              state.selected.clear();
              scheduleBuild();
            }),
          ]),
        ]),
        el('div', { class: 'label-picker' }, entries.map(pickRow)),
      ]),
      el('div', { class: 'stack' }, [sheetPanel()]),
    ]),
  ]);
}

function pickRow(entry: CatalogEntry): HTMLElement {
  const hasCover = Boolean(entry.coverDataUri);
  const selected = state.selected.has(entry.source);
  const copies = state.selected.get(entry.source) ?? 1;

  const cover = entry.coverDataUri
    ? el('img', { class: 'pick-cover', src: entry.coverDataUri, alt: '' })
    : el('div', { class: 'pick-cover pick-cover-empty' }, [svgIcon('note', 20)]);

  const check = el('input', {
    type: 'checkbox',
    class: 'pick-check',
    checked: selected ? true : null,
    disabled: hasCover ? null : true,
  }) as HTMLInputElement;
  check.addEventListener('change', () => {
    if (check.checked) state.selected.set(entry.source, state.selected.get(entry.source) ?? 1);
    else state.selected.delete(entry.source);
    scheduleBuild();
  });

  const info = el('div', { class: 'pick-info' }, [
    el('div', { class: 'pick-title', text: entry.discId }),
    el('div', { class: 'muted small', text: `${entry.artist} - ${entry.album}` }),
  ]);

  const right = hasCover
    ? selected
      ? copiesStepper(entry.source, copies)
      : el('span', { class: 'muted small', text: `${entry.trackCount} tracks` })
    : el('span', { class: 'muted small', text: 'No cover art' });

  return el('label', { class: `label-pick-row${selected ? ' is-selected' : ''}${hasCover ? '' : ' is-disabled'}` }, [
    check,
    cover,
    info,
    right,
  ]);
}

function copiesStepper(source: string, copies: number): HTMLElement {
  const setCopies = (value: number): void => {
    state.selected.set(source, Math.max(1, value));
    scheduleBuild();
  };
  return el('div', { class: 'stepper', role: 'group', 'aria-label': 'Copies' }, [
    stepBtn('\u2212', 'Decrease copies', () => setCopies(copies - 1)),
    el('span', { class: 'stepper-num', text: String(copies) }),
    stepBtn('+', 'Increase copies', () => setCopies(copies + 1)),
  ]);
}

function stepBtn(label: string, aria: string, onClick: () => void): HTMLElement {
  const button = el('button', { class: 'stepper-btn', type: 'button', 'aria-label': aria }, [label]);
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return button;
}

function sheetPanel(): HTMLElement {
  const children: (Node | string)[] = [
    el('p', { class: 'eyebrow', text: 'Sheet' }),
    el('div', { class: 'label-options' }, [
      labelField('Label size', selectEl(SIZES.map((s) => ({ value: s.key, label: s.label })), state.sizeKey, (v) => {
        state.sizeKey = v;
        scheduleBuild();
      })),
      labelField('Image fit', selectEl(FITS.map((f) => ({ value: f.key, label: f.label })), state.fit, (v) => {
        state.fit = v as Fit;
        scheduleBuild();
      })),
    ]),
  ];

  if (state.selected.size === 0) {
    children.push(el('p', { class: 'select-lead', text: 'Select one or more albums to build a label sheet.' }));
    return el('div', { class: 'stack' }, children);
  }

  if (state.buildError) {
    children.push(el('p', { class: 'select-lead', text: state.buildError }));
    return el('div', { class: 'stack' }, children);
  }

  if (state.building && !state.pages) {
    children.push(spinnerRow('Building sheet...'));
    return el('div', { class: 'stack' }, children);
  }

  if (state.pages) {
    const pageWord = state.pages.length === 1 ? 'page' : 'pages';
    children.push(
      el('div', { class: 'label-summary' }, [
        el('span', { class: 'label-summary-count', text: `${state.labelCount} labels` }),
        el('span', { class: 'select-lead', text: ` on ${state.pages.length} ${pageWord}` }),
      ]),
    );
    children.push(
      el(
        'div',
        { class: 'sheet-preview' },
        state.pages.map((svg, index) =>
          el('div', { class: 'sheet-page' }, [
            el('img', {
              class: 'sheet-page-img',
              src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
              alt: `Label sheet page ${index + 1}`,
            }),
          ]),
        ),
      ),
    );
    if (state.skipped.length) {
      children.push(
        el('p', {
          class: 'select-lead',
          text: `${state.skipped.length} album${state.skipped.length === 1 ? '' : 's'} skipped (no cover art).`,
        }),
      );
    }
    children.push(
      el('div', { class: 'bc-actions' }, [
        primaryButton('Print...', printSheet, 'label'),
        secondaryButton('Save SVG...', saveSheet),
      ]),
    );
    if (state.saveNotice) {
      children.push(el('p', { class: 'select-lead', text: state.saveNotice }));
    }
  }

  return el('div', { class: 'stack' }, children);
}

function labelField(label: string, control: HTMLElement): HTMLElement {
  return el('label', { class: 'label-field' }, [el('span', { class: 'eyebrow', text: label }), control]);
}

function selectEl(
  options: { value: string; label: string }[],
  current: string,
  onChange: (value: string) => void,
): HTMLSelectElement {
  const select = el('select', {
    class: 'drive-select',
    onchange: (event: Event) => onChange((event.target as HTMLSelectElement).value),
  }) as HTMLSelectElement;
  for (const option of options) {
    select.append(el('option', { value: option.value, text: option.label }));
  }
  select.value = current;
  return select;
}

function request(): StudioLabelSheetRequest {
  const size = SIZES.find((entry) => entry.key === state.sizeKey) ?? SIZES[0]!;
  return {
    packages: [...state.selected].map(([source, copies]) => ({ source, copies })),
    widthIn: size.widthIn,
    heightIn: size.heightIn,
    fit: state.fit,
  };
}

function scheduleBuild(): void {
  state.saveNotice = undefined;
  if (buildTimer) clearTimeout(buildTimer);
  if (state.selected.size === 0) {
    state.pages = undefined;
    state.building = false;
    state.buildError = undefined;
    render();
    return;
  }
  state.building = true;
  render();
  buildTimer = setTimeout(() => void buildPreview(), 250);
}

async function buildPreview(): Promise<void> {
  try {
    const result = await window.omd.buildLabelSheet(request());
    state.pages = result.pages;
    state.labelCount = result.labelCount;
    state.skipped = result.skipped;
    state.buildError = undefined;
  } catch (err) {
    state.buildError = (err as Error).message;
    state.pages = undefined;
  }
  state.building = false;
  render();
}

async function chooseFolder(): Promise<void> {
  const dir = await window.omd.chooseLibraryFolder();
  if (!dir) return;
  state.libraryDir = dir;
  await rescan();
}

async function rescan(): Promise<void> {
  if (!state.libraryDir) return;
  state.loading = true;
  state.error = undefined;
  state.entries = undefined;
  state.selected.clear();
  state.pages = undefined;
  render();
  try {
    state.entries = await window.omd.scanLibrary(state.libraryDir);
  } catch (err) {
    state.error = (err as Error).message;
  }
  state.loading = false;
  render();
}

async function saveSheet(): Promise<void> {
  try {
    const saved = await window.omd.saveLabelSheet(request());
    state.saveNotice = saved ? `Saved to ${saved}` : undefined;
  } catch (err) {
    state.saveNotice = `Save failed: ${(err as Error).message}`;
  }
  render();
}

async function printSheet(): Promise<void> {
  try {
    await window.omd.printLabelSheet(request());
  } catch (err) {
    state.saveNotice = `Print failed: ${(err as Error).message}`;
    render();
  }
}

/* Shared bits */
function primaryButton(
  label: string,
  onClick: () => void | Promise<void>,
  icon?: IconName,
): HTMLElement {
  const kids: (Node | string)[] = [el('span', { class: 'liquid-rim', 'aria-hidden': 'true' })];
  if (icon) {
    const glyph = svgIcon(icon, 20);
    glyph.setAttribute('class', 'btn__icon');
    kids.push(glyph);
  }
  kids.push(el('span', { class: 'btn__label', text: label }));
  return el(
    'button',
    { class: 'btn btn--primary', type: 'button', onclick: () => void onClick() },
    kids,
  );
}

function secondaryButton(label: string, onClick: () => void | Promise<void>): HTMLElement {
  return el('button', { class: 'btn btn--secondary', type: 'button', onclick: () => void onClick() }, [
    el('span', { class: 'liquid-rim', 'aria-hidden': 'true' }),
    el('span', { class: 'button-surface', 'aria-hidden': 'true' }),
    el('span', { class: 'btn__label', text: label }),
  ]);
}

function textButton(label: string, onClick: () => void): HTMLElement {
  return el('button', { class: 'link-btn', type: 'button', onclick: onClick }, [label]);
}

function spinnerRow(text: string): HTMLElement {
  return el('div', { class: 'spinner-row' }, [
    el('span', { class: 'spinner', 'aria-hidden': 'true' }),
    el('span', { text }),
  ]);
}
