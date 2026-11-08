/**
 * @module
 * `POST /cart/items` and `POST /cart/reorder` take an optional `Idempotency-Key`. A lost answer
 * resends the SAME key (the retry replays, the line grows once); any answer mints a fresh one, so
 * a second click is a new intent and adds again.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { addCartItem, reorder } from '@api';
import { aCart } from './cart-fixtures.ts';
import { answered, lostAnswer } from '../../../../tests/support/unit/async-answers.ts';
import { signInAs } from './cart-interleave.ts';
import { trackStores } from './track-stores.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

vi.mock('@api', () => ({
    getCart: vi.fn(),
    getCartSummary: vi.fn(),
    addCartItem: vi.fn(),
    updateCartItemByProductId: vi.fn(),
    deleteCartItemByProductId: vi.fn(),
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
    setActivePinia(createPinia());
    vi.resetAllMocks();
});

afterEach(() => {
    disposeAll();
});

/**
 * The `Idempotency-Key` each call of a mocked client function carried, in order.
 *
 * @param calls - The mock's recorded calls: `[body, options]` pairs
 * @returns The keys
 */
const keysSent = (calls: readonly (readonly [unknown, { headers?: unknown }?])[]) =>
    calls.map(([, options]) => (options?.headers as Record<string, unknown>)['Idempotency-Key']);

describe('addCartItem', () => {
    it('resends the same key after a lost answer, and a fresh one after an answer', async () => {
        const store = freshStore();
        await signInAs('u1');
        vi.mocked(addCartItem)
            .mockRejectedValueOnce(lostAnswer())
            .mockResolvedValue(answered(aCart([['p1', 1]])));

        await store.addCartItem('p1', 1).catch(() => undefined);
        await store.addCartItem('p1', 1);
        await store.addCartItem('p1', 1);

        const [first, retry, secondClick] = keysSent(vi.mocked(addCartItem).mock.calls);
        expect(retry).toBe(first);
        expect(secondClick).not.toBe(first);
    });

    it('keeps another product on its own key', async () => {
        const store = freshStore();
        await signInAs('u1');
        vi.mocked(addCartItem)
            .mockRejectedValueOnce(lostAnswer())
            .mockResolvedValue(answered(aCart([['p2', 1]])));

        await store.addCartItem('p1', 1).catch(() => undefined);
        await store.addCartItem('p2', 1);

        const [forP1, forP2] = keysSent(vi.mocked(addCartItem).mock.calls);
        expect(forP2).not.toBe(forP1);
    });
});

describe('reorder', () => {
    it('resends the same key after a lost answer, and a fresh one after an answer', async () => {
        const store = freshStore();
        await signInAs('u1');
        vi.mocked(reorder)
            .mockRejectedValueOnce(lostAnswer())
            .mockResolvedValue(answered({ cart: aCart([['p1', 1]]), lines: [] }));

        await store.reorder('o1').catch(() => undefined);
        await store.reorder('o1');
        await store.reorder('o1');

        const [first, retry, secondClick] = keysSent(vi.mocked(reorder).mock.calls);
        expect(retry).toBe(first);
        expect(secondClick).not.toBe(first);
    });
});
