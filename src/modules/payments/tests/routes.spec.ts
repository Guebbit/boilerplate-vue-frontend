/**
 * @module
 * Pins the access every payments route declares. The staff page needs the staff action on
 * payments: `read:Payment` answers `can` for a customer, so it would admit one — `display` is what
 * the spec holds in place.
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
    it('opens the staff page only on the staff action on payments', () => {
        expect(byName('PaymentsList')?.meta).toMatchObject({
            access: 'auth',
            can: ['display', 'Payment']
        });
    });

    it('declares no route this file does not know about', () => {
        expect(routes.map(({ name }) => name)).toEqual(['PaymentsList']);
    });
});
