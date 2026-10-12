/**
 * @module
 * Vitest spec for the permanent-delete rule: only a cancelled, never-paid order qualifies.
 */
import { describe, expect, it } from 'vitest';
import { canHardDelete } from '../domain';

describe('canHardDelete', () => {
    it('accepts a cancelled order that was never paid', () => {
        expect(canHardDelete({ status: 'cancelled', paymentStatus: 'unpaid' })).toBe(true);
    });

    it('refuses an order that is still open', () => {
        expect(canHardDelete({ status: 'pending', paymentStatus: 'unpaid' })).toBe(false);
    });

    it.each(['paid', 'partially_refunded', 'refunded'])(
        'refuses a cancelled order whose payment state is %s',
        (paymentStatus) => {
            expect(canHardDelete({ status: 'cancelled', paymentStatus })).toBe(false);
        }
    );
});
