/**
 * `MODULE_EDGES`'s own per-module lint block only ever checks a module against its OWN entry —
 * nothing walked the graph as a whole before `assertAcyclicModuleEdges`, so `cart: ['orders']`
 * beside `orders: ['cart']` passed lint forever (FA73). This proves the walk itself: the real
 * `MODULE_EDGES` against the real module folders is asserted acyclic in `eslint.config.ts` at
 * lint time, which this suite does not load — a fixture graph is what a unit test can drive.
 */
import { describe, expect, it } from 'vitest';
import {
    assertAcyclicModuleEdges,
    KNOWN_CYCLE_EDGES,
    MODULE_EDGES
} from '../../../scripts/module-edges';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The FE module folder names actually on disk, the same list `eslint.config.ts` reads. */
const moduleFolderNames = (): string[] => {
    const modulesRoot = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../../src/modules'
    );
    return readdirSync(modulesRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map(({ name }) => name);
};

describe('assertAcyclicModuleEdges', () => {
    it('passes the real MODULE_EDGES with its one grandfathered edge skipped', () => {
        expect(() =>
            assertAcyclicModuleEdges(MODULE_EDGES, moduleFolderNames(), KNOWN_CYCLE_EDGES)
        ).not.toThrow();
    });

    it('pins down exactly the cycle KNOWN_CYCLE_EDGES exists to grandfather', () => {
        // Without the exemption, the real graph throws — proving the exemption is load-bearing
        // and not a dead parameter nobody's build ever exercises.
        expect(() => assertAcyclicModuleEdges(MODULE_EDGES, moduleFolderNames())).toThrow(
            'MODULE_EDGES has a cycle: cart -> products -> cart.'
        );
    });

    it('refuses a direct cycle between two modules', () => {
        expect(() =>
            assertAcyclicModuleEdges({ cart: ['orders'], orders: ['cart'] }, ['cart', 'orders'])
        ).toThrow('MODULE_EDGES has a cycle');
    });

    it('refuses a longer cycle, not only a direct one', () => {
        expect(() =>
            assertAcyclicModuleEdges({ a: ['b'], b: ['c'], c: ['a'] }, ['a', 'b', 'c'])
        ).toThrow('MODULE_EDGES has a cycle');
    });

    it('refuses a key naming a module that no longer exists', () => {
        expect(() => assertAcyclicModuleEdges({ deleted: ['cart'] }, ['cart'])).toThrow(
            'MODULE_EDGES names "deleted"'
        );
    });

    it('allows a value naming no FE folder of its own — a backend-only module', () => {
        // `account: ['addresses']` in production: `addresses` owns no `src/modules/addresses`.
        expect(() =>
            assertAcyclicModuleEdges({ account: ['addresses'] }, ['account'])
        ).not.toThrow();
    });

    it('allows a diamond — two modules sharing a dependency is not a cycle', () => {
        expect(() =>
            assertAcyclicModuleEdges({ orders: ['cart', 'payments'], cart: ['payments'] }, [
                'orders',
                'cart',
                'payments'
            ])
        ).not.toThrow();
    });
});
