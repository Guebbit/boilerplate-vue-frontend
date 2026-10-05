/**
 * @module
 * `POST /cart/checkout`'s `Idempotency-Key`: the server binds a key to the request body and answers
 * 422 `IDEMPOTENCY_KEY_MISMATCH` when a key comes back with another one, 409 `IDEMPOTENCY_IN_FLIGHT`
 * while the first attempt is still running, and replays a recorded outcome (a 5xx too) for as long
 * as it keeps the key. The store's rule: the key follows a fingerprint of the order (body, cart
 * lines, shipping choice) and the person, survives a reload, and ends with a verdict.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { IN_FLIGHT_RETRY_DELAYS_MS } from '@/modules/cart/store';
import { checkout as apiCheckout, getCart } from '@api';
import {
    aCart,
    apiRejection,
    lostAnswer,
    answered
} from '../../../../tests/support/unit/cart-fixtures.ts';
import { anOrder } from '../../../../tests/support/unit/fixtures.ts';
import { signInAs } from '../../../../tests/support/unit/cart-interleave.ts';
import { trackStores } from '../../../../tests/support/unit/track-stores.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

vi.mock('@api', () => ({
    getCart: vi.fn(),
    getCartSummary: vi.fn(),
    addCartItem: vi.fn(),
    updateCartItemById: vi.fn(),
    removeCartItem: vi.fn(),
    clearCart: vi.fn(),
    mergeCart: vi.fn(),
    setCartShippingMethod: vi.fn(),
    checkout: vi.fn(),
    reorder: vi.fn()
}));

/**
 * A fresh store, tracked so `afterEach` can dispose it.
 */
const { fresh: freshStore, disposeAll } = trackStores();

beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setActivePinia(createPinia());
    vi.resetAllMocks();
});

afterEach(() => {
    vi.useRealTimers();
    disposeAll();
});

/**
 * Every `[key, body]` pair `POST /cart/checkout` was sent, so a case can ask whether a key ever
 * travelled with two bodies, which the server answers with a 422 for as long as it keeps it.
 *
 * @returns The pairs, in the order they were sent.
 */
const sentPairs = () =>
    vi.mocked(apiCheckout).mock.calls.map(([body, config]) => ({
        key: (config?.headers as Record<string, unknown> | undefined)?.['Idempotency-Key'],
        body: JSON.stringify(body)
    }));

describe('one Idempotency-Key, one body', () => {
    it('is not reused for another body after an attempt whose answer was lost', async () => {
        const store = freshStore();
        vi.mocked(apiCheckout).mockRejectedValueOnce(lostAnswer());
        vi.mocked(apiCheckout).mockRejectedValueOnce(lostAnswer());

        // The server may have placed the order; the shopper then changes the note and tries again.
        await store.checkout({ notes: 'leave it at the door' }).catch(() => undefined);
        await store.checkout({ notes: 'ring twice' }).catch(() => undefined);

        const pairs = sentPairs();
        const bodiesOfFirstKey = pairs
            .filter(({ key }) => key === pairs[0]?.key)
            .map(({ body }) => body);
        expect(new Set(bodiesOfFirstKey).size).toBe(1);
    });

    it('is kept for the same order after a lost answer, so the retry replays it', async () => {
        const store = freshStore();
        vi.mocked(apiCheckout).mockRejectedValueOnce(lostAnswer());
        vi.mocked(apiCheckout).mockResolvedValueOnce(answered(anOrder()));

        await store.checkout({ notes: 'same' }).catch(() => undefined);
        await store.checkout({ notes: 'same' });

        const [first, second] = sentPairs();
        expect(second?.key).toBe(first?.key);
    });

    it('is kept across a reload: a new store reads it from the tab', async () => {
        vi.mocked(apiCheckout).mockRejectedValueOnce(lostAnswer());
        await freshStore()
            .checkout({ notes: 'same' })
            .catch(() => undefined);

        // A reload: the tab's storage stays, the page's memory does not.
        setActivePinia(createPinia());
        vi.mocked(apiCheckout).mockResolvedValueOnce(answered(anOrder()));
        await freshStore().checkout({ notes: 'same' });

        const [first, second] = sentPairs();
        expect(second?.key).toBe(first?.key);
    });

    it('is never inherited by the next person on the tab', async () => {
        await signInAs('a');
        vi.mocked(apiCheckout).mockRejectedValueOnce(lostAnswer());
        await freshStore()
            .checkout({ notes: 'same' })
            .catch(() => undefined);

        await signInAs('b');
        vi.mocked(apiCheckout).mockResolvedValueOnce(answered(anOrder()));
        await freshStore().checkout({ notes: 'same' });

        const [first, second] = sentPairs();
        expect(second?.key).not.toBe(first?.key);
    });

    it('ends with a refusal the server will repeat: the next attempt gets a new key', async () => {
        const store = freshStore();
        vi.mocked(apiCheckout).mockRejectedValueOnce(apiRejection(409, 'CART_INSUFFICIENT_STOCK'));
        vi.mocked(apiCheckout).mockResolvedValueOnce(answered(anOrder()));

        await store.checkout({ notes: 'same' }).catch(() => undefined);
        await store.checkout({ notes: 'same' });

        const [first, second] = sentPairs();
        expect(second?.key).not.toBe(first?.key);
    });

    it('is kept through a 503, which says the server did not act', async () => {
        const store = freshStore();
        vi.mocked(apiCheckout).mockRejectedValueOnce(apiRejection(503, 'UNAVAILABLE'));
        vi.mocked(apiCheckout).mockResolvedValueOnce(answered(anOrder()));

        await store.checkout({ notes: 'same' }).catch(() => undefined);
        await store.checkout({ notes: 'same' });

        const [first, second] = sentPairs();
        expect(second?.key).toBe(first?.key);
    });

    it('ends after a bare 500 when the cart is still full: no order was written, and a recorded 500 would be replayed', async () => {
        const store = freshStore();
        vi.mocked(getCart).mockResolvedValue(answered(aCart([['p1', 2]])));
        await store.fetchCart();
        vi.mocked(apiCheckout).mockRejectedValueOnce(apiRejection(500, 'INTERNAL'));
        vi.mocked(apiCheckout).mockResolvedValueOnce(answered(anOrder()));

        await store.checkout({ notes: 'same' }).catch(() => undefined);
        await store.checkout({ notes: 'same' });

        const [first, second] = sentPairs();
        expect(second?.key).not.toBe(first?.key);
    });

    it('keeps the key after a bare 500 when the re-read fails too: nothing is known, so the retry replays', async () => {
        const store = freshStore();
        vi.mocked(getCart).mockRejectedValue(lostAnswer());
        vi.mocked(apiCheckout).mockRejectedValueOnce(apiRejection(500, 'INTERNAL'));
        vi.mocked(apiCheckout).mockResolvedValueOnce(answered(anOrder()));

        const refused = await store.checkout({ notes: 'same' }).catch((error: unknown) => error);
        await store.checkout({ notes: 'same' });

        expect(refused).toMatchObject({ status: 500 });
        const [first, second] = sentPairs();
        expect(second?.key).toBe(first?.key);
    });

    it('re-reads the cart after a bare 500, and leaves it empty when the order was written', async () => {
        const store = freshStore();
        vi.mocked(getCart).mockResolvedValue(answered(aCart([])));
        vi.mocked(apiCheckout).mockRejectedValueOnce(apiRejection(500, 'INTERNAL'));

        await store.checkout({ notes: 'same' }).catch(() => undefined);

        expect(getCart).toHaveBeenCalledTimes(1);
        expect(store.cartItems).toEqual([]);
    });
});

describe('an attempt the server says is still running', () => {
    it('is asked again under the same key after each wait, and ends with the replayed order', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout'] });
        const store = freshStore();
        vi.mocked(apiCheckout)
            .mockRejectedValueOnce(apiRejection(409, 'IDEMPOTENCY_IN_FLIGHT'))
            .mockRejectedValueOnce(apiRejection(409, 'IDEMPOTENCY_IN_FLIGHT'))
            .mockResolvedValueOnce(answered(anOrder({ id: 'o1' })));

        const placing = store.checkout({ notes: 'same' });
        await vi.advanceTimersByTimeAsync(IN_FLIGHT_RETRY_DELAYS_MS[0] ?? 0);
        await vi.advanceTimersByTimeAsync(IN_FLIGHT_RETRY_DELAYS_MS[1] ?? 0);
        const order = await placing;

        expect(order?.id).toBe('o1');
        const keys = sentPairs().map(({ key }) => key);
        expect(keys).toHaveLength(3);
        expect(new Set(keys).size).toBe(1);
    });

    it('gives up after the last wait, keeping the key so the next press is still the same call', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout'] });
        const store = freshStore();
        vi.mocked(apiCheckout).mockRejectedValue(apiRejection(409, 'IDEMPOTENCY_IN_FLIGHT'));

        const placing = store.checkout({ notes: 'same' }).catch((error: unknown) => error);
        await vi.advanceTimersByTimeAsync(
            IN_FLIGHT_RETRY_DELAYS_MS.reduce((sum, ms) => sum + ms, 0)
        );
        await placing;
        vi.mocked(apiCheckout).mockResolvedValueOnce(answered(anOrder()));
        await store.checkout({ notes: 'same' });

        const keys = sentPairs().map(({ key }) => key);
        expect(keys).toHaveLength(IN_FLIGHT_RETRY_DELAYS_MS.length + 2);
        expect(new Set(keys).size).toBe(1);
    });
});
