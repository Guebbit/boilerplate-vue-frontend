/**
 * `scripts/docs/repo-references.ts` — the tracked-file set every reference check resolves against.
 *
 * `trackedTargets`: what a citation may resolve to, and what it may not.
 * `allowed`:        the paths a clean checkout legitimately lacks.
 */
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gitEnvironment } from '../../../scripts/git-base';
import { allowed, trackedTargets } from '../../../scripts/docs/repo-references';

/** `execFile` without blocking the event loop. */
const run = promisify(execFile);

describe('trackedTargets', () => {
    /** A scratch repo, so the case controls exactly which files git tracks. */
    let root: string;

    beforeEach(async () => {
        root = await mkdtemp(path.join(os.tmpdir(), 'repo-references-'));
        // git: an empty repo, then stage files — `ls-files` lists the index, no commit needed.
        await run('git', ['init', '--quiet'], { cwd: root, env: gitEnvironment() });
        for (const file of ['src/kept.ts', '.2brain/llm-wiki/src/gone.ts.md']) {
            await mkdir(path.dirname(path.join(root, file)), { recursive: true });
            await writeFile(path.join(root, file), '');
        }
        await run('git', ['add', '.'], { cwd: root, env: gitEnvironment() });
    });

    afterEach(() => rm(root, { recursive: true, force: true }));

    it('resolves a tracked source file', () => {
        expect(trackedTargets(root).targets.has('src/kept.ts')).toBe(true);
    });

    it('does not let a `.2brain` mirror page vouch for a source file that is gone', () => {
        const { targets } = trackedTargets(root);

        expect(targets.has('src/gone.ts.md')).toBe(false);
        expect(targets.has('gone.ts.md')).toBe(false);
    });

    it('keeps `.2brain` out of the tracked roots', () => {
        expect(trackedTargets(root).roots.has('.2brain')).toBe(false);
    });
});

describe('allowed', () => {
    it('accepts a generated file whichever tail of its path is spelled', () => {
        expect(allowed('tours.generated.ts')).toBe(true);
        expect(allowed('src/app/tours/tours.generated.ts')).toBe(true);
    });

    it('accepts a directory on the way to an allowlisted prefix', () => {
        expect(allowed('reports')).toBe(true);
        expect(allowed('reports/mutation')).toBe(true);
    });

    it('refuses a path that is neither allowlisted nor on the way to one', () => {
        expect(allowed('src/gone.ts')).toBe(false);
    });
});
