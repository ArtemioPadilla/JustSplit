import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Plan A7: suites that pin `process.env.TZ` must put it back the way they
 * found it. `process.env.TZ = originalTZ` with `originalTZ === undefined`
 * does NOT unset the variable: Node stringifies it, leaving TZ set to the
 * literal "undefined" (an invalid zone that quietly means UTC) for every
 * later suite in the same worker. When TZ was unset the variable has to be
 * deleted (`if (originalTZ === undefined) delete process.env.TZ; else …`), the
 * way `src/domain/timeline/*.test.ts` and B11b's suites do.
 */
const SRC = resolve(__dirname, '..');
const SELF = 'tests/tz-restore.test.ts';

function testFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return testFiles(path);
    return /\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('TZ restore in test suites (plan A7)', () => {
  it('never assigns process.env.TZ = originalTZ unconditionally', () => {
    const offenders: string[] = [];
    for (const file of testFiles(SRC)) {
      const name = relative(SRC, file);
      if (name === SELF) continue;
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          // `else process.env.TZ = originalTZ;` (after `if (…undefined) delete …`) is the correct form.
          if (/process\.env\.TZ\s*=\s*originalTZ\b/.test(line) && !/\belse\s+process\.env\.TZ\s*=/.test(line)) {
            offenders.push(`${name}:${index + 1}`);
          }
        });
    }
    expect(offenders).toEqual([]);
  });
});
