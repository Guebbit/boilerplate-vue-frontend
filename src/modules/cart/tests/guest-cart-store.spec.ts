/**
 * @module
 * The cart store's guest half: a signed-out visitor's list, how it is saved and shared between
 * tabs, what the badge shows for it, and how it is merged into the real cart at sign-in. The
 * generated client is mocked, with each canned answer proven against its response schema.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { EToastType, useNotificationsStore } from '@guebbit/vue-toolkit';
import { useCartStore } from '@/modules/cart/store';
import { GUEST_CART_STORAGE_KEY } from '@/modules/cart/composables/guest-cart-storage';
import { getCart, getCartSummary, mergeCart } from '@api';
import * as schemas from '@api/schemas';
import { loadLocale } from '@/i18n';
import { contractResponse } from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/**
 * The cart the server holds after a merge: the guest's one line, added.
 */
const MERGED_CART = {
    items: [{ productId: 'p1', quantity: 3 }],
    summary: {
        itemsCount: 1,
        totalQuantity: 3,
        itemsTotal: 30,
        shippingCost: 0,
        totalPrice: 30,
        currency: 'EUR'
    },
    shipping: { required: false, selected: null, options: [] }
};

/**
 * Canned answers, each proven against the operation's own response schema once.
 */
const RESPONSES = {
    merged: contractResponse(schemas.MergeCartResponse, { cart: MERGED_CART, refused: [] }),
    mergedWithRefusals: contractResponse(schemas.MergeCartResponse, {
        cart: MERGED_CART,
        refused: [{ productId: 'p2', quantity: 1, reason: 'unavailable' }]
    }),
    summary: contractResponse(schemas.GetCartSummaryResponse, MERGED_CART.summary),
    cart: contractResponse(schemas.GetCartResponse, MERGED_CART)
};

/**
 * A rejection shaped like the API client's.
 */
const apiFailure = (status: number) =>
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the API's error ENVELOPE is this client's rejection contract
    Promise.reject({ success: false, status, message: 'nope', errors: [] }) as never;

vi.mock('@api', () => ({
    getCart: vi.fn(() => Promise.resolve(RESPONSES.cart)),
    getCartSummary: vi.fn(() => Promise.resolve(RESPONSES.summary)),
    mergeCart: vi.fn(() => Promise.resolve(RESPONSES.merged))
}));

/**
 * Every store a case created, disposed after it so the `storage` listener each one adds to the
 * window goes with it.
 */
let created: ReturnType<typeof useCartStore>[];

/**
 * A fresh store.
 *
 * @returns The cart store.
 */
const freshStore = () => {
    const store = useCartStore();
    created.push(store);
    return store;
};

beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
    created = [];
    return loadLocale('en');
});

afterEach(() => {
    for (const store of created) store.$dispose();
});

describe('the guest list', () => {
    it('starts from what an earlier visit saved', () => {
        localStorage.setItem(
            GUEST_CART_STORAGE_KEY,
            JSON.stringify([{ productId: 'p1', quantity: 2 }])
        );

        expect(freshStore().guestLines).toEqual([{ productId: 'p1', quantity: 2 }]);
    });

    it('saves every change, and nothing is sent to the server', async () => {
        const store = freshStore();

        store.addGuestItem('p1', 2);
        store.updateGuestItem('p1', 5);
        await Promise.resolve();

        expect(JSON.parse(localStorage.getItem(GUEST_CART_STORAGE_KEY) ?? 'null')).toEqual([
            { productId: 'p1', quantity: 5 }
        ]);
        expect(mergeCart).not.toHaveBeenCalled();
        expect(getCart).not.toHaveBeenCalled();
    });

    it('grows a line the guest already has, and says no to a new product once it is full', () => {
        const store = freshStore();

        expect(store.addGuestItem('p1', 1)).toBe(true);
        expect(store.addGuestItem('p1', 1)).toBe(true);
        expect(store.guestLines).toEqual([{ productId: 'p1', quantity: 2 }]);

        store.guestLines = Array.from({ length: 100 }, (_unused, index) => ({
            productId: `q${index}`,
            quantity: 1
        }));

        expect(store.addGuestItem('brand-new', 1)).toBe(false);
        expect(store.guestLines).toHaveLength(100);
    });

    it('removes lines and empties the cart', () => {
        const store = freshStore();
        store.addGuestItem('a', 1);
        store.addGuestItem('b', 1);
        store.addGuestItem('c', 1);

        store.removeGuestItems(['a', 'c']);

        expect(store.guestLines).toEqual([{ productId: 'b', quantity: 1 }]);

        store.clearGuestCart();

        expect(store.guestLines).toEqual([]);
    });

    it('wears its unit count as the badge, and nothing while empty', () => {
        const store = freshStore();
        expect(store.badgeQuantity).toBeUndefined();

        store.addGuestItem('a', 2);
        store.addGuestItem('b', 3);

        expect(store.badgeQuantity).toBe(5);
    });

    it('yields the badge to the server count once there is one', () => {
        const store = freshStore();
        store.addGuestItem('a', 2);

        return store.fetchSummary().then(() => {
            expect(store.badgeQuantity).toBe(MERGED_CART.summary.totalQuantity);
        });
    });
});

/**
 * Another tab saved a cart: the storage already holds it, and the event names the key.
 *
 * @param lines - What the other tab saved.
 * @param key - The key the event reports; `null` means the storage was cleared.
 */
const otherTabSaves = (lines: unknown[], key: string | null = GUEST_CART_STORAGE_KEY) => {
    if (lines.length > 0) localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(lines));
    else localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    globalThis.dispatchEvent(new StorageEvent('storage', { key }));
};

describe('another tab changing the guest cart', () => {
    it('is taken over, so two tabs never save over each other', () => {
        const store = freshStore();

        otherTabSaves([{ productId: 'p9', quantity: 4 }]);

        expect(store.guestLines).toEqual([{ productId: 'p9', quantity: 4 }]);
    });

    it('is taken over when the whole storage was cleared', () => {
        const store = freshStore();
        store.addGuestItem('p1', 1);

        otherTabSaves([], null);

        expect(store.guestLines).toEqual([]);
    });

    it('ignores a change to some other key', () => {
        const store = freshStore();
        store.addGuestItem('p1', 1);

        otherTabSaves([{ productId: 'p9', quantity: 4 }], 'something-else');

        expect(store.guestLines).toEqual([{ productId: 'p1', quantity: 1 }]);
    });

    it('stops listening when the store goes', () => {
        const store = freshStore();
        store.$dispose();

        otherTabSaves([{ productId: 'p9', quantity: 4 }]);

        expect(store.guestLines).toEqual([]);
    });
});

describe('mergeGuestCart', () => {
    it('sends every line in one call and takes the merged cart', () => {
        const store = freshStore();
        store.addGuestItem('p1', 2);
        store.addGuestItem('p2', 1);

        return store.mergeGuestCart().then((merged) => {
            expect(mergeCart).toHaveBeenCalledTimes(1);
            expect(mergeCart).toHaveBeenCalledWith({
                lines: [
                    { productId: 'p1', quantity: 2 },
                    { productId: 'p2', quantity: 1 }
                ]
            });
            expect(store.cart).toEqual(MERGED_CART);
            expect(merged?.refused).toEqual([]);
        });
    });

    it('empties the guest cart, here and in storage, once the server answered', () => {
        const store = freshStore();
        store.addGuestItem('p1', 2);

        return store.mergeGuestCart().then(() => {
            expect(store.guestLines).toEqual([]);
            expect(localStorage.getItem(GUEST_CART_STORAGE_KEY)).toBeNull();
        });
    });

    it('empties it even when some lines were refused: the notification is what remembers them', () => {
        vi.mocked(mergeCart).mockReturnValueOnce(
            Promise.resolve(RESPONSES.mergedWithRefusals) as never
        );
        const store = freshStore();
        store.addGuestItem('p1', 2);
        store.addGuestItem('p2', 1);

        return store.mergeGuestCart().then((merged) => {
            expect(merged?.refused).toHaveLength(1);
            expect(store.guestLines).toEqual([]);
        });
    });

    it('keeps the guest cart exactly as it was when the call fails', () => {
        vi.mocked(mergeCart).mockReturnValueOnce(apiFailure(500));
        const store = freshStore();
        store.addGuestItem('p1', 2);

        return store.mergeGuestCart().then(
            () => expect.unreachable('a failed merge should reject'),
            () => {
                expect(store.guestLines).toEqual([{ productId: 'p1', quantity: 2 }]);
                expect(store.cart).toBeUndefined();
            }
        );
    });
});

describe('seedAfterSignIn', () => {
    it('reads the summary for the badge when there is no guest cart to merge', () => {
        const store = freshStore();

        return store.seedAfterSignIn().then(() => {
            expect(getCartSummary).toHaveBeenCalledTimes(1);
            expect(mergeCart).not.toHaveBeenCalled();
        });
    });

    it('merges instead of reading the summary when there is a guest cart', () => {
        const store = freshStore();
        store.addGuestItem('p1', 3);

        return store.seedAfterSignIn().then(() => {
            expect(mergeCart).toHaveBeenCalledTimes(1);
            expect(getCartSummary).not.toHaveBeenCalled();
            expect(store.badgeQuantity).toBe(3);
        });
    });

    it('tells the visitor the cart is kept, and still reads the summary, when the merge fails', () => {
        vi.mocked(mergeCart).mockReturnValueOnce(apiFailure(503));
        const store = freshStore();
        store.addGuestItem('p1', 3);

        return store.seedAfterSignIn().then(() => {
            const toast = useNotificationsStore().messages.find(({ message }) =>
                message.includes('stays on this device')
            );
            expect(toast?.type).toBe(EToastType.WARNING);
            expect(getCartSummary).toHaveBeenCalledTimes(1);
            expect(store.guestLines).toEqual([{ productId: 'p1', quantity: 3 }]);
        });
    });

    it('holds the first full read back until the merge has answered, so it cannot overwrite it', async () => {
        const mergeAnswer = Promise.withResolvers<unknown>();
        vi.mocked(mergeCart).mockReturnValueOnce(mergeAnswer.promise as never);
        const store = freshStore();
        store.addGuestItem('p1', 3);

        const seeding = store.seedAfterSignIn();
        const reading = store.fetchCart();
        await Promise.resolve();
        await Promise.resolve();

        expect(getCart).not.toHaveBeenCalled();

        mergeAnswer.resolve(RESPONSES.merged);
        await seeding;
        await reading;

        expect(getCart).toHaveBeenCalledTimes(1);
        expect(vi.mocked(mergeCart).mock.invocationCallOrder[0]).toBeLessThan(
            vi.mocked(getCart).mock.invocationCallOrder[0] ?? 0
        );
    });

    it('does not hold later reads back once the sign-in read is over', async () => {
        const store = freshStore();
        await store.seedAfterSignIn();

        await store.fetchCart();
        await store.fetchCart();

        expect(getCart).toHaveBeenCalledTimes(2);
    });
});
