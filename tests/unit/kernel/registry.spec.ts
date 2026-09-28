import { describe, it, expect, vi } from 'vitest';
import type { RouteRecordRaw } from 'vue-router';
import {
    assertUniqueRoutes,
    collectLocaleSensitiveResets,
    collectModuleNavigation,
    collectModuleRoutes,
    groupNavigation,
    sortNavigation
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

/** A placeholder for `AppNavigationEntry.icon`, required and otherwise irrelevant here. */
const STUB_ICON = { template: '<svg />' };

const makeModule = (name: string): AppModule => ({
    name,
    routes: [makeRoute(name)]
});

const withNav = (name: string, navigation: AppNavigationEntry[]): AppModule => ({
    name,
    routes: [makeRoute(name)],
    navigation
});

describe('collectModuleRoutes', () => {
    it('concatenates the route records of every enabled module', () => {
        const routes = collectModuleRoutes([makeModule('products'), makeModule('cart')]);

        expect(routes.map((route) => route.name)).toEqual(['products', 'cart']);
    });

    it('refuses two modules declaring the same route name', () => {
        // Both `makeModule` calls below happen to reuse 'cart' as both name and path — the bug
        // is exactly that vue-router would keep only the later one, silently.
        expect(() =>
            collectModuleRoutes([makeModule('cart'), makeModule('wishlist'), makeModule('cart')])
        ).toThrow('Two routes declare the same name: "cart".');
    });
});

describe('assertUniqueRoutes', () => {
    it('passes routes through unremarked when every name and path is unique', () => {
        expect(() => assertUniqueRoutes([makeRoute('products'), makeRoute('cart')])).not.toThrow();
    });

    it('refuses two routes sharing a name even with different paths', () => {
        const clashing: RouteRecordRaw = { ...makeRoute('cart'), path: 'basket' };

        expect(() => assertUniqueRoutes([makeRoute('cart'), clashing])).toThrow(
            'Two routes declare the same name: "cart".'
        );
    });

    it('refuses two routes sharing a normalised path even with different names', () => {
        const clashing: RouteRecordRaw = { ...makeRoute('basket'), path: '/cart/' };

        expect(() => assertUniqueRoutes([makeRoute('cart'), clashing])).toThrow(
            'Two routes declare the same path: "cart".'
        );
    });

    it('checks a nested route against its ancestors and its siblings, by full path', () => {
        const parent: RouteRecordRaw = {
            path: 'account',
            name: 'Account',
            component: { template: '<div />' },
            children: [makeRoute('profile'), { ...makeRoute('billing'), path: 'profile' }]
        };

        expect(() => assertUniqueRoutes([parent])).toThrow(
            'Two routes declare the same path: "account/profile".'
        );
    });
});

describe('collectModuleNavigation', () => {
    it('concatenates the navigation entries of every enabled module', () => {
        const entries = collectModuleNavigation([
            withNav('products', [
                { name: 'ProductsList', label: 'products', order: 60, icon: STUB_ICON }
            ]),
            withNav('cart', [{ name: 'Cart', label: 'cart', order: 80, icon: STUB_ICON }])
        ]);

        expect(entries.map(({ name }) => name)).toEqual(['ProductsList', 'Cart']);
    });

    it('skips a module that contributes none, rather than yielding a hole', () => {
        const entries = collectModuleNavigation([
            makeModule('orders'),
            withNav('cart', [{ name: 'Cart', label: 'cart', icon: STUB_ICON }])
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
            { name: 'Cart', label: 'cart', order: 80, icon: STUB_ICON },
            { name: 'Home', label: 'home', order: 10, icon: STUB_ICON },
            { name: 'Admin', label: 'admin', order: 40, icon: STUB_ICON }
        ]);

        expect(sorted.map(({ name }) => name)).toEqual(['Home', 'Admin', 'Cart']);
    });

    it('puts an entry with no order last, so an unconsidered module cannot jump the menu', () => {
        const sorted = sortNavigation([
            { name: 'Unranked', label: 'unranked', icon: STUB_ICON },
            { name: 'Home', label: 'home', order: 10, icon: STUB_ICON }
        ]);

        expect(sorted.map(({ name }) => name)).toEqual(['Home', 'Unranked']);
    });

    it('does not mutate its argument', () => {
        const entries: AppNavigationEntry[] = [
            { name: 'Cart', label: 'cart', order: 80, icon: STUB_ICON },
            { name: 'Home', label: 'home', order: 10, icon: STUB_ICON }
        ];

        sortNavigation(entries);

        expect(entries.map(({ name }) => name)).toEqual(['Cart', 'Home']);
    });
});

describe('collectLocaleSensitiveResets', () => {
    it('collects the reset callback of every module that declares one', () => {
        const productsReset = vi.fn();
        const cartReset = vi.fn();

        const resets = collectLocaleSensitiveResets([
            { ...makeModule('products'), resetOnLocaleChange: productsReset },
            { ...makeModule('cart'), resetOnLocaleChange: cartReset },
            makeModule('wishlist')
        ]);

        expect(resets).toEqual([productsReset, cartReset]);
    });

    it('returns nothing for a build with no locale-sensitive module at all', () => {
        expect(collectLocaleSensitiveResets([makeModule('orders')])).toEqual([]);
    });
});

describe('groupNavigation', () => {
    it('buckets entries by section, defaulting an unplaced one to main', () => {
        const groups = groupNavigation([
            { name: 'Profile', label: 'profile', order: 70, section: 'account', icon: STUB_ICON },
            { name: 'Home', label: 'home', order: 10, icon: STUB_ICON },
            { name: 'Admin', label: 'admin', order: 40, section: 'admin', icon: STUB_ICON }
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
            { name: 'Cart', label: 'cart', order: 80, section: 'account', icon: STUB_ICON },
            { name: 'Profile', label: 'profile', order: 70, section: 'account', icon: STUB_ICON },
            { name: 'Unranked', label: 'unranked', section: 'account', icon: STUB_ICON }
        ]);

        expect(groups.account.map(({ name }) => name)).toEqual(['Profile', 'Cart', 'Unranked']);
    });

    it('does not mutate its argument', () => {
        const entries: AppNavigationEntry[] = [
            { name: 'Cart', label: 'cart', order: 80, icon: STUB_ICON },
            { name: 'Home', label: 'home', order: 10, icon: STUB_ICON }
        ];

        groupNavigation(entries);

        expect(entries.map(({ name }) => name)).toEqual(['Cart', 'Home']);
    });
});
