/**
 * @module
 * The signed-out visitor's cart as a composable: the `{ productId, quantity }` list kept in this
 * browser's `localStorage`, its actions, the copy-taking from another tab, and the key a merge of
 * it travels under. Called inside the cart store's setup, so the list lives and dies with the
 * store; the store keeps the one thing that needs the server, sending it (`mergeGuestCart`).
 * See `docs/modules/cart.md`.
 */
import { computed, onScopeDispose, ref, watch } from 'vue';
import { addGuestLine, guestCartQuantity, removeGuestLines, setGuestLineQuantity } from '../domain';
import type { GuestCartLine } from '../domain';
import {
    GUEST_CART_STORAGE_KEY,
    readGuestCart,
    readMergeAttempt,
    writeGuestCart,
    writeMergeAttempt
} from './guest-cart-storage';

/**
 * Starts the guest cart for the lifetime of the calling scope.
 *
 * @returns The list, its derived counts, its actions and the merge key rules.
 */
export const useGuestCart = () => {
    /**
     * The guest cart's lines. It only ever changes by being replaced, so a plain watch persists it.
     */
    const guestLines = ref<GuestCartLine[]>(readGuestCart());

    /**
     * How many units the guest cart holds.
     */
    const guestQuantity = computed(() => guestCartQuantity(guestLines.value));

    /**
     * Whether the guest cart holds anything.
     */
    const hasGuestLines = computed(() => guestLines.value.length > 0);

    // Vue `watch`: persists every replacement of the list.
    // https://vuejs.org/api/reactivity-core.html#watch
    watch(guestLines, writeGuestCart);

    /**
     * Another tab changed the guest cart: this one takes its copy, so two tabs never save over
     * each other. The event fires in every document but the one that wrote.
     * https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event
     *
     * @param event - The storage event; a `null` key means the whole storage was cleared.
     */
    const onStorage = (event: StorageEvent) => {
        if (event.key === GUEST_CART_STORAGE_KEY || event.key === null)
            guestLines.value = readGuestCart();
    };

    globalThis.addEventListener('storage', onStorage);
    onScopeDispose(() => globalThis.removeEventListener('storage', onStorage));

    /**
     * Adds units to the guest cart; a product already there grows, as `POST /cart` would.
     *
     * @param productId - Product to add.
     * @param quantity - How many to add.
     * @returns `false` when the cart already holds the most distinct products it may and this is a
     *  new one; the cart is then unchanged.
     */
    const addGuestItem = (productId: string, quantity: number): boolean => {
        const next = addGuestLine(guestLines.value, productId, quantity);
        if (next) guestLines.value = next;
        return next !== undefined;
    };

    /**
     * Sets the exact quantity of a guest line.
     *
     * @param productId - Product whose line is updated.
     * @param quantity - New quantity; kept within the allowed range.
     */
    const updateGuestItem = (productId: string, quantity: number) => {
        guestLines.value = setGuestLineQuantity(guestLines.value, productId, quantity);
    };

    /**
     * Drops guest lines.
     *
     * @param productIds - The products whose lines go.
     */
    const removeGuestItems = (productIds: readonly string[]) => {
        guestLines.value = removeGuestLines(guestLines.value, productIds);
    };

    /**
     * Empties the guest cart.
     */
    const clearGuestCart = () => {
        guestLines.value = [];
    };

    /**
     * The `Idempotency-Key` for a merge of these lines. A merge that never got a conclusive answer
     * (the connection dropped, a 5xx) may or may not have been applied, so the retry must be the
     * SAME call to the server: the key is kept, in storage so a reload keeps it too, for as long
     * as the lines are the same. Other lines are another call and get a fresh key.
     *
     * @param lines - The lines about to be sent.
     * @returns The key to send them under.
     */
    const mergeKeyFor = (lines: readonly GuestCartLine[]): string => {
        const body = JSON.stringify(lines);
        const pending = readMergeAttempt();
        if (pending?.body === body) return pending.key;
        const attempt = { key: crypto.randomUUID(), body };
        writeMergeAttempt(attempt);
        return attempt.key;
    };

    return {
        guestLines,
        guestQuantity,
        hasGuestLines,
        addGuestItem,
        updateGuestItem,
        removeGuestItems,
        clearGuestCart,
        mergeKeyFor
    };
};
