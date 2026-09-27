/**
 * A module's `@api` calls stay inside its declared coupling (FA59, `MODULE_EDGES`).
 *
 * `MODULE_EDGES` already stops a module reaching a sibling's SOURCE (`@/modules/<x>`) —
 * `eslint.config.ts`'s boundary rules. It said nothing about a module calling another module's
 * BACKEND operation directly through `@api`, because nothing in the contract said which backend
 * module an operation belonged to. `contracts/rest/operation-modules.ts` (generated from
 * `openapi.yaml`'s `x-module` stamps) closes that gap: this sweep reads it, and flags a call to a
 * module the caller neither is nor has declared.
 *
 * A module's own specs deliberately do not count as callers, the same exemption
 * `published-language.spec.ts` makes for its own barrel check — a spec importing `@api` directly
 * is exercising the contract, not the module reaching for another domain at runtime.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPERATION_MODULES } from '../../contracts/rest/operation-modules';
import { MODULE_EDGES } from '../../scripts/module-edges';

const SOURCE_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../src');
const MODULES_ROOT = path.join(SOURCE_ROOT, 'modules');

/** Every `.ts` and `.vue` file below `directory`, recursively, specs excluded. */
const listFiles = (directory: string): string[] =>
    readdirSync(directory).flatMap((entry) => {
        const entryPath = path.join(directory, entry);
        if (statSync(entryPath).isDirectory()) return listFiles(entryPath);
        if (entryPath.includes(`${path.sep}tests${path.sep}`)) return [];
        return /\.(ts|vue)$/.test(entryPath) ? [entryPath] : [];
    });

/** The names in one `{ … }` import clause, `type` prefixes and `as` aliases dropped. */
const clauseNames = (clause: string): string[] =>
    clause
        .split(',')
        .map((name) => name.trim().replace(/^type\s+/, ''))
        .filter(Boolean)
        .map((name) => name.split(/\s+as\s+/)[0].trim());

const moduleNames = (): string[] =>
    readdirSync(MODULES_ROOT).filter((entry) =>
        statSync(path.join(MODULES_ROOT, entry)).isDirectory()
    );

/** Every name one file imports from `@api` — the generated REST client's barrel. */
const apiImportsOf = (file: string): string[] => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(/import\s+(?:type\s+)?{([^}]*)}\s+from\s+["']@api["']/g)].flatMap(
        (match) => clauseNames(match[1])
    );
};

/** `<module> → the backend modules it calls through `@api`, excluding itself. */
const backendModulesCalledBy = (moduleName: string): Set<string> => {
    const called = new Set<string>();
    for (const file of listFiles(path.join(MODULES_ROOT, moduleName)))
        for (const name of apiImportsOf(file)) {
            // A name `@api` also exports as a TYPE (a model, an enum) is not in this map — only a
            // generated FUNCTION is, since only a function is a call to an operation.
            const owner = OPERATION_MODULES[name];
            if (owner && owner !== moduleName) called.add(owner);
        }
    return called;
};

describe('a module calls only the backend modules its coupling declares', () => {
    it('finds modules to check', () => {
        // A canary: an empty sweep must mean "no modules exist", not "the sweep broke".
        expect(moduleNames().length).toBeGreaterThan(0);
    });

    it('actually finds cross-module calls to check against MODULE_EDGES', () => {
        // A second canary: this test could otherwise pass vacuously forever if the `@api` import
        // regex, the `contracts/rest/operation-modules` path, or the module-name matching ever
        // broke — no violations found is meaningless unless calls were found at all.
        const totalCalls = moduleNames().reduce(
            (total, moduleName) => total + backendModulesCalledBy(moduleName).size,
            0
        );

        expect(totalCalls).toBeGreaterThan(0);
    });

    it('flags a call to an undeclared backend module', () => {
        const violations = moduleNames().flatMap((moduleName) => {
            const allowed = new Set(MODULE_EDGES[moduleName]);
            return [...backendModulesCalledBy(moduleName)]
                .filter((owner) => !allowed.has(owner))
                .map(
                    (owner) =>
                        `${moduleName} calls ${owner}'s contract operations, undeclared in MODULE_EDGES`
                );
        });

        expect(violations).toEqual([]);
    });
});
