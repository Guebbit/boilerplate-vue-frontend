/**
 * `scripts/mutation/check-baseline.ts` — what a plain check does when no baseline file exists.
 *
 * Run through the real entry point in a scratch directory: the script reads and writes relative
 * to the working directory, so nothing in the repo is touched.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/** The script under test, and the repo's own tsx to run it. */
const root = path.resolve(__dirname, '../../../..');

/** Scratch directories to remove after each case. */
const scratch: string[] = [];

afterEach(() => {
    for (const directory of scratch.splice(0)) rmSync(directory, { recursive: true, force: true });
});

/** Runs the CLI in a fresh directory holding a one-file mutation report and no baseline. */
const runCheck = (...flags: string[]) => {
    const cwd = mkdtempSync(path.join(tmpdir(), 'mutation-check-'));
    scratch.push(cwd);
    mkdirSync(path.join(cwd, 'reports/mutation'), { recursive: true });
    writeFileSync(
        path.join(cwd, 'reports/mutation/mutation.json'),
        JSON.stringify({ files: { 'src/a.ts': { mutants: [{ status: 'Killed' }] } } })
    );
    const result = spawnSync(
        path.join(root, 'node_modules/.bin/tsx'),
        [path.join(root, 'scripts/mutation/check-baseline.ts'), ...flags],
        { cwd, encoding: 'utf8' }
    );
    return { result, baseline: path.join(cwd, 'mutation-baseline.json') };
};

describe('check-baseline with no baseline file', () => {
    it('records nothing on a plain check', () => {
        const { result, baseline } = runCheck();

        expect(result.status).toBe(0);
        expect(existsSync(baseline)).toBe(false);
    });

    it('records the first baseline under --update', () => {
        const { result, baseline } = runCheck('--update');

        expect(result.status).toBe(0);
        expect(existsSync(baseline)).toBe(true);
    });
});
