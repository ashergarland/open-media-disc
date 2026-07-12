/** Parsed CLI arguments: positional values and named options. */
export interface ParsedArgs {
  positionals: string[];
  options: Record<string, string | boolean>;
}

/**
 * Minimal, dependency-free argument parser.
 *
 * Supports:
 *   - positionals: `omd create ./album`
 *   - `--flag` (boolean true)
 *   - `--key value` and `--key=value`
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const options: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith('--')) {
      const body = arg.slice(2);
      const eq = body.indexOf('=');
      if (eq >= 0) {
        options[body.slice(0, eq)] = body.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('--')) {
          options[body] = next;
          i += 1;
        } else {
          options[body] = true;
        }
      }
    } else {
      positionals.push(arg);
    }
  }

  return { positionals, options };
}

/** Read a string option, returning undefined for missing or boolean flags. */
export function stringOption(args: ParsedArgs, key: string): string | undefined {
  const value = args.options[key];
  return typeof value === 'string' ? value : undefined;
}

/** Read an integer option, or undefined when absent/invalid. */
export function intOption(args: ParsedArgs, key: string): number | undefined {
  const value = stringOption(args, key);
  if (value === undefined) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

/** Read a floating-point option, or undefined when absent/invalid. */
export function floatOption(args: ParsedArgs, key: string): number | undefined {
  const value = stringOption(args, key);
  if (value === undefined) return undefined;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Read a boolean flag. */
export function boolOption(args: ParsedArgs, key: string): boolean {
  return args.options[key] === true || args.options[key] === 'true';
}
