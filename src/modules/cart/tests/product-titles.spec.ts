/**
 * @module
 * The cart store's product-title join — the one the cart and wishlist pages need, because both contracts
 * answer lines as product ids only.
 *
 * Two properties matter: an id is never rendered as nothing (unknown → the id itself), and a
 * lookup that fails must not take the others down with it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { getProductById } from '@api';
import { useCartStore } from '@/modules/cart/store.ts';

vi.mock('@/infrastructure/stores/observability.ts', () => ({
    useObservabilityStore: () => ({ track: vi.fn() })
}));

vi.mock('@api', () => ({
    getProductById: vi.fn((id: string) =>
        id === 'broken'
            ? Promise.reject(new Error('404'))
            : Promise.resolve({ data: { id, title: `Title of ${id}` } })
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
});
