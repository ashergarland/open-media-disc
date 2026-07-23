/**
 * The Labels view.
 *
 * A batch label-sheet builder: choose a library folder, pick one or more OMD
 * packages, set how many copies of each, and lay their covers out across as many
 * printable US Letter pages as needed. The sheet can be saved as SVG or printed.
 *
 * Built on the `--omd-*` token component kit. The screen fits the viewport: a
 * fixed source bar plus two bounded scroll regions (the album picker and the
 * sheet preview), so the page itself never scrolls.
 */

import type {
  CatalogEntry,
  StudioLabelImage,
  StudioLabelSession,
  StudioLabelSheetRequest,
  StudioLabelTemplate,
} from '../shared/types';
import { clearChildren, el, svgIcon, type IconName } from './dom';

type Fit = 'fill' | 'fit' | 'stretch';

/** A custom image added to the sheet (a data URI plus a copy count). */
type CustomImage = StudioLabelImage & { copies: number };

/** The default template id (matches the SDK's mini CD jewel insert). */
const DEFAULT_TEMPLATE_ID = 'mini-cd-jewel';

/** Label stock presets, fetched once from the main process (they are static). */
let templates: StudioLabelTemplate[] | undefined;

const FITS: { key: Fit; label: string }[] = [
  { key: 'fill', label: 'Fill (crop to fit)' },
  { key: 'fit', label: 'Fit (letterbox)' },
  { key: 'stretch', label: 'Stretch' },
];

/** The shared library catalog, supplied by the app shell (like Create a Disc). */
export interface LabelsContext {
  libraryDir?: string;
  entries?: CatalogEntry[];
  loading: boolean;
  error?: string;
  onChooseLibrary: () => void;
  onRescan: () => void;
}

interface LabelsState {
  selected: Map<string, number>;
  customImages: CustomImage[];
  templateId: string;
  fit: Fit;
  building: boolean;
  pages?: string[];
  buildError?: string;
  labelCount: number;
  skipped: string[];
  saveNotice?: string;
}

let ctx: LabelsContext;
let state: LabelsState;
let host: HTMLElement;
let buildTimer: ReturnType<typeof setTimeout> | undefined;

function initialState(): LabelsState {
  return {
    selected: new Map(),
    customImages: [],
    templateId: DEFAULT_TEMPLATE_ID,
    fit: 'fill',
    building: false,
    labelCount: 0,
    skipped: [],
  };
}

/** Build (and reset) the Labels view from the shared library catalog. */
export function renderLabelsView(context: LabelsContext): HTMLElement {
  ctx = context;
  state = initialState();
  host = el('div', { class: 'omd-stack omd-fill' });
  if (!templates) void loadTemplates();
  render();
  return host;
}

async function loadTemplates(): Promise<void> {
  try {
    templates = await window.omd.labelTemplates();
  } catch {
    templates = [];
  }
  render();
}

function render(): void {
  clearChildren(host);

  if (ctx.loading) {
    host.append(spinnerRow('Scanning your library\u2026'));
    return;
  }
  if (ctx.error) {
    host.append(emptyState('Could not read your library', ctx.error, ['change', 'rescan']));
    return;
  }
  if (!ctx.libraryDir) {
    host.append(
      emptyState(
        'Print label sheets',
        'Choose your catalog folder to pick albums to make labels for.',
        ['choose'],
      ),
    );
    return;
  }
  if (!ctx.entries || ctx.entries.length === 0) {
    host.append(
      libraryBar(),
      el('div', { class: 'omd-empty' }, [
        el('span', { class: 'omd-empty-icon' }, [svgIcon('label', 54)]),
        el('div', { class: 'omd-empty-title', text: 'No albums yet' }),
        el('p', {
          class: 'omd-empty-sub',
          text: 'Import or rip albums into your catalog, then come back to print labels.',
        }),
      ]),
    );
    return;
  }

  host.append(toolbar(ctx.entries), buildPanel(ctx.entries));
}

type EmptyAction = 'choose' | 'change' | 'rescan';

function emptyState(title: string, sub: string, actions: EmptyAction[]): HTMLElement {
  const buttons: HTMLElement[] = [];
  for (const action of actions) {
    if (action === 'choose') {
      buttons.push(omdButton('Choose library folder\u2026', 'catalog', ctx.onChooseLibrary, { primary: true }));
    }
    if (action === 'change') buttons.push(omdButton('Change folder\u2026', 'folder', ctx.onChooseLibrary));
    if (action === 'rescan') buttons.push(omdButton('Rescan', undefined, ctx.onRescan));
  }
  return el('div', { class: 'omd-empty' }, [
    el('span', { class: 'omd-empty-icon' }, [svgIcon('label', 54)]),
    el('div', { class: 'omd-empty-title', text: title }),
    el('p', { class: 'omd-empty-sub', text: sub }),
    el('div', { class: 'omd-actions' }, buttons),
  ]);
}

/** The library path plus a minimal action set (shown when no albums are loaded). */
function libraryBar(): HTMLElement {
  return el('div', { class: 'omd-sourcebar' }, [
    el('span', { class: 'omd-path omd-muted', text: ctx.libraryDir ?? '' }),
    el('div', { class: 'omd-actions' }, [
      omdButton('Open session\u2026', undefined, openSession),
      omdButton('Rescan', undefined, ctx.onRescan),
      omdButton('Change folder\u2026', 'folder', ctx.onChooseLibrary),
    ]),
  ]);
}

/** The single top-right toolbar with every Labels action. */
function toolbar(entries: CatalogEntry[]): HTMLElement {
  const ready = Boolean(state.pages);
  return el('div', { class: 'omd-sourcebar' }, [
    el('span', { class: 'omd-path omd-muted', text: ctx.libraryDir ?? '' }),
    el('div', { class: 'omd-actions' }, [
      omdButton('Add image\u2026', 'note', addCustomImage),
      omdButton('Select all', undefined, () => {
        for (const entry of entries) {
          if (entry.coverDataUri && !state.selected.has(entry.source)) {
            state.selected.set(entry.source, 1);
          }
        }
        scheduleBuild();
      }),
      omdButton('Clear', undefined, () => {
        state.selected.clear();
        state.customImages = [];
        scheduleBuild();
      }),
      omdButton('Open session\u2026', undefined, openSession),
      omdButton('Save session\u2026', undefined, saveSession),
      omdButton('Rescan', undefined, ctx.onRescan),
      omdButton('Change folder\u2026', 'folder', ctx.onChooseLibrary),
      omdButton('Print\u2026', 'label', printSheet, { primary: true, disabled: !ready }),
      omdButton('Save PDF\u2026', undefined, saveSheet, { disabled: !ready }),
    ]),
  ]);
}

function buildPanel(entries: CatalogEntry[]): HTMLElement {
  return el('div', { class: 'omd-labels' }, [albumsColumn(entries), sheetColumn()]);
}

function albumsColumn(entries: CatalogEntry[]): HTMLElement {
  return el('div', { class: 'omd-labels-col' }, [
    el('div', { class: 'omd-labels-head' }, [el('div', { class: 'omd-panel-title', text: 'Albums' })]),
    el('div', { class: 'omd-scroll' }, [
      el('div', { class: 'omd-picker' }, [
        ...entries.map(pickRow),
        ...state.customImages.map((img, index) => customRow(img, index)),
      ]),
    ]),
  ]);
}

function pickRow(entry: CatalogEntry): HTMLElement {
  const hasCover = Boolean(entry.coverDataUri);
  const selected = state.selected.has(entry.source);
  const copies = state.selected.get(entry.source) ?? 1;

  const cover = entry.coverDataUri
    ? el('img', { class: 'omd-pick-cover', src: entry.coverDataUri, alt: '' })
    : el('div', { class: 'omd-pick-cover-empty' }, [svgIcon('note', 20)]);

  const check = el('input', {
    type: 'checkbox',
    class: 'omd-pick-check',
    checked: selected ? true : null,
    disabled: hasCover ? null : true,
  }) as HTMLInputElement;
  check.addEventListener('change', () => {
    if (check.checked) state.selected.set(entry.source, state.selected.get(entry.source) ?? 1);
    else state.selected.delete(entry.source);
    scheduleBuild();
  });

  const info = el('div', { class: 'omd-pick-info' }, [
    el('div', { class: 'omd-pick-title', text: entry.discId }),
    el('div', { class: 'omd-pick-sub', text: `${entry.artist} - ${entry.album}` }),
  ]);

  const right = hasCover
    ? selected
      ? stepper(copies, (v) => {
          state.selected.set(entry.source, v);
          scheduleBuild();
        })
      : el('span', { class: 'omd-pick-sub', text: `${entry.trackCount} tracks` })
    : el('span', { class: 'omd-pick-sub', text: 'No cover art' });

  return el('label', { class: `omd-pick${selected ? ' selected' : ''}${hasCover ? '' : ' disabled'}` }, [
    check,
    cover,
    info,
    right,
  ]);
}

/** A row for a user-added custom image (always included, with a remove button). */
function customRow(img: CustomImage, index: number): HTMLElement {
  const remove = el(
    'button',
    { class: 'omd-chip-btn danger grow0', type: 'button', 'aria-label': 'Remove image' },
    [svgIcon('trash', 16)],
  );
  remove.addEventListener('click', () => {
    state.customImages.splice(index, 1);
    scheduleBuild();
  });
  return el('div', { class: 'omd-pick selected' }, [
    el('img', { class: 'omd-pick-cover', src: img.dataUri, alt: '' }),
    el('div', { class: 'omd-pick-info' }, [
      el('div', { class: 'omd-pick-title', text: img.name }),
      el('div', { class: 'omd-pick-sub', text: 'Custom image' }),
    ]),
    stepper(img.copies, (v) => {
      img.copies = v;
      scheduleBuild();
    }),
    remove,
  ]);
}

async function addCustomImage(): Promise<void> {
  try {
    const img = await window.omd.pickLabelImage();
    if (!img) return;
    state.customImages.push({ ...img, copies: 1 });
    scheduleBuild();
  } catch (err) {
    window.alert((err as Error).message);
  }
}

function stepper(value: number, onChange: (value: number) => void): HTMLElement {
  return el('div', { class: 'omd-stepper', role: 'group', 'aria-label': 'Copies' }, [
    stepBtn('\u2212', 'Decrease copies', () => onChange(Math.max(1, value - 1))),
    el('span', { class: 'omd-stepper-num', text: String(value) }),
    stepBtn('+', 'Increase copies', () => onChange(value + 1)),
  ]);
}

function stepBtn(label: string, aria: string, onClick: () => void): HTMLElement {
  const button = el('button', { class: 'omd-stepper-btn', type: 'button', 'aria-label': aria }, [label]);
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return button;
}

function sheetColumn(): HTMLElement {
  const templateOptions = (templates ?? []).map((t) => ({ value: t.id, label: t.name }));
  if (templateOptions.length === 0) templateOptions.push({ value: state.templateId, label: 'Loading\u2026' });

  const col = el('div', { class: 'omd-labels-col' }, [
    el('div', { class: 'omd-labels-head' }, [el('div', { class: 'omd-panel-title', text: 'Sheet' })]),
    el('div', { class: 'omd-fields' }, [
      field(
        'Template',
        selectEl(templateOptions, state.templateId, (v) => {
          state.templateId = v;
          scheduleBuild();
        }),
      ),
      field(
        'Image fit',
        selectEl(
          FITS.map((f) => ({ value: f.key, label: f.label })),
          state.fit,
          (v) => {
            state.fit = v as Fit;
            scheduleBuild();
          },
        ),
      ),
    ]),
  ]);

  if (!hasLabels()) {
    col.append(
      el('p', { class: 'omd-muted', text: 'Select one or more albums, or add an image, to build a label sheet.' }),
    );
    return col;
  }
  if (state.buildError) {
    col.append(el('p', { class: 'omd-error', text: state.buildError }));
    return col;
  }
  if (state.building && !state.pages) {
    col.append(spinnerRow('Building sheet\u2026'));
    return col;
  }
  if (state.pages) {
    const pageWord = state.pages.length === 1 ? 'page' : 'pages';
    col.append(
      el('p', { class: 'omd-summary' }, [
        el('strong', { text: `${state.labelCount} labels` }),
        el('span', { text: ` on ${state.pages.length} ${pageWord}` }),
      ]),
    );
    col.append(
      el('div', { class: 'omd-scroll' }, [
        el(
          'div',
          { class: 'omd-sheet-pages' },
          state.pages.map((svg, index) =>
            el('div', { class: 'omd-sheet-page' }, [
              el('img', {
                src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
                alt: `Label sheet page ${index + 1}`,
              }),
            ]),
          ),
        ),
      ]),
    );
    if (state.skipped.length) {
      col.append(
        el('p', {
          class: 'omd-muted',
          text: `${state.skipped.length} album${state.skipped.length === 1 ? '' : 's'} skipped (no cover art).`,
        }),
      );
    }
    if (state.saveNotice) {
      col.append(el('p', { class: 'omd-muted', text: state.saveNotice }));
    }
  }

  return col;
}

function field(label: string, control: HTMLElement): HTMLElement {
  return el('label', { class: 'omd-field' }, [el('span', { class: 'omd-field-label', text: label }), control]);
}

function selectEl(
  options: { value: string; label: string }[],
  current: string,
  onChange: (value: string) => void,
): HTMLSelectElement {
  const select = el('select', {
    class: 'omd-select',
    onchange: (event: Event) => onChange((event.target as HTMLSelectElement).value),
  }) as HTMLSelectElement;
  for (const option of options) {
    select.append(el('option', { value: option.value, text: option.label }));
  }
  select.value = current;
  return select;
}

function request(): StudioLabelSheetRequest {
  return {
    packages: [...state.selected].map(([source, copies]) => ({ source, copies })),
    templateId: state.templateId,
    fit: state.fit,
    customImages: state.customImages.map((c) => ({ imageHref: c.dataUri, copies: c.copies })),
  };
}

/** True when the sheet has at least one label (a selected album or a custom image). */
function hasLabels(): boolean {
  return state.selected.size > 0 || state.customImages.length > 0;
}

async function saveSession(): Promise<void> {
  const session: StudioLabelSession = {
    version: 1,
    templateId: state.templateId,
    fit: state.fit,
    packages: [...state.selected].map(([source, copies]) => ({ source, copies })),
    customImages: state.customImages.map((c) => ({ name: c.name, dataUri: c.dataUri, copies: c.copies })),
  };
  try {
    const saved = await window.omd.saveLabelSession(session);
    state.saveNotice = saved ? `Session saved to ${saved}` : undefined;
  } catch (err) {
    state.saveNotice = `Save failed: ${(err as Error).message}`;
  }
  render();
}

async function openSession(): Promise<void> {
  let session: StudioLabelSession | null;
  try {
    session = await window.omd.openLabelSession();
  } catch (err) {
    state.saveNotice = `Open failed: ${(err as Error).message}`;
    render();
    return;
  }
  if (!session) return;
  state.templateId = session.templateId;
  state.fit = session.fit;
  state.selected = new Map(session.packages.map((p) => [p.source, p.copies]));
  state.customImages = session.customImages.map((c) => ({
    name: c.name,
    dataUri: c.dataUri,
    copies: c.copies,
  }));
  scheduleBuild();
}

function scheduleBuild(): void {
  state.saveNotice = undefined;
  if (buildTimer) clearTimeout(buildTimer);
  if (!hasLabels()) {
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

/* Shared bits (token kit). */
function omdButton(
  label: string,
  icon: IconName | undefined,
  onClick: () => void | Promise<void>,
  opts: { primary?: boolean; disabled?: boolean } = {},
): HTMLElement {
  const children: (Node | string)[] = [];
  if (icon) children.push(svgIcon(icon, 18));
  children.push(label);
  return el(
    'button',
    {
      class: `omd-btn${opts.primary ? ' omd-btn--primary' : ''}`,
      type: 'button',
      disabled: opts.disabled ? true : null,
      onclick: () => void onClick(),
    },
    children,
  );
}

function spinnerRow(text: string): HTMLElement {
  return el('div', { class: 'spinner-row' }, [
    el('span', { class: 'spinner', 'aria-hidden': 'true' }),
    el('span', { text }),
  ]);
}
