/**
 * Drives cart store actions against answers the test holds back, so a spec chooses the order the
 * network delivers them in.
 *
 * Only usable from a spec that mocks `@api` (`vi.mock('@api', ...)` with a `vi.fn()` per cart
 * operation): every action here is armed through that mock, and `vi.mock` reaches this file too,
 * because it is the module graph that is mocked, not the importing file.
 */
import { expect, vi } from 'vitest';
import { nextTick } from 'vue';
import type { useCartStore } from '@/modules/cart/store';
import { useSessionStore } from '@/infrastructure/session.ts';
import {
    getCart,
    addCartItem,
    updateCartItemById,
    removeCartItem,
    clearCart,
    setCartShippingMethod
} from '@api';
import { answered, gate } from './cart-fixtures';
import type { Answer } from './cart-fixtures';
import type { CartResponse } from '@types';

/**
 * The cart store, as a type.
 */
export type CartStore = ReturnType<typeof useCartStore>;

/**
 * Signs a person in or out the way the session does, and lets the store's watchers run.
 *
 * @param id - The viewer's id; `undefined` signs out
 * @returns A promise settling once the watchers have run
 */
export const signInAs = (id?: string): Promise<void> => {
    useSessionStore().viewer =
        id === undefined
            ? undefined
            : { id, email: `${id}@x.test`, role: 'customer', verified: true };
    return nextTick();
};

/**
 * One store action, and the generated client function it calls.
 */
export interface Action {
    /** The mocked generated client function the action calls. */
    api: {
        mock: { calls: unknown[][] };
        mockReturnValueOnce: (value: Promise<Answer<typeof getCart>>) => unknown;
    };
    /** Starts the action on the store. */
    run: (store: CartStore) => Promise<unknown>;
}

/**
 * Every store action that replaces the cart with the server's answer, by the name a case uses.
 */
export const ACTIONS = {
    add: { api: vi.mocked(addCartItem), run: (store) => store.addCartItem('p1', 1) },
    update: { api: vi.mocked(updateCartItemById), run: (store) => store.updateCartItem('p1', 5) },
    updateOther: {
        api: vi.mocked(updateCartItemById),
        run: (store) => store.updateCartItem('p2', 7)
    },
    remove: { api: vi.mocked(removeCartItem), run: (store) => store.removeCartItem('p1') },
    clear: { api: vi.mocked(clearCart), run: (store) => store.clearCart() },
    shipping: {
        api: vi.mocked(setCartShippingMethod),
        run: (store) => store.setShippingMethod('standard')
    },
    read: { api: vi.mocked(getCart), run: (store) => store.fetchCart() }
} satisfies Record<string, Action>;

/**
 * One request on the wire whose answer the test holds.
 */
export interface Held {
    /** The store's own promise for the action, never rejecting. */
    settled: Promise<unknown>;
    /** Delivers the server's answer for this request. */
    answer: (cart: CartResponse) => void;
}

/**
 * Starts an action against a held answer, and returns once its request has left.
 *
 * @param store - The cart store
 * @param action - What the shopper did
 * @returns The way to deliver this request's answer
 */
export const issue = async (store: CartStore, action: Action): Promise<Held> => {
    const held = gate<Answer<typeof getCart>>();
    const before = action.api.mock.calls.length;
    action.api.mockReturnValueOnce(held.promise);
    const settled = action.run(store).catch(() => undefined);
    await vi.waitFor(() => {
        expect(action.api.mock.calls.length).toBe(before + 1);
    });
    return { settled, answer: (cart) => held.resolve(answered(cart)) };
};
