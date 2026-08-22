/**
 * `scripts/demo-scratch.ts` — the scratch directory a spawned demo backend writes its Mongo under.
 *
 * Three properties: it exists on disk and not under `os.tmpdir()` (the tmpfs this file exists to
 * keep clear), it is short enough for the Unix socket `tsx` opens under it, and removing it takes
 * everything a killed mongod left inside.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
    createDemoScratchDirectory,
    removeDemoScratchDirectory
} from '../../../scripts/demo-scratch';

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
});
