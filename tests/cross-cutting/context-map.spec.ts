/**
 * The context map, asserted against the code it describes.
 *
 * `dependsOn` in each manifest is not a dependency list — it is a labelled graph, where every edge
 * says which sibling is reached and what kind of relationship that is. A label nobody checks is a
 * comment with extra syntax, so this file holds it to two things:
 *
 *   1. **The edge is real.** A declared dependency that nothing imports is a claim about coupling
 *      that has already been undone — and this client had one for months: `cart` kept
 *      `dependsOn: ['orders']` after checkout moved into the cart store and the import went away.
 *   2. **The edge is declared.** The reverse: an import across a module boundary that no edge
 *      names. ESLint stops a module reaching a sibling's internals; nothing until now stopped it
 *      reaching a sibling it never admitted to needing.
 *
 * `.vue` files are scanned as well as `.ts`. On a client most cross-module reach happens in a
 * component — `Order.vue` calling `useCartStore`, the catalogue mounting an add-to-cart button —
 * so a sweep that read only TypeScript would miss the majority of the real graph.
 *
 * Imports are read from source rather than resolved: the question is what the code SAYS, and a spec
 * that needed the app mounted to answer it would be an e2e test.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enabledModules } from '@/modules';
import type { ContextRelationship } from '@/kernel/registry';

const MODULES_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../src/modules');

/** Every `.ts` and `.vue` file below `directory`, recursively. */
const listFiles = (directory: string): string[] =>
    readdirSync(directory).flatMap((entry) => {
        const entryPath = path.join(directory, entry);
        if (statSync(entryPath).isDirectory()) return listFiles(entryPath);
        return /\.(ts|vue)$/.test(entryPath) ? [entryPath] : [];
    });

/**
 * Which siblings a module's production code imports.
 *
 * Specs are excluded deliberately: a spec may name another domain to build the state it needs,
 * and counting that here would make every module look coupled to every module it borrows a
 * fixture from.
 */
const importedSiblings = (owner: string): Set<string> => {
    const siblings = new Set<string>();
    for (const file of listFiles(path.join(MODULES_ROOT, owner))) {
        if (/[/\\]tests[/\\]/.test(file)) continue;
        for (const match of readFileSync(file, 'utf8').matchAll(/["']@\/modules\/([^"'/]+)/g))
            if (match[1] !== owner) siblings.add(match[1]);
    }
    return siblings;
};

/** `<from>→<to>` for every declared edge, with its kind. */
const declaredEdges = (): { from: string; to: string; as: ContextRelationship }[] =>
    enabledModules.flatMap((appModule) =>
        (appModule.dependsOn ?? []).map((edge) => ({
            from: appModule.name,
            to: edge.module,
            as: edge.as
        }))
    );

describe('the context map describes the imports that exist', () => {
    it('finds the modules it is meant to check', () => {
        // A canary: an empty sweep must mean "nothing depends on anything", not "the sweep broke".
        expect(declaredEdges().length).toBeGreaterThanOrEqual(6);
    });

    it('declares no edge that nothing imports', () => {
        const stale = declaredEdges()
            .filter(({ from, to }) => !importedSiblings(from).has(to))
            .map(({ from, to }) => `${from} declares ${to}, but imports nothing from it`);

        expect(stale).toEqual([]);
    });

    it('imports no sibling that no edge declares', () => {
        const undeclared: string[] = [];

        for (const appModule of enabledModules) {
            const declared = new Set((appModule.dependsOn ?? []).map((edge) => edge.module));
            for (const sibling of importedSiblings(appModule.name))
                if (!declared.has(sibling))
                    undeclared.push(
                        `${appModule.name} imports ${sibling}, but declares no edge to it`
                    );
        }

        expect(undeclared).toEqual([]);
    });

    it('reaches a sibling only for state it asks to change, or vocabulary it can hold', () => {
        // The client's own version of "keep shared kernels rare". There is no `shared-kernel` on
        // this side at all — the server is the only writer — so every edge has to be one of the
        // three cheaper kinds, and a fourth appearing means the client has started owning state
        // that the API owns.
        const kinds = new Set(declaredEdges().map(({ as }) => as));
        expect([...kinds].toSorted()).toEqual(
            ['conformist', 'customer-supplier', 'published-language'].filter((kind) =>
                kinds.has(kind as ContextRelationship)
            )
        );
    });
});
