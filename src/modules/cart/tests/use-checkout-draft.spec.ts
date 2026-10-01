/**
 * @module
 * `use-checkout-draft.ts` — what a reload must give back at checkout. The assertions are the
 * failures a customer would feel: a note that vanishes, a picked address that reverts, and a draft
 * that one user leaves behind for the next on the same tab.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearCheckoutDrafts,
    readCheckoutDraft,
    writeCheckoutDraft
} from '@/modules/cart/composables/use-checkout-draft';

beforeEach(() => {
    sessionStorage.clear();
});

describe('the checkout draft', () => {
    it('gives back the note, the payment choice and the picked address', () => {
        writeCheckoutDraft('u1', {
            notes: 'Leave it with the neighbour',
            paymentMethodId: 'bank_transfer',
            addressId: 'addr-2'
        });

        expect(readCheckoutDraft('u1')).toEqual({
            notes: 'Leave it with the neighbour',
            paymentMethodId: 'bank_transfer',
            addressId: 'addr-2'
        });
    });

    it('is empty for a first visit, and omits what was never chosen', () => {
        expect(readCheckoutDraft('u1')).toEqual({ notes: '' });

        writeCheckoutDraft('u1', { notes: 'hi' });
        expect(readCheckoutDraft('u1')).toEqual({ notes: 'hi' });
    });

    it("never hands one user's draft to another", () => {
        writeCheckoutDraft('u1', { notes: 'mine', addressId: 'addr-1' });

        expect(readCheckoutDraft('u2')).toEqual({ notes: '' });
    });

    it('drops every draft at once, for checkout and for logout', () => {
        writeCheckoutDraft('u1', { notes: 'a' });
        writeCheckoutDraft('u2', { notes: 'b' });
        sessionStorage.setItem('something-else', 'kept');

        clearCheckoutDrafts();

        expect(readCheckoutDraft('u1')).toEqual({ notes: '' });
        expect(readCheckoutDraft('u2')).toEqual({ notes: '' });
        expect(sessionStorage.getItem('something-else')).toBe('kept');
    });

    it('reads a damaged value as no draft rather than failing the page', () => {
        sessionStorage.setItem('checkout-draft:u1', '{not json');
        expect(readCheckoutDraft('u1')).toEqual({ notes: '' });

        sessionStorage.setItem('checkout-draft:u1', JSON.stringify({ notes: 5, addressId: 7 }));
        expect(readCheckoutDraft('u1')).toEqual({ notes: '' });
    });
});
