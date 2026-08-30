/**
 * @module
 * Table-driven assertion of `meta.access` on the module's own route records, plus a closed-list
 * check so a new route can't slip in without an access decision — needs neither the locale prefix
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
 * Finds one of this module's own route records by name.
 */
const byName = (name: string): RouteRecordRaw | undefined =>
    routes.find((route) => route.name === name);

describe('realtime route access', () => {
    it.each([['RealtimePlayground', 'admin']])('%s declares access: %s', (name, access) => {
        expect(byName(name)).toBeDefined();
        expect(byName(name)?.meta?.access).toBe(access);
    });

    it('declares no route this file does not know about', () => {
        // Catches a new route added without an access decision being made for it.
        expect(routes.map(({ name }) => name).toSorted()).toEqual(
            ['RealtimePlayground'].toSorted()
        );
    });
});
