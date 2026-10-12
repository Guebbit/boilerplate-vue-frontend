/**
 * @module
 * Pins the `meta.access` and `meta.can` every stats route declares, read off the module's own route
 * records. A route that quietly loses its permission is indistinguishable from a public one, so
 * each expected value is written out rather than derived.
 */
import { describe, expect, it } from 'vitest';
import type { RouteRecordRaw } from 'vue-router';
import routes from '../routes';

/**
 * Looks up a route record by its name.
 *
 * @param name - The route's `name`.
 * @returns The matching record, or `undefined` if none declares that name.
 */
const byName = (name: string): RouteRecordRaw | undefined =>
    routes.find((route) => route.name === name);

describe('stats route access', () => {
    it.each([
        ['StatsDashboard', 'auth', 'read', 'Stats'],
        ['StatsProductSales', 'auth', 'read', 'Stats']
    ])('%s declares access %s, permission %s %s', (name, access, action, subject) => {
        expect(byName(name)).toBeDefined();
        expect(byName(name)?.meta?.access).toBe(access);
        expect(byName(name)?.meta?.can).toEqual([action, subject]);
    });

    it('declares no route this file does not know about', () => {
        expect(routes.map(({ name }) => name).toSorted()).toEqual(
            ['StatsDashboard', 'StatsProductSales'].toSorted()
        );
    });

    it('hands the product id to the view as a prop', () => {
        expect(byName('StatsProductSales')?.props).toBe(true);
    });
});
