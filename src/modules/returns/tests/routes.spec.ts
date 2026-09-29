/**
 * @module
 * Pins the `meta.access` every returns route declares, against a hard-coded table: a route that
 * quietly loses its `meta.access` keeps rendering and is simply open. Both need a session and
 * nothing more — a customer reads their own returns, and which moves staff may make is
 * `Return.actions`, never a route rule.
 */
import { describe, expect, it } from 'vitest';
import routes from '../routes';

describe('returns route access', () => {
    it.each([['ReturnsList'], ['ReturnTarget']])('%s requires a session', (name) => {
        const route = routes.find((record) => record.name === name);
        expect(route).toBeDefined();
        expect(route?.meta?.access).toBe('auth');
        expect(route?.meta).not.toHaveProperty('can');
    });

    it('declares no route this file does not know about', () => {
        expect(routes.map(({ name }) => name).toSorted()).toEqual(
            ['ReturnTarget', 'ReturnsList'].toSorted()
        );
    });
});
