/**
 * The access requirement every wishlist route declares — same reasoning as the account module's
 * twin: a route that quietly loses its `meta.access` keeps rendering and is simply open.
 */
import { describe, expect, it } from 'vitest';
import routes from '../routes';

describe('wishlist route access', () => {
    it('Wishlist declares access: auth', () => {
        const route = routes.find(({ name }) => name === 'Wishlist');
        expect(route).toBeDefined();
        expect(route?.meta?.access).toBe('auth');
    });

    it('declares no route this file does not know about', () => {
        expect(routes.map(({ name }) => name)).toEqual(['Wishlist']);
    });
});
