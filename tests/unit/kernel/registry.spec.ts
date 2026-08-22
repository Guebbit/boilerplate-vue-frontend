import { describe, it, expect } from 'vitest';
import type { RouteRecordRaw } from 'vue-router';
import {
    collectModuleNavigation,
    collectModuleRoutes,
    groupNavigation,
    sortNavigation,
    validateModules
} from '@/kernel/registry';
import type { AppModule, AppNavigationEntry } from '@/kernel/registry';

/**
 * The registry decides what "this build" means, so its failures have to be loud and specific. A
 * misconfiguration that starts and then shows a blank page on one navigation is strictly worse
 * than one that refuses to start with the offending path named.
 *
 * Mirrors `tests/unit/kernel/registry.test.ts` in the backend boilerplate: same cases, same
 * field names, different runtime.
 */

const makeRoute = (name: string): RouteRecordRaw => ({
    path: name,
    name,
    component: { template: '<div />' }
});

/**
 * Names alone here: the cases below are about the graph, and every one of them would read worse
 * with a relationship kind and a sentence attached to an arrow between two modules called `a` and
 * `b`. The kinds are asserted where they mean something, against the real manifests, in
 * `tests/cross-cutting/context-map.spec.ts`.
 */
const makeModule = (name: string, dependsOn: string[] = []): AppModule => ({
    name,
    subdomain: 'supporting',
    routes: [makeRoute(name)],
    dependsOn: dependsOn.map((module) => ({
        module,
        as: 'conformist' as const,
        because: `${name} reads ${module}`
    }))
});

const withNav = (name: string, navigation: AppNavigationEntry[]): AppModule => ({
    name,
    subdomain: 'supporting',
    routes: [makeRoute(name)],
    navigation
});

describe('validateModules', () => {
    it('accepts a well-formed registry', () => {
        expect(() =>
            validateModules([makeModule('products'), makeModule('cart', ['products'])])
        ).not.toThrow();
    });

    it('rejects a module registered twice', () => {
        expect(() => validateModules([makeModule('products'), makeModule('products')])).toThrow(
            /registered twice/
        );
    });

    it('names the module and the dependency when a dependency is not enabled', () => {
        // The event-portal case from the plan: products is deleted, cart is not.
        expect(() => validateModules([makeModule('cart', ['products'])])).toThrow(
            /"cart" depends on "products", which is not enabled/
        );
    });

    it('rejects a module that depends on itself, by name rather than as a cycle', () => {
        // Reported separately because it is a typo, not an architecture problem — and the cycle
        // walk would otherwise describe it as `products → products`, which reads like a finding.
        expect(() => validateModules([makeModule('products', ['products'])])).toThrow(
            /"products" declares a dependency on itself/
        );
    });

    it('reports the path of a dependency cycle rather than just its existence', () => {
        expect(() =>
            validateModules([makeModule('cart', ['products']), makeModule('products', ['cart'])])
        ).toThrow(/cycle: (cart → products → cart|products → cart → products)/);
    });

    it('catches a cycle that closes through a third module', () => {
        expect(() =>
            validateModules([
                makeModule('a', ['b']),
                makeModule('b', ['c']),
                makeModule('c', ['a'])
            ])
        ).toThrow(/cycle:/);
    });

    it('accepts a diamond, which is not a cycle', () => {
        expect(() =>
            validateModules([
                makeModule('orders', ['products', 'users']),
                makeModule('products'),
                makeModule('users')
            ])
        ).not.toThrow();
    });
});

describe('collectModuleRoutes', () => {
    it('concatenates the route records of every enabled module', () => {
        const routes = collectModuleRoutes([makeModule('products'), makeModule('cart')]);

        expect(routes.map((route) => route.name)).toEqual(['products', 'cart']);
    });

    it('validates before collecting, so a broken registry yields no routes at all', () => {
        expect(() => collectModuleRoutes([makeModule('cart', ['products'])])).toThrow();
    });
});

describe('collectModuleNavigation', () => {
    it('concatenates the navigation entries of every enabled module', () => {
        const entries = collectModuleNavigation([
            withNav('products', [{ name: 'ProductsList', label: 'products', order: 60 }]),
            withNav('cart', [{ name: 'Cart', label: 'cart', order: 80 }])
        ]);

        expect(entries.map(({ name }) => name)).toEqual(['ProductsList', 'Cart']);
    });

    it('skips a module that contributes none, rather than yielding a hole', () => {
        const entries = collectModuleNavigation([
            makeModule('orders'),
            withNav('cart', [{ name: 'Cart', label: 'cart' }])
        ]);

        expect(entries).toHaveLength(1);
    });

    it('returns nothing for a build with no modules at all', () => {
        // The event-portal end state: every domain deleted, the shell still renders its own menu.
        expect(collectModuleNavigation([])).toEqual([]);
    });
});

describe('sortNavigation', () => {
    it('ranks by order regardless of module registration order', () => {
        const sorted = sortNavigation([
            { name: 'Cart', label: 'cart', order: 80 },
            { name: 'Home', label: 'home', order: 10 },
            { name: 'Admin', label: 'admin', order: 40 }
        ]);

        expect(sorted.map(({ name }) => name)).toEqual(['Home', 'Admin', 'Cart']);
    });

    it('puts an entry with no order last, so an unconsidered module cannot jump the menu', () => {
        const sorted = sortNavigation([
            { name: 'Unranked', label: 'unranked' },
            { name: 'Home', label: 'home', order: 10 }
        ]);

        expect(sorted.map(({ name }) => name)).toEqual(['Home', 'Unranked']);
    });

    it('does not mutate its argument', () => {
        const entries: AppNavigationEntry[] = [
            { name: 'Cart', label: 'cart', order: 80 },
            { name: 'Home', label: 'home', order: 10 }
        ];

        sortNavigation(entries);

        expect(entries.map(({ name }) => name)).toEqual(['Cart', 'Home']);
    });
});

describe('groupNavigation', () => {
    it('buckets entries by section, defaulting an unplaced one to main', () => {
        const groups = groupNavigation([
            { name: 'Profile', label: 'profile', order: 70, section: 'account' },
            { name: 'Home', label: 'home', order: 10 },
            { name: 'Admin', label: 'admin', order: 40, section: 'admin' }
        ]);

        expect(groups.main.map(({ name }) => name)).toEqual(['Home']);
        expect(groups.account.map(({ name }) => name)).toEqual(['Profile']);
        expect(groups.admin.map(({ name }) => name)).toEqual(['Admin']);
    });

    it('keeps every section present, so a consumer can index an empty one without a guard', () => {
        expect(groupNavigation([])).toEqual({ main: [], account: [], admin: [] });
    });

    it('ranks inside each section by order, not by registration order', () => {
        const groups = groupNavigation([
            { name: 'Cart', label: 'cart', order: 80, section: 'account' },
            { name: 'Profile', label: 'profile', order: 70, section: 'account' },
            { name: 'Unranked', label: 'unranked', section: 'account' }
        ]);

        expect(groups.account.map(({ name }) => name)).toEqual(['Profile', 'Cart', 'Unranked']);
    });

    it('does not mutate its argument', () => {
        const entries: AppNavigationEntry[] = [
            { name: 'Cart', label: 'cart', order: 80 },
            { name: 'Home', label: 'home', order: 10 }
        ];

        groupNavigation(entries);

        expect(entries.map(({ name }) => name)).toEqual(['Cart', 'Home']);
    });
});
