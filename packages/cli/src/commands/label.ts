import { writeFile } from 'node:fs/promises';
import { buildPackageLabelSheet, type LabelFit } from '@open-album-cartridge/label';
import { boolOption, floatOption, intOption, stringOption, type ParsedArgs } from '../args.js';

const USAGE =
  'Usage: omd label <packageDir> --out <file.svg> [--width <in>] [--height <in>] ' +
  '[--fit fill|fit|stretch] [--copies <n>] [--no-crop-marks]';

const FITS: LabelFit[] = ['fill', 'fit', 'stretch'];

/**
 * `omd label <packageDir> --out <file.svg> [--width <in>] [--height <in>]
 *    [--fit fill|fit|stretch] [--copies <n>] [--no-crop-marks]`
 */
export async function labelCommand(args: ParsedArgs): Promise<number> {
  const packageDir = args.positionals[0];
  const outPath = stringOption(args, 'out');
  if (!packageDir || !outPath) {
    console.error(USAGE);
    return 2;
  }

  const fit = stringOption(args, 'fit');
  if (fit && !FITS.includes(fit as LabelFit)) {
    console.error(`Invalid --fit "${fit}". Use fill, fit, or stretch.`);
    return 2;
  }

  const width = floatOption(args, 'width');
  const height = floatOption(args, 'height');
  const copies = intOption(args, 'copies');

  try {
    const sheet = await buildPackageLabelSheet({
      packageDir,
      ...(width !== undefined ? { widthIn: width } : {}),
      ...(height !== undefined ? { heightIn: height } : {}),
      ...(fit ? { fit: fit as LabelFit } : {}),
      ...(copies !== undefined ? { copies } : {}),
      ...(boolOption(args, 'no-crop-marks') ? { cropMarks: false } : {}),
    });
    await writeFile(outPath, sheet.svg, 'utf8');

    console.log(`Wrote label sheet: ${outPath}`);
    console.log(`Album: ${sheet.artist} - ${sheet.album}`);
    console.log(`Disc title: ${sheet.discId}`);
    console.log(`Labels: ${sheet.placements.length}`);
    return 0;
  } catch (err) {
    console.error(`Failed to build label: ${(err as Error).message}`);
    return 1;
  }
}
