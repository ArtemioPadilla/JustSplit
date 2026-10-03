import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

/**
 * Plan B20a: which Cloudflare Pages branch a push deploys to. The Pages project
 * `justsplit` has `main` as its production branch, so `main` is production and
 * every other branch is a preview (`<branch>.justsplit.pages.dev`). The branch
 * name is attacker-influenced text (a ref may contain `$`, `(`, `;`, backticks):
 * it is reduced to a safe alphabet before it can reach a command line.
 */
const SCRIPT = resolve(__dirname, '../../scripts/pages-target.mjs');
const load = () => import(/* @vite-ignore */ pathToFileURL(SCRIPT).href) as Promise<{ pagesBranch: (ref: string) => string }>;

describe('pagesBranch (plan B20a)', () => {
  it('maps refs/heads/main to the production branch', async () => {
    expect((await load()).pagesBranch('refs/heads/main')).toBe('main');
  });

  it.each([
    ['refs/heads/inceptor', 'inceptor'],
    ['refs/heads/claude/inceptor-migration-t6bkmv', 'claude/inceptor-migration-t6bkmv'],
    ['refs/heads/phase-3/issue-B20a-cloudflare-pages', 'phase-3/issue-B20a-cloudflare-pages'],
    ['refs/heads/feat/a.b_c', 'feat/a.b_c'],
  ])('keeps a normal branch name as the preview branch: %s', async (ref, expected) => {
    expect((await load()).pagesBranch(ref)).toBe(expected);
  });

  it.each([
    ['refs/heads/x;rm -rf ~', 'x-rm--rf--'],
    ['refs/heads/$(id)', 'x--id-'],
    ['refs/heads/a`b`', 'a-b-'],
    ['refs/heads/a&&b|c', 'a--b-c'],
    ['refs/heads/--branch=main', 'x--branch-main'],
  ])('replaces anything outside [A-Za-z0-9._/-] and never starts with a dash: %s', async (ref, expected) => {
    const out = (await load()).pagesBranch(ref);
    expect(out).toBe(expected);
    expect(out).toMatch(/^[A-Za-z0-9._/-]+$/);
    expect(out.startsWith('-')).toBe(false);
  });

  it('a branch that merely looks like main is a preview, not production', async () => {
    const { pagesBranch } = await load();
    expect(pagesBranch('refs/heads/main2')).toBe('main2');
    expect(pagesBranch('refs/heads/feat/main')).toBe('feat/main');
    expect(pagesBranch('refs/heads/Main')).toBe('Main');
  });

  it('refuses anything that is not a branch ref (a tag or a PR merge ref never deploys)', async () => {
    const { pagesBranch } = await load();
    expect(() => pagesBranch('refs/tags/v1')).toThrow(/branch/i);
    expect(() => pagesBranch('refs/pull/12/merge')).toThrow(/branch/i);
    expect(() => pagesBranch('')).toThrow(/branch/i);
  });
});

describe('scripts/pages-target.mjs as the workflow runs it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pages-target-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('writes `branch=<name>` to $GITHUB_OUTPUT and nothing else', () => {
    const out = join(dir, 'output');
    writeFileSync(out, '');
    execFileSync('node', [SCRIPT], { env: { ...process.env, REF: 'refs/heads/inceptor', GITHUB_OUTPUT: out } });
    expect(readFileSync(out, 'utf8')).toBe('branch=inceptor\n');
  });

  it('exits non-zero for a tag ref and writes no output', () => {
    const out = join(dir, 'output-tag');
    writeFileSync(out, '');
    expect(() => execFileSync('node', [SCRIPT], { env: { ...process.env, REF: 'refs/tags/v1', GITHUB_OUTPUT: out }, stdio: 'pipe' })).toThrow();
    expect(readFileSync(out, 'utf8')).toBe('');
  });
});
