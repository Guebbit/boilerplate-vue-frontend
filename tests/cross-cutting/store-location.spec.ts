/**
 * A module's stores live where the coverage floor can see them.
 *
 * `vitest.config.ts` floors domain stores with one glob per shape below. A glob cannot report
 * what it fails to match, so a store named anything else does not score lower — it does not score
 * at all, silently, and the green number is measuring a smaller set than the reader believes.
 *
 * Two shapes, and a module picks one:
 *
 *   - `store.ts` — one store, which is every module today.
 *   - `stores/*.ts` — genuinely more than one, the shape `src/infrastructure/stores/` already
 *     uses for `session` and `observability`.
 *
 * Never both, because "which file holds the cart store" must have one answer, and never any other
 * filename. A module reaching for the plural form is worth a second look before it is granted: two
 * stores in one bounded context is often two bounded contexts.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULES_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../src/modules');

/** Every `.ts` file under a module, excluding its own specs. */
const sourceFiles = (moduleRoot: string): string[] =>
    readdirSync(moduleRoot, { withFileTypes: true, recursive: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
        .map((entry) => path.relative(moduleRoot, path.join(entry.parentPath, entry.name)))
        .filter((relative) => !relative.split(path.sep).includes('tests'));

/** Module directories, by name. */
const moduleNames = (): string[] =>
    readdirSync(MODULES_ROOT, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map(({ name }) => name);

/**
 * Where a module declares Pinia stores, as paths relative to the module root.
 *
 * Matched on the `defineStore(` call rather than on the filename, which is the whole point: a
 * filename can be anything, and the call is what the coverage glob is trying to find.
 */
const storeFilesOf = (name: string): string[] => {
    const moduleRoot = path.join(MODULES_ROOT, name);
    if (!existsSync(moduleRoot) || !statSync(moduleRoot).isDirectory()) return [];
    return sourceFiles(moduleRoot).filter((relative) =>
        readFileSync(path.join(moduleRoot, relative), 'utf8').includes('defineStore(')
    );
};

/** The two permitted shapes, as a predicate over a module-relative path. */
const isPermitted = (relative: string): boolean => {
    const segments = relative.split(path.sep);
    if (segments.length === 1) return segments[0] === 'store.ts';
    return segments.length === 2 && segments[0] === 'stores';
};

describe('where a module keeps its stores', () => {
    it.each(moduleNames())('%s puts every defineStore where the coverage glob looks', (name) => {
        const misplaced = storeFilesOf(name).filter((relative) => !isPermitted(relative));

        expect(misplaced).toEqual([]);
    });

    it('never lets a module use both shapes at once', () => {
        const ambiguous = moduleNames().filter((name) => {
            const files = storeFilesOf(name);
            return (
                files.includes('store.ts') && files.some((f) => f.startsWith(`stores${path.sep}`))
            );
        });

        expect(ambiguous).toEqual([]);
    });

    /**
     * The guard on the guard. If the search stopped finding stores — a changed layout, a renamed
     * root — every assertion above would pass over an empty list and report nothing.
     */
    it('finds the stores it is meant to be checking', () => {
        const withStores = moduleNames().filter((name) => storeFilesOf(name).length > 0);

        expect(withStores.length).toBeGreaterThan(10);
    });
});
