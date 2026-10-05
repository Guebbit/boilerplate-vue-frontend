/**
 * @module
 * The store's background read, `pollCart`: it refreshes the cart (and so each line's
 * `insufficientStock` flag) without ever making a stale answer win. It yields while a call that
 * replaces the cart is on the wire, drops an answer a fresher call overtook or one meant for the
 * previous person, and never toggles `loading` or touches the merge report.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { getCart, updateCartItemById, removeCartItem } from '@api';
import {
    aCart,
    gate,
    answered,
    type Answer
} from '../../../../tests/support/unit/cart-fixtures.ts';
import { ACTIONS, issue, signInAs } from '../../../../tests/support/unit/cart-interleave.ts';
import { trackStores } from '../../../../tests/support/unit/track-stores.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { CartResponse } from '@types';

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

/**
 * Makes the next `GET /cart` answer `cart`.
 *
 * @param cart - What the server answers.
 */
const serverHolds = (cart: CartResponse) => {
    vi.mocked(getCart).mockResolvedValue(answered(cart));
};

beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.resetAllMocks();
});

afterEach(() => {
    disposeAll();
});

describe('what a poll does', () => {
    it('replaces the cart with the answer, so a line turning short shows up', async () => {
        const store = freshStore();
        store.cart = aCart([['p1', 2]]);
        serverHolds(aCart([['p1', 2]], null, ['p1']));

        await store.pollCart();

        expect(store.cartItems).toEqual([
            { productId: 'p1', quantity: 2, insufficientStock: true }
        ]);
    });

    it('does not toggle `loading`: a background read must not disable the page’s buttons', async () => {
        const store = freshStore();
        const answer = gate<Answer<typeof getCart>>();
        vi.mocked(getCart).mockReturnValue(answer.promise);

        const polling = store.pollCart();

        expect(store.loading).toBe(false);
        answer.resolve(answered(aCart([['p1', 1]])));
        await polling;
        expect(store.loading).toBe(false);
    });

    it('leaves the merge report alone', async () => {
        const store = freshStore();
        store.mergeReport = [
            { productId: 'p1', requested: 2, resulting: 2, insufficientStock: true }
        ];
        serverHolds(aCart([['p1', 2]], null, ['p1']));

        await store.pollCart();

        expect(store.mergeReport).toHaveLength(1);
    });

    it('rejects when the server fails, leaving the cart as it was', async () => {
        const store = freshStore();
        store.cart = aCart([['p1', 2]]);
        vi.mocked(getCart).mockRejectedValue(new Error('Network Error'));

        await expect(store.pollCart()).rejects.toThrow('Network Error');

        expect(store.cart).toEqual(aCart([['p1', 2]]));
    });

    it('may poll again after a failure', async () => {
        const store = freshStore();
        vi.mocked(getCart).mockRejectedValueOnce(new Error('Network Error'));
        await store.pollCart().catch(() => undefined);
        serverHolds(aCart([['p1', 3]]));

        await store.pollCart();

        expect(store.cartItems[0]?.quantity).toBe(3);
    });
});

describe('a poll yields to anything fresher', () => {
    it('does not ask while a write is on the wire', async () => {
        const store = freshStore();
        const write = await issue(store, ACTIONS.update);

        await store.pollCart();

        expect(getCart).not.toHaveBeenCalled();
        write.answer(aCart([['p1', 5]]));
        await write.settled;
    });

    it('asks again once that write has answered', async () => {
        const store = freshStore();
        const write = await issue(store, ACTIONS.update);
        write.answer(aCart([['p1', 5]]));
        await write.settled;
        serverHolds(aCart([['p1', 5]], null, ['p1']));

        await store.pollCart();

        expect(getCart).toHaveBeenCalledTimes(1);
        expect(store.cartItems[0]?.insufficientStock).toBe(true);
    });

    it('does not ask while another poll is out', async () => {
        const store = freshStore();
        const answer = gate<Answer<typeof getCart>>();
        vi.mocked(getCart).mockReturnValue(answer.promise);

        const first = store.pollCart();
        const second = store.pollCart();

        await expect(second).resolves.toBeUndefined();
        expect(getCart).toHaveBeenCalledTimes(1);
        answer.resolve(answered(aCart([['p1', 1]])));
        await first;
    });

    it('drops its answer when it arrives after the answer of a write that started after it left', async () => {
        const store = freshStore();
        const pollAnswer = gate<Answer<typeof getCart>>();
        vi.mocked(getCart).mockReturnValue(pollAnswer.promise);
        const polling = store.pollCart();
        const write = await issue(store, ACTIONS.update);
        const written = aCart([['p1', 5]]);

        // The write lands first; the older read arrives after it and must not undo it.
        write.answer(written);
        await write.settled;
        pollAnswer.resolve(answered(aCart([['p1', 2]])));
        await polling;

        expect(store.cart).toEqual(written);
    });

    it('drops its answer when a write started and finished while it was out', async () => {
        const store = freshStore();
        const pollAnswer = gate<Answer<typeof getCart>>();
        vi.mocked(getCart).mockReturnValue(pollAnswer.promise);
        const polling = store.pollCart();
        const written = aCart([['p1', 5]]);
        vi.mocked(updateCartItemById).mockResolvedValue(answered(written));
        await store.updateCartItem('p1', 5);

        pollAnswer.resolve(answered(aCart([['p1', 2]])));
        await polling;

        expect(store.cart).toEqual(written);
    });

    it('drops its answer when a removal started after the poll left', async () => {
        const store = freshStore();
        const pollAnswer = gate<Answer<typeof getCart>>();
        vi.mocked(getCart).mockReturnValue(pollAnswer.promise);
        const polling = store.pollCart();
        const removed = aCart([]);
        vi.mocked(removeCartItem).mockResolvedValue(answered(removed));
        await store.removeCartItem('p1');

        pollAnswer.resolve(answered(aCart([['p1', 2]])));
        await polling;

        expect(store.cart).toEqual(removed);
    });

    it('drops its answer when an explicit read of the cart started after it left', async () => {
        const store = freshStore();
        const pollAnswer = gate<Answer<typeof getCart>>();
        vi.mocked(getCart).mockReturnValueOnce(pollAnswer.promise);
        const polling = store.pollCart();
        const fresher = aCart([['p1', 9]]);
        vi.mocked(getCart).mockResolvedValueOnce(answered(fresher));
        await store.fetchCart();

        pollAnswer.resolve(answered(aCart([['p1', 2]])));
        await polling;

        expect(store.cart).toEqual(fresher);
    });

    it('drops an answer meant for the person who has since signed out', async () => {
        await signInAs('a');
        const store = freshStore();
        const pollAnswer = gate<Answer<typeof getCart>>();
        vi.mocked(getCart).mockReturnValue(pollAnswer.promise);
        const polling = store.pollCart();

        await signInAs();
        pollAnswer.resolve(answered(aCart([['p1', 2]])));
        await polling;

        expect(store.cart).toBeUndefined();
    });
});
