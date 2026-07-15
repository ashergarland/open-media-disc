import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { inspectPackage } from '@open-album-cartridge/core';
import {
  MINI_CD_LABEL,
  renderLabelSheet,
  renderLabelSheets,
  type LabelFit,
  type LabelItem,
  type LabelPage,
  type LabelSheet,
} from './labelSheet.js';

/** Cover-art extensions OMD supports, mapped to their data-URI MIME types. */
const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

/** Options for {@link buildPackageLabelSheet}. */
export interface BuildPackageLabelOptions {
  /** OMD package directory to label. */
  packageDir: string;
  /** Label width in inches. Defaults to the mini CD jewel-case width. */
  widthIn?: number;
  /** Label height in inches. Defaults to the mini CD jewel-case height. */
  heightIn?: number;
  /** Image fit within the label. Defaults to `fill`. */
  fit?: LabelFit;
  /** Number of copies of the label to place. Defaults to 1. */
  copies?: number;
  /** Draw crop marks. Defaults to true. */
  cropMarks?: boolean;
  /** Page geometry overrides. */
  page?: Partial<LabelPage>;
}

/** Result of {@link buildPackageLabelSheet}: a rendered sheet plus album facts. */
export interface PackageLabelResult extends LabelSheet {
  discId: string;
  artist: string;
  album: string;
}

/**
 * Build a printable label sheet for an OMD package from its cover art.
 *
 * Reads the package manifest and embeds the cover image as a `data:` URI so the
 * resulting SVG is self-contained. Throws if the package has no usable cover art.
 */
export async function buildPackageLabelSheet(
  options: BuildPackageLabelOptions,
): Promise<PackageLabelResult> {
  const info = await inspectPackage(options.packageDir);

  if (!info.coverArt) {
    throw new Error(`Package has no cover art to place on a label: ${options.packageDir}`);
  }

  const coverPath = path.join(options.packageDir, info.coverArt);
  const ext = path.extname(coverPath).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) {
    throw new Error(`Unsupported cover art type for a label: ${info.coverArt}`);
  }

  const bytes = await readFile(coverPath);
  const imageHref = `data:${mime};base64,${bytes.toString('base64')}`;

  const widthIn = options.widthIn ?? MINI_CD_LABEL.widthIn;
  const heightIn = options.heightIn ?? MINI_CD_LABEL.heightIn;
  const fit = options.fit ?? 'fill';
  const copies = Math.max(1, options.copies ?? 1);

  const items = Array.from({ length: copies }, () => ({ imageHref, widthIn, heightIn, fit }));

  const sheet = renderLabelSheet({
    items,
    ...(options.page ? { page: options.page } : {}),
    ...(options.cropMarks !== undefined ? { cropMarks: options.cropMarks } : {}),
  });

  return { ...sheet, discId: info.discId, artist: info.artist, album: info.album };
}

/** Read a package's cover art as a `data:` URI, or null if it has none usable. */
async function readCoverHref(packageDir: string): Promise<string | null> {
  let info;
  try {
    info = await inspectPackage(packageDir);
  } catch {
    return null;
  }
  if (!info.coverArt) return null;
  const ext = path.extname(info.coverArt).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) return null;
  const bytes = await readFile(path.join(packageDir, info.coverArt));
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

/** One package to place on the batch sheet, with how many copies of its label. */
export interface PackageLabelSelection {
  packageDir: string;
  copies?: number;
}

/** Options for {@link buildPackagesLabelSheet}. */
export interface BuildPackagesLabelOptions {
  packages: PackageLabelSelection[];
  widthIn?: number;
  heightIn?: number;
  fit?: LabelFit;
  cropMarks?: boolean;
  page?: Partial<LabelPage>;
}

/** Result of {@link buildPackagesLabelSheet}: one or more paginated sheets. */
export interface PackagesLabelResult {
  pages: LabelSheet[];
  packageCount: number;
  labelCount: number;
  /** Package directories skipped because they had no usable cover art. */
  skipped: string[];
}

/**
 * Build printable label sheets for many OMD packages at once, mixing their
 * covers onto shared US Letter pages and overflowing onto more pages as needed.
 * Packages without usable cover art are skipped and reported. Throws only if no
 * selected package has a usable cover.
 */
export async function buildPackagesLabelSheet(
  options: BuildPackagesLabelOptions,
): Promise<PackagesLabelResult> {
  const widthIn = options.widthIn ?? MINI_CD_LABEL.widthIn;
  const heightIn = options.heightIn ?? MINI_CD_LABEL.heightIn;
  const fit = options.fit ?? 'fill';

  const items: LabelItem[] = [];
  const skipped: string[] = [];
  let packageCount = 0;

  for (const selection of options.packages) {
    const imageHref = await readCoverHref(selection.packageDir);
    if (!imageHref) {
      skipped.push(selection.packageDir);
      continue;
    }
    packageCount += 1;
    const copies = Math.max(1, Math.floor(selection.copies ?? 1));
    for (let i = 0; i < copies; i += 1) {
      items.push({ imageHref, widthIn, heightIn, fit });
    }
  }

  if (items.length === 0) {
    throw new Error('None of the selected packages have usable cover art to place on a label.');
  }

  const pages = renderLabelSheets({
    items,
    ...(options.page ? { page: options.page } : {}),
    ...(options.cropMarks !== undefined ? { cropMarks: options.cropMarks } : {}),
  });

  return { pages, packageCount, labelCount: items.length, skipped };
}
