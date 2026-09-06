/**
 * @module
 * Every `scripts/` file that walks up from its own directory to the repo root must actually
 * arrive there. The walk is a hard-coded number of `..` segments, so moving a script one folder
 * deeper silently retargets it — the class of fault this asserts against, by resolving each
 * expression for real and requiring the result to hold `package.json`.
 */

import { describe, expect, it } from 'vitest';
import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 * Matches `path.resolve(import.meta.dirname, '..', '..')` and its `path.join` twin, capturing the
 * argument list after the directory so the `..` segments can be counted.
 */
const ROOT_WALK = /path\.(?:resolve|join)\(\s*import\.meta\.dirname\s*,([^)]*)\)/g;

/** One `..`-walk found in a script: where it was written, and how many levels it climbs. */
interface RootWalk {
    file: string;
    levels: number;
}

/**
 * Every upward walk in `scripts/`, read as text.
 *
 * Text rather than import: these files spawn processes and read `.env` at module scope, so
 * importing one to inspect a constant would run it.
 */
const rootWalks = (): RootWalk[] =>
    globSync('scripts/**/*.ts', { cwd: REPO_ROOT })
        .map((entry) => entry.split(path.sep).join('/'))
        .toSorted()
        .flatMap((file) => {
            const source = readFileSync(path.join(REPO_ROOT, file), 'utf8');
            return [...source.matchAll(ROOT_WALK)].map((match) => ({
                file,
                levels: [...match[1].matchAll(/["']\.\.["']/g)].length
            }));
        });

describe('a script that walks up to the repo root lands on it', () => {
    /**
     * The guard on the guard: a regex that stopped matching would make every assertion below
     * vacuous, which is exactly how the fault it covers went unnoticed.
     */
    it('finds the walks it is meant to check', () => {
        expect(rootWalks().length).toBeGreaterThan(0);
    });

    it.each(rootWalks())(
        '$file climbs $levels level(s) and reaches the repo root',
        ({ file, levels }) => {
            const from = path.dirname(path.join(REPO_ROOT, file));
            const resolved = path.resolve(from, ...Array.from({ length: levels }, () => '..'));

            // `package.json` is the marker rather than a name check: `scripts/` resolves cleanly as a
            // path and holds no manifest, which is precisely how a short walk passes unnoticed.
            expect(
                globSync('package.json', { cwd: resolved }),
                `${file} resolves to ${resolved}`
            ).toEqual(['package.json']);
            expect(resolved).toBe(REPO_ROOT);
        }
    );
});
