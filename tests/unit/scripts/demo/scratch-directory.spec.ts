/**
 * `scripts/demo/scratch-directory.ts` — the scratch directory a spawned demo backend writes its Mongo under.
 *
 * Four properties: it exists on disk and not under `os.tmpdir()` (the tmpfs this file exists to
 * keep clear), it is short enough for the Unix socket `tsx` opens under it, removing it takes
 * everything a killed mongod left inside, and creating one reclaims what runs that were killed
 * before they could clean up left behind.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
    createDemoScratchDirectory,
    removeDemoScratchDirectory
} from '../../../../scripts/demo/scratch-directory';

/**
 * A pid that is certainly not running: `spawnSync` blocks until the child has been waited for, so
 * by the time it returns the id is released rather than a zombie still answering signal 0.
 */
const deadPid = (): string => {
    const { pid } = spawnSync(process.execPath, ['-e', '']);
    expect(pid, 'a spawned pid to reuse as a dead one').toBeTypeOf('number');
    return String(pid);
};

describe('demo-scratch', () => {
    it('creates a short, per-process directory under the user cache, not the system temp dir', () => {
        const directory = createDemoScratchDirectory();
        try {
            expect(existsSync(directory)).toBe(true);
            expect(directory.startsWith(path.join(os.homedir(), '.cache'))).toBe(true);
            expect(directory.startsWith(os.tmpdir())).toBe(false);
            // `tsx` opens a Unix socket under TMPDIR, and socket paths are capped at 108 bytes.
            expect(directory.length).toBeLessThan(70);
            expect(path.basename(directory)).toBe(String(process.pid));
        } finally {
            removeDemoScratchDirectory(directory);
        }
    });

    it('removes the directory with whatever a killed mongod left in it', () => {
        const directory = createDemoScratchDirectory();
        const leftover = path.join(directory, 'mongo-mem-abc123');
        mkdirSync(leftover);
        writeFileSync(path.join(leftover, 'WiredTiger.lock'), '');

        removeDemoScratchDirectory(directory);
        expect(existsSync(directory)).toBe(false);
    });

    it('tolerates a directory that is already gone', () => {
        expect(() =>
            removeDemoScratchDirectory(path.join(os.tmpdir(), 'never-created-demo-scratch'))
        ).not.toThrow();
    });

    it('sweeps the scratch of a run that is no longer running, and keeps a live one', () => {
        const own = createDemoScratchDirectory();
        const root = path.dirname(own);
        // An abandoned run's leftovers, mongod data and all...
        const abandoned = path.join(root, deadPid());
        mkdirSync(path.join(abandoned, 'mongo-mem-dead'), { recursive: true });
        // ...and something whose name was never a pid, which this is not entitled to touch.
        const foreign = path.join(root, 'not-a-pid');
        mkdirSync(foreign, { recursive: true });

        try {
            // Creating the next run's directory is what does the sweeping.
            expect(createDemoScratchDirectory()).toBe(own);
            expect(existsSync(abandoned), "the dead run's scratch").toBe(false);
            expect(existsSync(own), "this run's own scratch").toBe(true);
            expect(existsSync(foreign), 'a directory that is not named after a pid').toBe(true);
        } finally {
            removeDemoScratchDirectory(foreign);
            removeDemoScratchDirectory(own);
        }
    });
});
