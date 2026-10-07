/**
 * @module
 * The cart store's guest half: a signed-out visitor's list, how it is saved and shared between
 * tabs, what the badge shows for it, and how it is merged into the real cart at sign-in. The
 * generated client is mocked, with each canned answer proven against its response schema.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { EToastType, useNotificationsStore } from '@guebbit/vue-toolkit';
import { useSessionStore } from '@/infrastructure/session.ts';
import {
    GUEST_CART_STORAGE_KEY,
    GUEST_MERGE_ATTEMPT_STORAGE_KEY
} from '../composables/guest-cart-storage';
import { getCart, getCartSummary, mergeCart } from '@api';
import * as schemas from '@api/schemas';
import { loadLocale } from '@/i18n';
import { contractEnvelope } from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';
import { trackStores } from '../../../../tests/support/unit/track-stores.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { apiRejection, type Answer } from '../../../../tests/support/unit/cart-fixtures.ts';

wireModulesIntoCore();

/**
 * The cart the server holds after a merge: the guest's one line, added.
 */
const MERGED_CART = {
    items: [{ productId: 'p1', quantity: 3, insufficientStock: false }],
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
    merged: contractEnvelope<Answer<typeof mergeCart>>(schemas.MergeCartResponse, {
        cart: MERGED_CART,
        lines: [{ productId: 'p1', requested: 3, resulting: 3, insufficientStock: false }]
    }),
    mergedWithChanges: contractEnvelope<Answer<typeof mergeCart>>(schemas.MergeCartResponse, {
        cart: MERGED_CART,
        lines: [
            {
                productId: 'p1',
                requested: 2,
                resulting: 5,
                reason: 'summed',
                insufficientStock: false
            },
            {
                productId: 'p2',
                requested: 1,
                resulting: 0,
                reason: 'unavailable',
                insufficientStock: false
            },
            { productId: 'p3', requested: 4, resulting: 4, insufficientStock: true },
            { productId: 'p4', requested: 1, resulting: 1, insufficientStock: false }
        ]
    }),
    mergedAgain: contractEnvelope<Answer<typeof mergeCart>>(schemas.MergeCartResponse, {
        cart: MERGED_CART,
        lines: [
            {
                productId: 'p9',
                requested: 999,
                resulting: 999,
                reason: 'capped',
                insufficientStock: false
            }
        ]
    }),
    summary: contractEnvelope<Answer<typeof getCartSummary>>(
        schemas.GetCartSummaryResponse,
        MERGED_CART.summary
    ),
    cart: contractEnvelope<Answer<typeof getCart>>(schemas.GetCartResponse, MERGED_CART)
};

vi.mock('@api', () => ({
    getCart: vi.fn(() => Promise.resolve(RESPONSES.cart)),
    getCartSummary: vi.fn(() => Promise.resolve(RESPONSES.summary)),
    mergeCart: vi.fn(() => Promise.resolve(RESPONSES.merged))
}));

/**
 * A fresh store, tracked so `afterEach` can dispose it.
 */
const { fresh: freshStore, disposeAll } = trackStores();

beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
    return loadLocale('en');
});

afterEach(() => {
    disposeAll();
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
            expect(vi.mocked(mergeCart).mock.calls[0]?.[0]).toEqual({
                lines: [
                    { productId: 'p1', quantity: 2 },
                    { productId: 'p2', quantity: 1 }
                ]
            });
            expect(store.cart).toEqual(MERGED_CART);
            expect(merged?.lines).toHaveLength(1);
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

    it('empties it even when some lines changed or were refused: the report and the notification remember them', () => {
        vi.mocked(mergeCart).mockResolvedValueOnce(RESPONSES.mergedWithChanges);
        const store = freshStore();
        store.addGuestItem('p1', 2);
        store.addGuestItem('p2', 1);
        store.addGuestItem('p3', 4);
        store.addGuestItem('p4', 1);

        return store.mergeGuestCart().then((merged) => {
            expect(merged?.lines).toHaveLength(4);
            expect(store.guestLines).toEqual([]);
        });
    });

    it('keeps the guest cart exactly as it was when the call fails', () => {
        vi.mocked(mergeCart).mockRejectedValueOnce(apiRejection(500, 'FAILED'));
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

    it.each([400, 413, 422])(
        'drops the guest cart and says it was cleared when the server refuses the list itself (%i)',
        (status) => {
            vi.mocked(mergeCart).mockRejectedValueOnce(apiRejection(status, 'FAILED'));
            const store = freshStore();
            store.addGuestItem('p1', 3);

            return store.seedAfterSignIn().then(() => {
                const toasts = useNotificationsStore().messages.map(({ message }) => message);
                expect(toasts.some((text) => text.includes('cleared from this device'))).toBe(true);
                expect(toasts.some((text) => text.includes('stays on this device'))).toBe(false);
                expect(store.guestLines).toEqual([]);
                expect(getCartSummary).toHaveBeenCalledTimes(1);
            });
        }
    );

    it('tells the visitor the cart is kept, and still reads the summary, when the merge fails', () => {
        vi.mocked(mergeCart).mockRejectedValueOnce(apiRejection(503, 'FAILED'));
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
        const mergeAnswer = Promise.withResolvers<Answer<typeof mergeCart>>();
        vi.mocked(mergeCart).mockReturnValueOnce(mergeAnswer.promise);
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

    it('lets a second ask join the sign-in read in flight, so the read the first full read waits for is one', async () => {
        const summary = Promise.withResolvers<Answer<typeof getCartSummary>>();
        vi.mocked(getCartSummary).mockReturnValueOnce(summary.promise);
        const store = freshStore();

        const first = store.seedAfterSignIn();
        const second = store.seedAfterSignIn();
        const reading = store.fetchCart();
        await Promise.resolve();
        await Promise.resolve();

        expect(getCart).not.toHaveBeenCalled();

        summary.resolve(RESPONSES.summary);
        await Promise.all([first, second]);
        await reading;

        expect(getCartSummary).toHaveBeenCalledTimes(1);
        expect(getCart).toHaveBeenCalledTimes(1);
    });

    it('starts a new sign-in read once the previous one is over', async () => {
        const store = freshStore();

        await store.seedAfterSignIn();
        await store.seedAfterSignIn();

        expect(getCartSummary).toHaveBeenCalledTimes(2);
    });
});

/**
 * The `Idempotency-Key` the nth `mergeCart` call carried.
 *
 * @param call - Zero-based index of the call.
 * @returns The header value, or `undefined` when there is no such call or it sent none.
 */
const keyOfCall = (call: number): unknown => {
    const headers = vi.mocked(mergeCart).mock.calls[call]?.[1]?.headers as
        Record<string, unknown> | undefined;
    return headers?.['Idempotency-Key'];
};

/**
 * Signs a person in or out, the way the shell's session does, and lets the store's watcher run.
 *
 * @param id - The viewer's id; `undefined` signs out.
 */
const signInAs = (id?: string) => {
    useSessionStore().viewer =
        id === undefined
            ? undefined
            : { id, email: `${id}@x.test`, role: 'customer', verified: true };
    return nextTick();
};

describe('the merge Idempotency-Key', () => {
    it('is sent with every merge, in the shape the contract accepts', () => {
        const store = freshStore();
        store.addGuestItem('p1', 1);

        return store.mergeGuestCart().then(() => {
            const header = { 'Idempotency-Key': keyOfCall(0) };
            expect(schemas.MergeCartHeader.safeParse(header).success).toBe(true);
        });
    });

    it('is the same on the retry of a merge that never got an answer, whatever the failure', async () => {
        const store = freshStore();
        store.addGuestItem('p1', 2);
        vi.mocked(mergeCart).mockRejectedValueOnce(apiRejection(503, 'FAILED'));
        vi.mocked(mergeCart).mockReturnValueOnce(Promise.reject(new Error('Network Error')));

        await store.mergeGuestCart().catch(() => undefined);
        await store.mergeGuestCart().catch(() => undefined);
        await store.mergeGuestCart();

        expect(keyOfCall(0)).toBeTypeOf('string');
        expect(keyOfCall(1)).toBe(keyOfCall(0));
        expect(keyOfCall(2)).toBe(keyOfCall(0));
    });

    it('survives a reload: a retry from a new page load is still the same call', async () => {
        const first = freshStore();
        first.addGuestItem('p1', 2);
        vi.mocked(mergeCart).mockRejectedValueOnce(apiRejection(503, 'FAILED'));
        await first.mergeGuestCart().catch(() => undefined);
        first.$dispose();

        setActivePinia(createPinia());
        await freshStore().mergeGuestCart();

        expect(keyOfCall(1)).toBe(keyOfCall(0));
    });

    it('is fresh for the next merge once one has answered', async () => {
        const store = freshStore();
        store.addGuestItem('p1', 2);
        await store.mergeGuestCart();
        store.addGuestItem('p1', 2);

        await store.mergeGuestCart();

        expect(keyOfCall(1)).not.toBe(keyOfCall(0));
        expect(localStorage.getItem(GUEST_MERGE_ATTEMPT_STORAGE_KEY)).toBeNull();
    });

    it("is fresh after a refusal that is the server's final word", async () => {
        const store = freshStore();
        store.addGuestItem('p1', 2);
        vi.mocked(mergeCart).mockRejectedValueOnce(apiRejection(422, 'FAILED'));
        await store.mergeGuestCart().catch(() => undefined);

        await store.mergeGuestCart();

        expect(keyOfCall(1)).not.toBe(keyOfCall(0));
    });

    it('is not reused for other lines: a key only means "the same merge" with the same body', async () => {
        const store = freshStore();
        store.addGuestItem('p1', 2);
        vi.mocked(mergeCart).mockRejectedValueOnce(apiRejection(503, 'FAILED'));
        await store.mergeGuestCart().catch(() => undefined);
        store.addGuestItem('p2', 1);

        await store.mergeGuestCart();

        // The call that may have been applied is replayed under its own key; only what is new
        // travels under a key of its own.
        expect(keyOfCall(2)).not.toBe(keyOfCall(0));
    });

    it('replays a merge whose answer was lost before sending what the guest added since, so nothing is added twice', async () => {
        const store = freshStore();
        store.addGuestItem('p1', 2);
        vi.mocked(mergeCart).mockReturnValueOnce(Promise.reject(new Error('Network Error')));
        await store.mergeGuestCart().catch(() => undefined);
        store.addGuestItem('p2', 1);

        await store.mergeGuestCart();

        const bodies = vi.mocked(mergeCart).mock.calls.map(([body]) => JSON.stringify(body.lines));
        expect(bodies).toEqual([
            JSON.stringify([{ productId: 'p1', quantity: 2 }]),
            JSON.stringify([{ productId: 'p1', quantity: 2 }]),
            JSON.stringify([{ productId: 'p2', quantity: 1 }])
        ]);
        expect(keyOfCall(1)).toBe(keyOfCall(0));
        expect(keyOfCall(2)).not.toBe(keyOfCall(0));
        expect(store.guestLines).toEqual([]);
    });

    it('replays the lost merge alone when the guest edited it back to nothing', async () => {
        const store = freshStore();
        store.addGuestItem('p1', 2);
        vi.mocked(mergeCart).mockReturnValueOnce(Promise.reject(new Error('Network Error')));
        await store.mergeGuestCart().catch(() => undefined);
        store.removeGuestItems(['p1']);

        await store.mergeGuestCart();

        expect(mergeCart).toHaveBeenCalledTimes(2);
        expect(keyOfCall(1)).toBe(keyOfCall(0));
    });
});

/**
 * Starts a merge that the test answers by hand.
 *
 * @param store - The cart store, already holding the guest lines to send.
 * @returns The merge in flight, and the way to answer it.
 */
const mergeInFlight = (store: ReturnType<typeof freshStore>) => {
    const answer = Promise.withResolvers<Answer<typeof mergeCart>>();
    vi.mocked(mergeCart).mockReturnValueOnce(answer.promise);
    return { merging: store.mergeGuestCart(), answer };
};

describe('lines the guest changes while a merge is out', () => {
    it('keep a product added meanwhile when the server refuses the list itself', async () => {
        const store = freshStore();
        store.addGuestItem('p1', 3);
        const { merging, answer } = mergeInFlight(store);

        store.addGuestItem('p2', 1);
        answer.reject({ success: false, status: 422, message: 'nope', errors: [] });
        await merging.catch(() => undefined);

        expect(store.guestLines).toEqual([{ productId: 'p2', quantity: 1 }]);
    });

    it('keep a product added meanwhile, and drop only the ones that were sent', async () => {
        const store = freshStore();
        store.addGuestItem('p1', 2);
        const { merging, answer } = mergeInFlight(store);

        store.addGuestItem('p7', 1);
        answer.resolve(RESPONSES.merged);
        await merging;

        expect(store.guestLines).toEqual([{ productId: 'p7', quantity: 1 }]);
    });

    it('keep only the extra units of a line grown meanwhile, so nothing is added twice', async () => {
        const store = freshStore();
        store.addGuestItem('p1', 2);
        const { merging, answer } = mergeInFlight(store);

        store.addGuestItem('p1', 3);
        answer.resolve(RESPONSES.merged);
        await merging;

        expect(store.guestLines).toEqual([{ productId: 'p1', quantity: 3 }]);
    });

    it('keep what another tab saved, minus what this call sent', async () => {
        const store = freshStore();
        store.addGuestItem('p1', 2);
        const { merging, answer } = mergeInFlight(store);

        otherTabSaves([
            { productId: 'p1', quantity: 2 },
            { productId: 'p8', quantity: 5 }
        ]);
        answer.resolve(RESPONSES.merged);
        await merging;
        await Promise.resolve();

        expect(store.guestLines).toEqual([{ productId: 'p8', quantity: 5 }]);
        expect(JSON.parse(localStorage.getItem(GUEST_CART_STORAGE_KEY) ?? 'null')).toEqual([
            { productId: 'p8', quantity: 5 }
        ]);
    });

    it('lose nothing when the call fails', async () => {
        const store = freshStore();
        store.addGuestItem('p1', 2);
        const answer = Promise.withResolvers<Answer<typeof mergeCart>>();
        vi.mocked(mergeCart).mockReturnValueOnce(answer.promise);
        const merging = store.mergeGuestCart().catch(() => undefined);

        store.addGuestItem('p7', 1);
        answer.reject({ success: false, status: 503, message: 'nope', errors: [] });
        await merging;

        expect(store.guestLines).toEqual([
            { productId: 'p1', quantity: 2 },
            { productId: 'p7', quantity: 1 }
        ]);
    });
});

/**
 * A store that has merged `RESPONSES.mergedWithChanges`.
 *
 * @returns The store, after the merge answered.
 */
const storeAfterChangedMerge = async () => {
    const store = freshStore();
    store.addGuestItem('p1', 2);
    vi.mocked(mergeCart).mockResolvedValueOnce(RESPONSES.mergedWithChanges);
    await store.mergeGuestCart();
    return store;
};

describe('the merge report', () => {
    it('holds the lines that changed, are short of stock or are gone, and only those, from the answer', async () => {
        const store = await storeAfterChangedMerge();

        expect(store.mergeReport).toEqual([
            {
                productId: 'p1',
                requested: 2,
                resulting: 5,
                reason: 'summed',
                insufficientStock: false
            },
            {
                productId: 'p2',
                requested: 1,
                resulting: 0,
                reason: 'unavailable',
                insufficientStock: false
            },
            { productId: 'p3', requested: 4, resulting: 4, insufficientStock: true }
        ]);
    });

    it('keeps a short line at the quantity the guest asked: the merge never lowers it for stock', async () => {
        const store = await storeAfterChangedMerge();

        const short = store.mergeReport.find(({ productId }) => productId === 'p3');

        expect(short).toMatchObject({ requested: 4, resulting: 4, insufficientStock: true });
        expect(short?.reason).toBeUndefined();
    });

    it('never carries a stock number: a line holds only what was asked, what the cart has and a flag', async () => {
        const store = await storeAfterChangedMerge();

        for (const line of store.mergeReport)
            expect(Object.keys(line).toSorted()).toEqual(
                ['insufficientStock', 'productId', 'reason', 'requested', 'resulting'].toSorted()
            );
    });

    it('stays empty when every line landed as asked', async () => {
        const store = freshStore();
        store.addGuestItem('p1', 3);

        await store.mergeGuestCart();

        expect(store.mergeReport).toEqual([]);
    });

    it('is not set by a merge that failed, and the earlier one stays', async () => {
        const store = await storeAfterChangedMerge();
        store.addGuestItem('p4', 1);
        vi.mocked(mergeCart).mockRejectedValueOnce(apiRejection(500, 'FAILED'));
        await store.mergeGuestCart().catch(() => undefined);

        expect(store.mergeReport).toHaveLength(3);
    });

    it('is closed by dismissing it', async () => {
        const store = await storeAfterChangedMerge();

        store.dismissMergeReport();

        expect(store.mergeReport).toEqual([]);
    });

    it('is replaced, not added to, by a newer merge, even when that one has nothing to report', async () => {
        const store = await storeAfterChangedMerge();
        store.addGuestItem('p9', 999);
        vi.mocked(mergeCart).mockResolvedValueOnce(RESPONSES.mergedAgain);

        await store.mergeGuestCart();

        expect(store.mergeReport).toEqual([
            {
                productId: 'p9',
                requested: 999,
                resulting: 999,
                reason: 'capped',
                insufficientStock: false
            }
        ]);

        store.addGuestItem('p1', 3);
        await store.mergeGuestCart();

        expect(store.mergeReport).toEqual([]);
    });

    it('is untouched by later reads of the cart', async () => {
        const store = await storeAfterChangedMerge();

        await store.fetchCart();
        await store.fetchSummary();
        await store.pollCart();

        expect(store.mergeReport).toHaveLength(3);
    });

    it('goes with the person on logout', async () => {
        await signInAs('a');
        const store = await storeAfterChangedMerge();

        await signInAs();

        expect(store.mergeReport).toEqual([]);
    });

    it('goes when another account takes over, and not for the first sign-in', async () => {
        const store = freshStore();
        store.addGuestItem('p1', 2);
        vi.mocked(mergeCart).mockResolvedValueOnce(RESPONSES.mergedWithChanges);
        // The first sign-in: nobody was there before, so nothing is reset.
        await signInAs('a');
        await store.mergeGuestCart();
        expect(store.mergeReport).toHaveLength(3);

        await signInAs('b');

        expect(store.mergeReport).toEqual([]);
    });
});

describe('the guest list when the session ends', () => {
    it('is cleared, with the pending merge key, once a retryable failure meets a sign-out', async () => {
        vi.mocked(mergeCart).mockRejectedValueOnce(apiRejection(503, 'FAILED'));
        const store = freshStore();
        store.addGuestItem('p1', 2);
        await signInAs('a');
        await store.seedAfterSignIn();
        expect(store.guestLines).toEqual([{ productId: 'p1', quantity: 2 }]);
        expect(localStorage.getItem(GUEST_MERGE_ATTEMPT_STORAGE_KEY)).not.toBeNull();

        await signInAs();

        expect(store.guestLines).toEqual([]);
        expect(localStorage.getItem(GUEST_CART_STORAGE_KEY)).toBeNull();
        expect(localStorage.getItem(GUEST_MERGE_ATTEMPT_STORAGE_KEY)).toBeNull();
    });

    it('is not handed to the next account: B reads its summary and never posts the merge', async () => {
        vi.mocked(mergeCart).mockRejectedValueOnce(apiRejection(503, 'FAILED'));
        const store = freshStore();
        store.addGuestItem('p1', 2);
        await signInAs('a');
        await store.seedAfterSignIn();
        vi.mocked(mergeCart).mockClear();
        vi.mocked(getCartSummary).mockClear();

        await signInAs('b');
        await store.seedAfterSignIn();

        expect(mergeCart).not.toHaveBeenCalled();
        expect(getCartSummary).toHaveBeenCalledTimes(1);
    });

    it('is kept across a reload: a restored session is not a change of viewer', async () => {
        const store = freshStore();
        store.addGuestItem('p1', 2);

        // undefined -> A is what a reload's session restore looks like.
        await signInAs('a');

        expect(store.guestLines).toEqual([{ productId: 'p1', quantity: 2 }]);
        await store.seedAfterSignIn();
        expect(mergeCart).toHaveBeenCalledTimes(1);
    });
});
