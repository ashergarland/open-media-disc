import { createInterface } from 'node:readline/promises';

/**
 * Ask the user (interactive TTY only) whether to overwrite an existing folder.
 *
 * Returns `false` immediately when stdin is not a TTY, so non-interactive
 * callers must pass an explicit `--force` flag instead of relying on a prompt.
 */
export async function confirmOverwrite(outDir: string): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`Output folder "${outDir}" exists. Overwrite? [y/N] `);
    const normalized = answer.trim().toLowerCase();
    return normalized === 'y' || normalized === 'yes';
  } finally {
    rl.close();
  }
}
