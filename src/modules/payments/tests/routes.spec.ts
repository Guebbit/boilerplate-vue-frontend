/**
 * @module
 * Pins the access every payments route declares. The staff page needs the permission on OTHER
 * people's payments: `payments.self.read` answers `can` for a customer, so `can` alone would admit
 * one — `others` is what the spec holds in place.
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

describe('payments route access', () => {
    it('opens the staff page only to a reader of other people’s payments', () => {
        expect(byName('PaymentsList')?.meta).toMatchObject({
            access: 'auth',
            can: ['read', 'Payment'],
            others: true
        });
    });

    it('declares no route this file does not know about', () => {
        expect(routes.map(({ name }) => name)).toEqual(['PaymentsList']);
    });
});
