/**
 * @module
 * The wishlist store — id-set state, whole-list replacement, and the one cross-module effect:
 * move-to-cart refreshes the cart it just wrote into.
 *
 * Transport-mocked like the account store's flows spec: `orvalMutator` is a router keyed on
 * `METHOD /url`, everything above it — the generated client, the cart store, this store — is
 * real, because the property under test is coordination.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useWishlistStore } from '@/modules/wishlist/store.ts';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(parseOrvalFixture(config.method, config.url, responses[key]));
    })
}));

const requestedUrls = () =>
    vi.mocked(orvalMutator).mock.calls.map((call) => (call[0] as { url: string }).url);

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'GET /wishlist': orvalEnvelope({ items: [{ productId: 'p1' }, { productId: 'p2' }] }),
        'POST /wishlist': orvalEnvelope({ items: [{ productId: 'p1' }, { productId: 'p2' }] }),
        'DELETE /wishlist/p1': orvalEnvelope({ items: [{ productId: 'p2' }] }),
        'POST /wishlist/p1/move-to-cart': orvalEnvelope({ items: [{ productId: 'p2' }] }),
        'GET /cart': orvalEnvelope({
            items: [],
            summary: { itemsCount: 0, totalQuantity: 0, total: 0 }
        })
    };
});

describe('fetchWishlist', () => {
    it('replaces the list and the id set answers the hearts', () =>
        useWishlistStore()
            .fetchWishlist()
            .then(() => {
                const store = useWishlistStore();
                expect(store.items.map(({ productId }) => productId)).toEqual(['p1', 'p2']);
                expect(store.isSaved('p1')).toBe(true);
                expect(store.isSaved('p9')).toBe(false);
            }));
});

describe('addToWishlist', () => {
    it('renders the list the API answered and the heart reads saved', () => {
        const store = useWishlistStore();
        return store.addToWishlist('p1').then(() => {
            expect(store.items.map(({ productId }) => productId)).toEqual(['p1', 'p2']);
            // The payload is the whole list, so saving one product also learns about the other:
            // a store appending locally would hold one line here and be wrong the moment two
            // tabs save different products.
            expect(store.isSaved('p2')).toBe(true);
            expect(requestedUrls()).toEqual(['/wishlist']);
        });
    });
});

describe('removeFromWishlist', () => {
    it('renders the list the API answered, not a local guess', () => {
        const store = useWishlistStore();
        return store
            .fetchWishlist()
            .then(() => store.removeFromWishlist('p1'))
            .then(() => {
                expect(store.items.map(({ productId }) => productId)).toEqual(['p2']);
            });
    });
});

describe('moveToCart', () => {
    it('drops the saved line and refetches the cart it wrote into', () => {
        const store = useWishlistStore();
        return store
            .fetchWishlist()
            .then(() => store.moveToCart('p1'))
            .then(() => {
                expect(store.isSaved('p1')).toBe(false);
                // The cross-module effect: the cart is re-read so the header's badge cannot
                // lag a write this store initiated.
                expect(requestedUrls().at(-1)).toBe('/cart');
            });
    });
});
