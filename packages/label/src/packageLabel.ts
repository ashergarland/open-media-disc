import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { inspectPackage } from '@open-album-cartridge/core';
import {
  MINI_CD_LABEL,
  renderLabelSheet,
  type LabelFit,
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
