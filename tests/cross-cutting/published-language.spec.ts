/**
 * The barrel as published language.
 *
 * `index.ts` is the one surface a module offers its siblings, and ESLint already stops anyone
 * reaching past it. What ESLint cannot say is whether the surface is the right SIZE, and that is
 * the half that rots: an export costs nothing to add, nothing to keep, and quietly promises every
 * other module that a shape will not move.
 *
 * The rule, applied to every module at once:
 *
 *   **A module publishes exactly what a sibling imports. No sibling, no barrel.**
 *
 * Three whole barrels went when it was first applied — `admin`, `orders` and `realtime` — along
 * with four stores nobody had ever imported. `orders` is the instructive one: its barrel published
 * `useOrdersStore` "for the cart's checkout", and the checkout had moved into the cart store long
 * before, taking the import with it. The export outlived its reason by a whole refactor, and
 * nothing said so.
 *
 * What survives says something about a client specifically. The modules that publish a **store**
 * are the ones siblings ask to change state — `cart` and `wishlist`. The ones that publish a
 * **component** or a **schema** are answering a narrower question, and are the better shape:
 * `PaymentPanel` renders a payment without its caller learning what a provider is.
 *
 * Specs, a sibling's or the module's own, do not count as consumers. A spec importing its own
 * barrel is the module talking to itself, and test plumbing reaches internals through
 * `tests/support/`, so a seam only a spec uses never earns a place in the barrel.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The `src` folder, two levels above this file. */
const SOURCE_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../src');

/** Where every module lives. */
const MODULES_ROOT = path.join(SOURCE_ROOT, 'modules');

/** Every `.ts` and `.vue` file below `directory`, recursively. */
const listFiles = (directory: string): string[] =>
    readdirSync(directory).flatMap((entry) => {
        const entryPath = path.join(directory, entry);
        if (statSync(entryPath).isDirectory()) return listFiles(entryPath);
        return /\.(ts|vue)$/.test(entryPath) ? [entryPath] : [];
    });

/** The names in one `{ … }` clause, with `type` prefixes dropped. */
const clauseNames = (clause: string): string[] =>
    clause
        .split(',')
        .map((name) => name.trim().replace(/^type\s+/, ''))
        .filter(Boolean);

/** Every module's folder name. */
const moduleNames = (): string[] =>
    readdirSync(MODULES_ROOT).filter((entry) =>
        statSync(path.join(MODULES_ROOT, entry)).isDirectory()
    );

/** What `<module>/index.ts` promises, or `undefined` when it has no barrel. */
const publishedBy = (name: string): Set<string> | undefined => {
    const barrel = path.join(MODULES_ROOT, name, 'index.ts');
    if (!existsSync(barrel)) return undefined;

    const published = new Set<string>();
    for (const clause of readFileSync(barrel, 'utf8').matchAll(/export\s+(?:type\s+)?{([^}]*)}/g))
        // `export { default as X }` publishes `X` — the promise is the name the caller writes.
        for (const name_ of clauseNames(clause[1])) published.add(name_.split(/\s+as\s+/).pop()!);
    return published;
};

/** The names `source` imports from the `target` module's barrel, `as` aliases stripped. */
const importedNames = (source: string, target: string): string[] => {
    const pattern = new RegExp(
        String.raw`import\s+(?:type\s+)?{([^}]*)}\s+from\s+["']@/modules/${target}["']`,
        'g'
    );
    return [...source.matchAll(pattern)].flatMap((clause) =>
        clauseNames(clause[1]).map((name) => name.split(/\s+as\s+/)[0].trim())
    );
};

/** Whether a path sits under a `tests` folder, a module's own or the shared one. */
const isInTestsFolder = (file: string): boolean =>
    path.relative(SOURCE_ROOT, file).split(path.sep).includes('tests');

/** `<module> → the names other modules actually import from its barrel`. */
const consumedFromBarrels = (): Map<string, Set<string>> => {
    const consumed = new Map(moduleNames().map((name) => [name, new Set<string>()]));

    for (const file of listFiles(SOURCE_ROOT).filter((entry) => !isInTestsFolder(entry))) {
        const owner = file.startsWith(MODULES_ROOT)
            ? path.relative(MODULES_ROOT, file).split(path.sep)[0]
            : undefined;
        const source = readFileSync(file, 'utf8');

        // Own files: a module is not a consumer of itself.
        for (const target of moduleNames().filter((name) => name !== owner))
            for (const name of importedNames(source, target)) consumed.get(target)!.add(name);
    }
    return consumed;
};

describe('a barrel publishes exactly what a sibling imports', () => {
    it('finds the barrels it is meant to check', () => {
        // A canary: an empty sweep must mean "no module publishes anything", not "the sweep
        // broke". A floor of 1 rather than this demo's barrel count — deleting a domain must not
        // also delete the canary.
        const withBarrels = moduleNames().filter((name) => publishedBy(name) !== undefined);
        expect(withBarrels.length).toBeGreaterThanOrEqual(1);
    });

    it('promises nothing to nobody', () => {
        const consumed = consumedFromBarrels();
        const unused = moduleNames().flatMap((name) =>
            [...(publishedBy(name) ?? [])]
                .filter((exported) => !consumed.get(name)!.has(exported))
                .map((exported) => `${name} publishes ${exported}, which no sibling imports`)
        );

        expect(unused).toEqual([]);
    });

    it('gives no barrel to a module nothing imports', () => {
        const consumed = consumedFromBarrels();
        const pointless = moduleNames()
            .filter((name) => publishedBy(name) !== undefined && consumed.get(name)!.size === 0)
            .map((name) => `${name} has an index.ts, but no sibling imports it`);

        expect(pointless).toEqual([]);
    });
});
