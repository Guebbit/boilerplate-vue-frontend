/**
 * @module
 * Cart store, the interleavings that hold: answers delivered in order, an answer for the person
 * still on the tab, and the rule that every write to the basket ends the checkout attempt in
 * progress.
 *
 * The cases that do NOT hold today (an older answer overwriting a newer one, an answer for the
 * previous person landing in the next one's store) are not here: a test that fails is not a test
 * the suite may carry.
 *
 * ── Split with `store.spec.ts` ───────────────────────────────────────────────────────────────
 * That file owns what ONE call does. This one owns what two calls do to each other.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSessionStore } from '@/infrastructure/session.ts';
import {
    getCart,
    getCartSummary,
    addCartItem,
    updateCartItemById,
    removeCartItem,
    clearCart,
    mergeCart,
    setCartShippingMethod,
    reorder,
    checkout as apiCheckout
} from '@api';
import { aCart, lostAnswer, answered } from '../../../../tests/support/unit/cart-fixtures.ts';
import {
    ACTIONS,
    issue,
    signInAs,
    type CartStore
} from '../../../../tests/support/unit/cart-interleave.ts';
import { trackStores } from '../../../../tests/support/unit/track-stores.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { anOrder } from '../../../../tests/support/unit/fixtures.ts';

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
 * The cart every write and read answers with unless a case holds the answer itself.
 */
const SERVER_CART = aCart([['p1', 2]]);

/**
 * A fresh store, tracked so `afterEach` can dispose it.
 */
const { fresh: freshStore, disposeAll } = trackStores();

beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.resetAllMocks();
    const answer = answered(SERVER_CART);
    vi.mocked(getCart).mockResolvedValue(answer);
    vi.mocked(getCartSummary).mockResolvedValue(answered(SERVER_CART.summary));
    vi.mocked(addCartItem).mockResolvedValue(answer);
    vi.mocked(updateCartItemById).mockResolvedValue(answer);
    vi.mocked(removeCartItem).mockResolvedValue(answer);
    vi.mocked(clearCart).mockResolvedValue(answer);
    vi.mocked(setCartShippingMethod).mockResolvedValue(answer);
    vi.mocked(reorder).mockResolvedValue(answer);
    vi.mocked(mergeCart).mockResolvedValue(answered({ cart: SERVER_CART, lines: [] }));
    vi.mocked(apiCheckout).mockResolvedValue(answered(anOrder()));
});

afterEach(() => {
    disposeAll();
});

/**
 * The key a checkout sent, the last time it did.
 *
 * @returns The `Idempotency-Key` header value
 */
const lastKey = (): unknown => {
    const headers = vi.mocked(apiCheckout).mock.calls.at(-1)?.[1]?.headers as
        Record<string, unknown> | undefined;
    return headers?.['Idempotency-Key'];
};

describe('answers that arrive in the order the requests left', () => {
    /**
     * The control for the out-of-order cases: the same pairs, the same harness, delivered in
     * order. It proves the harness delivers what it is told to, and that the last answer is the
     * cart the store holds when nothing is crossed.
     */
    it.each([
        ['an add, then a quantity step', 'add', 'update'],
        ['a step on one line, then a step on another', 'update', 'updateOther'],
        ['a read, then a step', 'read', 'update'],
        ['a shipping pick, then a read', 'shipping', 'read'],
        ['a step, then a removal', 'update', 'remove'],
        ['a step, then clearing the cart', 'update', 'clear']
    ] as const)('shows the later answer: %s', async (_name, firstName, secondName) => {
        const store = freshStore();
        const older = aCart([['p1', 2]]);
        const newer = aCart([
            ['p1', 5],
            ['p2', 7]
        ]);

        const first = await issue(store, ACTIONS[firstName]);
        const second = await issue(store, ACTIONS[secondName]);
        first.answer(older);
        await first.settled;
        expect(store.cart).toEqual(older);
        second.answer(newer);
        await second.settled;

        expect(store.cart).toEqual(newer);
    });

    it('applies an answer that comes back after the shell moved on, while the same person is on the tab', async () => {
        await signInAs('a');
        const store = freshStore();
        const read = await issue(store, ACTIONS.read);

        // The same person refreshed their own record: not a change of person.
        const session = useSessionStore();
        session.viewer = { ...session.viewer!, email: 'new@x.test' };
        read.answer(aCart([['p1', 3]]));
        await read.settled;

        expect(store.cartItems).toEqual([
            { productId: 'p1', quantity: 3, insufficientStock: false }
        ]);
    });
});

describe('the checkout attempt a write to the basket ends', () => {
    /**
     * Every action that changes what a checkout would charge for, by name. A `checkout` still
     * holding the key of an attempt whose answer was lost would otherwise ask the server to replay
     * an order that is not this basket.
     */
    const WRITES: [string, (store: CartStore) => Promise<unknown>][] = [
        ['addCartItem', (store) => store.addCartItem('p1', 1)],
        ['updateCartItem', (store) => store.updateCartItem('p1', 4)],
        ['removeCartItem', (store) => store.removeCartItem('p1')],
        ['clearCart', (store) => store.clearCart()],
        ['setShippingMethod', (store) => store.setShippingMethod('standard')],
        ['reorder', (store) => store.reorder('o1')],
        [
            'mergeGuestCart',
            (store) => {
                store.addGuestItem('p1', 2);
                return store.mergeGuestCart();
            }
        ],
        [
            'seedAfterSignIn, with a guest cart to merge',
            (store) => {
                store.addGuestItem('p1', 2);
                return store.seedAfterSignIn();
            }
        ],
        ['a checkout that went through', (store) => store.checkout()]
    ];

    it.each(WRITES)(
        'is over once %s answers: the next checkout carries a new key',
        async (_name, write) => {
            const store = freshStore();
            vi.mocked(apiCheckout).mockRejectedValueOnce(lostAnswer());
            await store.checkout().catch(() => undefined);
            const keyOfTheLostAttempt = lastKey();

            await write(store);
            await store.checkout();

            expect(lastKey()).not.toBe(keyOfTheLostAttempt);
        }
    );

    it.each([
        ['fetchCart', (store: CartStore) => store.fetchCart()],
        ['fetchSummary', (store: CartStore) => store.fetchSummary()]
    ])(
        'is left running by a plain read, %s: the retry is still the same attempt',
        async (_name, read) => {
            const store = freshStore();
            // The page's own read: the basket the checkout is made from is on screen.
            await store.fetchCart();
            vi.mocked(apiCheckout).mockRejectedValueOnce(lostAnswer());
            await store.checkout().catch(() => undefined);
            const keyOfTheLostAttempt = lastKey();

            await read(store);
            await store.checkout();

            expect(lastKey()).toBe(keyOfTheLostAttempt);
        }
    );

    it('is over once a read brings a different basket: the order is not the one that was sent', async () => {
        const store = freshStore();
        await store.fetchCart();
        vi.mocked(apiCheckout).mockRejectedValueOnce(lostAnswer());
        await store.checkout().catch(() => undefined);
        const keyOfTheLostAttempt = lastKey();

        // Another tab, the wishlist or the stock poll changed the basket meanwhile.
        vi.mocked(getCart).mockResolvedValueOnce(answered(aCart([['p1', 9]])));
        await store.fetchCart();
        await store.checkout();

        expect(lastKey()).not.toBe(keyOfTheLostAttempt);
    });

    it('is left running by a write the server refused: nothing changed, so the attempt stands', async () => {
        const store = freshStore();
        vi.mocked(apiCheckout).mockRejectedValueOnce(lostAnswer());
        await store.checkout().catch(() => undefined);
        const keyOfTheLostAttempt = lastKey();
        vi.mocked(addCartItem).mockRejectedValueOnce({ status: 422, errors: [] });

        await store.addCartItem('p1', 1).catch(() => undefined);
        await store.checkout();

        expect(lastKey()).toBe(keyOfTheLostAttempt);
    });
});
