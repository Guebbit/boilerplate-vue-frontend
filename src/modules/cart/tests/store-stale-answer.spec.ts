/**
 * @module
 * Cart store, answers out of order. Every write takes a ticket when it leaves and its answer lands
 * only if no fresher one did first, so the cart shown is the answer to the last request issued,
 * whatever order the network delivers them in. The control with the same pairs delivered in order is
 * `store-interleavings.spec.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fc from 'fast-check';
import { createPinia, setActivePinia } from 'pinia';
import {
    addCartItem,
    getCart,
    removeCartItem,
    updateCartItemById,
    checkout as apiCheckout
} from '@api';
import {
    aCart,
    gate,
    answered,
    type Answer
} from '../../../../tests/support/unit/cart-fixtures.ts';
import { ACTIONS, issue } from '../../../../tests/support/unit/cart-interleave.ts';
import { anOrder } from '../../../../tests/support/unit/fixtures.ts';
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
    setActivePinia(createPinia());
    vi.resetAllMocks();
});

afterEach(() => {
    disposeAll();
});

describe('answers that arrive in the wrong order', () => {
    /**
     * `[first, second]`: the shopper does `first`, then `second` while `first` is still out. The
     * server saw them in that order, so its LAST answer is the cart it now holds; the network
     * delivers the answers the other way round.
     */
    it.each([
        ['an add, then a quantity step', 'add', 'update'],
        ['a step on one line, then a step on another', 'update', 'updateOther'],
        ['a read, then a step', 'read', 'update'],
        ['a shipping pick, then the read the page opened with', 'shipping', 'read'],
        ['a step, then a removal', 'update', 'remove'],
        ['a step, then clearing the cart', 'update', 'clear']
    ] as const)(
        'shows the answer to the later request, not the older one that arrived last: %s',
        async (_name, firstName, secondName) => {
            const store = freshStore();
            const older = aCart([['p1', 2]]);
            const newer = aCart([
                ['p1', 5],
                ['p2', 7]
            ]);

            const first = await issue(store, ACTIONS[firstName]);
            const second = await issue(store, ACTIONS[secondName]);
            // The later request answers first, then the older one arrives and must not win.
            second.answer(newer);
            await second.settled;
            first.answer(older);
            await first.settled;

            expect(store.cart).toEqual(newer);
        }
    );

    /**
     * The general form of the table above: three writes in a row, and `fc.scheduler` picks every
     * order the network could deliver their answers in.
     */
    it('ends on the last write’s answer whatever order the network delivers three of them in', async () => {
        await fc.assert(
            fc.asyncProperty(fc.scheduler(), async (scheduler) => {
                setActivePinia(createPinia());
                const answers = [
                    aCart([['p1', 1]]),
                    aCart([['p1', 2]]),
                    aCart([['p1', 3]])
                ] as const;
                const delivered = (cart: (typeof answers)[number]) =>
                    scheduler.schedule(Promise.resolve(answered(cart))) as never;
                vi.mocked(addCartItem).mockImplementation(() => delivered(answers[0]));
                vi.mocked(updateCartItemById).mockImplementation(() => delivered(answers[1]));
                vi.mocked(removeCartItem).mockImplementation(() => delivered(answers[2]));
                const store = freshStore();

                const writes = [
                    store.addCartItem('p1', 1),
                    store.updateCartItem('p1', 2),
                    store.removeCartItem('p1')
                ];
                await scheduler.waitIdle();
                await Promise.all(writes);

                expect(store.cart).toEqual(answers[2]);
            }),
            { seed: 20_261_004, numRuns: 50, endOnFailure: true }
        );
    });

    it('keeps the emptied cart once the order is placed when a step issued before it answers late', async () => {
        const store = freshStore();
        vi.mocked(getCart).mockResolvedValue(answered(aCart([['p1', 2]])));
        await store.fetchCart();
        const step = await issue(store, ACTIONS.update);
        const order = gate<Answer<typeof apiCheckout>>();
        vi.mocked(apiCheckout).mockReturnValueOnce(order.promise);
        const placing = store.checkout().catch(() => undefined);
        await vi.waitFor(() => {
            expect(apiCheckout).toHaveBeenCalledTimes(1);
        });

        order.resolve(answered(anOrder({ id: 'o1' })));
        await placing;
        step.answer(aCart([['p1', 5]]));
        await step.settled;

        expect(store.cartItems).toEqual([]);
    });
});
