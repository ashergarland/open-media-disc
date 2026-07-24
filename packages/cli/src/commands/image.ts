import { buildDiscImage, formatBytes } from '@open-media-disc/core';
import { stringOption, type ParsedArgs } from '../args.js';

const USAGE = 'Usage: omd image <packageDir> --out <imagePath> [--label <name>]';

/** `omd image <packageDir> --out <imagePath> [--label <name>]` */
export async function imageCommand(args: ParsedArgs): Promise<number> {
  const packageDir = args.positionals[0];
  const outPath = stringOption(args, 'out');
  if (!packageDir || !outPath) {
    console.error(USAGE);
    return 2;
  }

  const label = stringOption(args, 'label');

  try {
    const result = await buildDiscImage({
      packageDir,
      outPath,
      ...(label ? { volumeLabel: label } : {}),
    });

    console.log(`Built disc image: ${result.outPath}`);
    console.log(`Volume label: ${result.volumeLabel}`);
    console.log('Filesystem: UDF');
    console.log(`Size: ${formatBytes(result.sizeBytes)}`);
    console.log(`Backend: ${result.backend}`);
    return 0;
  } catch (err) {
    console.error(`Failed to build image: ${(err as Error).message}`);
    return 1;
  }
}
