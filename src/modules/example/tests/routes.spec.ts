/**
 * @module
 * Pins what every example route declares, checked by name against the module's own route records
 * rather than a resolved router. A route that quietly loses `meta.access` is indistinguishable
 * from a public one, so each expected value is written out, not derived. The one public route is
 * the other half of the point: reading a published example needs no account.
 */
import { describe, expect, it } from 'vitest';
import type { RouteRecordRaw } from 'vue-router';
import routes from '../routes';
import { exampleEditGuard } from '../guards';

/**
 * Looks up a route record by its name.
 *
 * @param name - The route's `name`.
 * @returns The matching record, or `undefined` if none declares that name.
 */
const byName = (name: string): RouteRecordRaw | undefined =>
    routes.find((route) => route.name === name);

describe('example route access', () => {
    it.each([
        ['ExamplesList', 'read'],
        ['ExampleCreate', 'create'],
        ['ExampleTarget', 'read'],
        ['ExampleEdit', 'update']
    ])('%s needs a session and the %s permission on Example', (name, action) => {
        expect(byName(name)?.meta?.access).toBe('auth');
        expect(byName(name)?.meta?.can).toEqual([action, 'Example']);
    });

    it('serves the published example publicly', () => {
        const route = byName('ExamplePublished');

        expect(route).toBeDefined();
        // `not.toHaveProperty` rather than reading `.access`: the route table `satisfies`
        // `RouteRecordRaw[]`, so a key it does not declare is not readable. Absence is the assertion.
        expect(route?.meta).not.toHaveProperty('access');
        expect(route?.meta).not.toHaveProperty('can');
    });

    it('runs the teaching guard on the edit route only', () => {
        expect(byName('ExampleEdit')?.beforeEnter).toEqual([exampleEditGuard]);
        expect(
            routes.filter((route) => route.beforeEnter !== undefined).map(({ name }) => name)
        ).toEqual(['ExampleEdit']);
    });

    it('declares create before :id, so the word is never read as an id', () => {
        const paths = routes.map(({ path }) => path);

        expect(paths.indexOf('examples/create')).toBeLessThan(paths.indexOf('examples/:id'));
    });

    it('declares no route this file does not know about', () => {
        expect(routes.map(({ name }) => name).toSorted()).toEqual(
            [
                'ExamplesList',
                'ExampleCreate',
                'ExamplePublished',
                'ExampleTarget',
                'ExampleEdit'
            ].toSorted()
        );
    });
});
