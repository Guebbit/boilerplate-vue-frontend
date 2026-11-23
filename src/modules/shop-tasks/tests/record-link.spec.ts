/**
 * @module
 * The shop's records on a task page: the `recordRoutes` this module declares name the staff page of
 * an order and of a return, and the build's router resolves each to that record's own address.
 */
import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { collectModuleRoutes } from '@/kernel/registry';
import { linkIfRouted } from '@/kernel/route-link.ts';
import { recordRouteOf } from '@/kernel/record-routes.ts';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/**
 * The real app router, as the task page's link reads it.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

describe('a task linked to a shop record', () => {
    it.each([
        ['order', 'o9', '/en/orders/o9'],
        ['return', 'r9', '/en/returns/r9']
    ])('opens the %s page of the record', (type, id, href) => {
        const routeName = recordRouteOf(type);
        const target = routeName ? linkIfRouted(router, routeName, { id }) : undefined;

        expect(target).toBeDefined();
        expect(
            router.resolve({ ...target, params: { locale: 'en', ...target?.params } }).href
        ).toBe(href);
    });
});
