/**
 * @module
 * The wishlist store's answers in the wrong order, and for the wrong person: a later write's
 * answer is the list on screen however the network delivers them, and an answer still on the wire
 * when the viewer changes lands nowhere. Same ticket rule as the cart store
 * (`infrastructure/utils/request-ticket.ts`); the generated client is the held seam.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { addWishlistItem, getWishlist, removeWishlistItem } from '@api';
import { useWishlistStore } from '@/modules/wishlist/store.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { answered, gate, type Answer } from '../../../../tests/support/unit/cart-fixtures.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@api')>()),
    getWishlist: vi.fn(),
    addWishlistItem: vi.fn(),
    removeWishlistItem: vi.fn()
}));

/**
 * A wishlist answer.
 *
 * @param ids - The saved product ids.
 * @returns The envelope the generated client resolves with.
 */
const answer = (...ids: string[]) => answered({ items: ids.map((productId) => ({ productId })) });

/**
 * Signs a person in or out and lets the stores' watchers run.
 *
 * @param id - The viewer's id; `undefined` signs out.
 * @returns A promise settling once the watchers have run.
 */
const signInAs = (id?: string) => {
    useSessionStore().viewer =
        id === undefined
            ? undefined
            : { id, email: `${id}@x.test`, role: 'customer', verified: true };
    return nextTick();
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.resetAllMocks();
});

describe('answers that arrive in the wrong order', () => {
    it('shows the later write, not the older answer that arrived last', async () => {
        const store = useWishlistStore();
        const older = gate<Answer<typeof addWishlistItem>>();
        const newer = gate<Answer<typeof removeWishlistItem>>();
        vi.mocked(addWishlistItem).mockReturnValueOnce(older.promise);
        vi.mocked(removeWishlistItem).mockReturnValueOnce(newer.promise);

        const adding = store.addToWishlist('p1');
        const removing = store.removeFromWishlist('p1');
        newer.resolve(answer('p2'));
        await removing;
        older.resolve(answer('p1', 'p2'));
        await adding;

        expect(store.items.map(({ productId }) => productId)).toEqual(['p2']);
    });
});

describe('an answer for the person who is gone', () => {
    it('never shows the previous person’s list to the next one', async () => {
        await signInAs('a');
        const store = useWishlistStore();
        const read = gate<Answer<typeof getWishlist>>();
        vi.mocked(getWishlist).mockReturnValueOnce(read.promise);
        const reading = store.fetchWishlist();

        await signInAs('b');
        read.resolve(answer('secret-of-a'));
        await reading;

        expect(store.items).toEqual([]);
    });
});
