/**
 * @module
 * Pins the `meta.access`/`meta.can` every api-keys route declares, checked by name via a lookup
 * helper against the module's own route records rather than a resolved router — needs neither
 * the locale prefix nor the rest of the app.
 *
 * A route that quietly loses `meta.access` is indistinguishable from a public one, which is why
 * each expected value is written out rather than derived. Lives with the module as a fact about
 * THIS domain (see `docs/theory/modules.md`).
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

describe('api-keys route access', () => {
    it.each([
        ['ApiKeysList', 'auth', 'read', 'ApiKey'],
        ['ApiKeyCreate', 'auth', 'create', 'ApiKey']
    ])('%s declares access %s, permission %s %s', (name, access, action, subject) => {
        expect(byName(name)).toBeDefined();
        expect(byName(name)?.meta?.access).toBe(access);
        expect(byName(name)?.meta?.can).toEqual([action, subject]);
    });

    it('declares no route this file does not know about', () => {
        // Catches a new route added without an access decision being made for it.
        expect(routes.map(({ name }) => name).toSorted()).toEqual(
            ['ApiKeysList', 'ApiKeyCreate'].toSorted()
        );
    });
});
