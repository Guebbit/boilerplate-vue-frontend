/**
 * `scripts/module-manifest.ts` — the loader of every module's `group` and `dependsOn`, and the
 * graph walk. A scratch `src/modules` tree drives the loader's refusals; a fixture graph drives
 * the cycle check. The real tree is asserted in `tests/cross-cutting/module-groups.spec.ts`, and
 * its graph is walked at lint time by `eslint.config.ts`.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
    assertAcyclicModuleEdges,
    demoModuleNames,
    loadModuleManifest,
    moduleDependsOn
} from '../../../scripts/module-manifest';

/** The scratch `src/modules` root, fresh per case. */
let root: string;

/** Creates a module folder, with a `module.yaml` when `yaml` is given. */
const addModule = (name: string, yaml?: string): void => {
    mkdirSync(path.join(root, name), { recursive: true });
    if (yaml !== undefined) writeFileSync(path.join(root, name, 'module.yaml'), yaml);
};

beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'module-manifest-'));
});

afterEach(() => {
    rmSync(root, { recursive: true, force: true });
});

describe('loadModuleManifest', () => {
    it('reads group and dependsOn, and leaves a module with no dependsOn out of the edges', () => {
        addModule('cart', 'group: shop\ndependsOn:\n    - products\n    - addresses\n');
        addModule('account', 'group: foundation\n');

        const manifest = loadModuleManifest(root);

        expect(manifest.groups).toEqual({ cart: 'shop', account: 'foundation' });
        expect(manifest.edges).toEqual({ cart: ['products', 'addresses'] });
        expect(manifest.problems).toEqual([]);
    });

    it('reports a module with no module.yaml', () => {
        addModule('cart');

        const manifest = loadModuleManifest(root);

        expect(manifest.problems).toEqual(['Module "cart" has no module.yaml.']);
        expect(manifest.groups).toEqual({});
    });

    it('reports an invalid or missing group', () => {
        addModule('cart', 'group: retail\n');
        addModule('users', 'dependsOn:\n    - account\n');

        const manifest = loadModuleManifest(root);

        expect(manifest.problems).toHaveLength(2);
        expect(manifest.groups).toEqual({});
    });
});

describe('demoModuleNames', () => {
    it('picks the shop and example groups, never foundation', () => {
        expect(
            demoModuleNames({ a: 'foundation', b: 'shop', c: 'example', d: 'foundation' })
        ).toEqual(['b', 'c']);
    });
});

describe('assertAcyclicModuleEdges', () => {
    it('passes the real dependsOn graph', () => {
        expect(() => assertAcyclicModuleEdges(moduleDependsOn)).not.toThrow();
    });

    it('refuses a direct cycle between two modules', () => {
        expect(() => assertAcyclicModuleEdges({ cart: ['orders'], orders: ['cart'] })).toThrow(
            'dependsOn has a cycle'
        );
    });

    it('refuses a longer cycle, not only a direct one', () => {
        expect(() => assertAcyclicModuleEdges({ a: ['b'], b: ['c'], c: ['a'] })).toThrow(
            'dependsOn has a cycle'
        );
    });

    it('allows a value naming no FE folder of its own — a backend-only module', () => {
        // `account: ['addresses']` in production: `addresses` owns no `src/modules/addresses`.
        expect(() => assertAcyclicModuleEdges({ account: ['addresses'] })).not.toThrow();
    });

    it('allows a diamond — two modules sharing a dependency is not a cycle', () => {
        expect(() =>
            assertAcyclicModuleEdges({ orders: ['cart', 'payments'], cart: ['payments'] })
        ).not.toThrow();
    });
});
