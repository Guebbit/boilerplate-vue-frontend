/**
 * @module
 * The cart store's product-title join — the one the cart and wishlist pages need, because both contracts
 * answer lines as product ids only. `moneyOf` (FA32b) piggybacks on the same lookup, for the same
 * reason `productShipping` already does: `resolveTitles` already pulls the whole `Product` down.
 *
 * Two properties matter: an id is never rendered as nothing (unknown → the id itself), and a
 * lookup that fails must not take the others down with it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { getProductById } from '@api';
import * as schemas from '@api/schemas';
import { useCartStore } from '@/modules/cart/store.ts';
import { contractResponse } from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

vi.mock('@api', () => ({
    getProductById: vi.fn((id: string) =>
        id === 'broken'
            ? Promise.reject(new Error('404'))
            : Promise.resolve(
                  contractResponse(schemas.GetProductByIdResponse, {
                      id,
                      title: `Title of ${id}`,
                      price: 1,
                      currency: 'EUR'
                  })
              )
    )
}));

describe('useCartStore — product titles', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.mocked(getProductById).mockClear();
    });

    it('answers the id itself while a title is unknown', () => {
        expect(useCartStore().titleOf('p1')).toBe('p1');
    });

    it('resolves titles once per distinct id, and survives a failed lookup', () => {
        const store = useCartStore();
        return store.resolveTitles(['p1', 'broken', 'p1']).then(() => {
            expect(getProductById).toHaveBeenCalledTimes(2);
            expect(store.titleOf('p1')).toBe('Title of p1');
            expect(store.titleOf('broken')).toBe('broken');
        });
    });

    it('does not refetch a title it already holds', () => {
        const store = useCartStore();
        return store
            .resolveTitles(['p1'])
            .then(() => store.resolveTitles(['p1', 'p2']))
            .then(() => expect(getProductById).toHaveBeenCalledTimes(2));
    });

    describe('moneyOf (FA32b)', () => {
        it('answers undefined while a line has not resolved yet', () => {
            expect(useCartStore().moneyOf('p1')).toBeUndefined();
        });

        it('resolves the unit price and currency off the same lookup titleOf uses', () => {
            const store = useCartStore();
            return store.resolveTitles(['p1']).then(() => {
                expect(store.moneyOf('p1')).toEqual({ price: 1, currency: 'EUR' });
            });
        });

        it('stays undefined for a lookup that failed, same as the title', () => {
            const store = useCartStore();
            return store.resolveTitles(['broken']).then(() => {
                expect(store.moneyOf('broken')).toBeUndefined();
            });
        });
    });
});
