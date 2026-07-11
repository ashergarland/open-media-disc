import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * Run a Windows PowerShell script from a temporary `.ps1` file via `-File` and
 * return its stdout.
 *
 * A temp file plus `-File` is used deliberately: piping a here-string over stdin
 * with `-Command -` mangles the script and can swallow terminating errors while
 * still exiting `0`. Scripts should pass inputs via environment variables (never
 * string interpolation) so paths and labels cannot inject commands.
 */
export async function runPowerShellScript(
  script: string,
  env: NodeJS.ProcessEnv,
): Promise<string> {
  const scriptPath = path.join(tmpdir(), `omd-ps-${randomUUID()}.ps1`);
  await writeFile(scriptPath, script, 'utf8');

  try {
    return await new Promise<string>((resolve, reject) => {
      const child = spawn(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
        { env, windowsHide: true },
      );

      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(
            new Error(
              `PowerShell exited with code ${code}: ${stderr.trim() || '(no error output)'}`,
            ),
          );
        }
      });
    });
  } finally {
    await rm(scriptPath, { force: true });
  }
}
