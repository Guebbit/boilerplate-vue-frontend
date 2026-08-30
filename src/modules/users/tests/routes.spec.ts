/**
 * @module
 * Vitest spec asserting each users route record's declared `meta.access`
 * against a hard-coded table, checked by name via a lookup helper.
 */

/**
 * The access requirement every users route declares.
 *
 * A route that quietly loses its `meta.access` is indistinguishable from a public one: it keeps
 * rendering, keeps passing every other test, and is simply open to anyone. Nothing else in the
 * suite would say so, which is why each expected value is written out rather than derived from the
 * records under test.
 *
 * Lives with the module because these are facts about THIS domain — held in one table in a
 * platform spec, deleting a domain would break that spec, see `docs/theory/modules.md`. The
 * router spec proves enforcement is *attached*; this proves the declarations are *there*.
 *
 * Asserted against the module's own route records rather than a resolved router, so it needs
 * neither the locale prefix nor the rest of the app.
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
