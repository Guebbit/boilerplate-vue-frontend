/**
 * @module
 * Pins the `meta.access` every users route declares, checked by name via a lookup helper against
 * the module's own route records rather than a resolved router — needs neither the locale prefix
 * nor the rest of the app.
 *
 * A route that quietly loses `meta.access` is indistinguishable from a public one, which is why
 * each expected value is written out rather than derived. Lives with the module as a fact about
 * THIS domain (see `docs/theory/modules.md`); the router spec proves enforcement is *attached*,
 * this proves the declarations are *there*.
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

describe('users route access', () => {
    it.each([
        ['UsersList', 'admin'],
        ['UserCreate', 'admin'],
        ['UserTarget', 'admin'],
        ['UserEdit', 'admin']
    ])('%s declares access: %s', (name, access) => {
        expect(byName(name)).toBeDefined();
        expect(byName(name)?.meta?.access).toBe(access);
    });

    it('declares no route this file does not know about', () => {
        // Catches a new route added without an access decision being made for it.
        expect(routes.map(({ name }) => name).toSorted()).toEqual(
            ['UsersList', 'UserCreate', 'UserTarget', 'UserEdit'].toSorted()
        );
    });
});
