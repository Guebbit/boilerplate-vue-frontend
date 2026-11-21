/**
 * @module
 * Reads the availability of the products a screen shows, and keeps it up to date: read when the ids
 * change, and again when the shopper comes back to the tab (the window gets focus, or the tab
 * becomes visible), the way the cart does (`use-cart-focus-refresh.ts`). Stock moves behind an open
 * screen; coming back is the cheap moment to catch up. Not a poll.
 *
 * The answers are written to `@/kernel/availability`, which the product views read. `inventory` is
 * the only writer, because it owns the backend read.
 *
 * @see docs/modules/products.md#availability
 */
import { onScopeDispose, watch } from 'vue';
import { listProductAvailability } from '@api';
import {
    availabilityAskedAt,
    clearAvailability,
    recordAvailability
} from '@/kernel/availability.ts';
import { debug } from '@/infrastructure/utils/logger.ts';
import { useResetOnViewerChange } from '@/infrastructure/utils/use-reset-on-viewer-change.ts';

/**
 * How many ids one `GET /products/availability` accepts: the contract's own cap on `id`.
 */
const AVAILABILITY_BATCH = 100;

/**
 * Splits ids into request-sized batches.
 *
 * @param ids - Every id still to fetch.
 * @returns Consecutive slices of at most {@link AVAILABILITY_BATCH}.
 */
const idBatches = (ids: string[]): string[][] =>
    Array.from({ length: Math.ceil(ids.length / AVAILABILITY_BATCH) }, (_, index) =>
        ids.slice(index * AVAILABILITY_BATCH, (index + 1) * AVAILABILITY_BATCH)
    );

/**
 * Reads the availability of the products that are not fresh enough, in one request per
 * {@link AVAILABILITY_BATCH} ids. An id the server does not answer is recorded as left out.
 *
 * @param productIds - The products to read; duplicates are folded.
 * @param staleTime - How old an entry may be, in milliseconds, before it is read again; 0 reads every time.
 * @returns A promise resolving once every batch is stored. Rejects when a request fails; what was
 *  stored before stays.
 */
export const fetchAvailability = (
    productIds: readonly string[],
    staleTime: number
): Promise<void> => {
    const now = Date.now();
    const due = [...new Set(productIds)].filter((productId) => {
        const askedAt = availabilityAskedAt(productId);
        return askedAt === undefined || now - askedAt >= staleTime;
    });

    return Promise.all(
        idBatches(due).map((batch) =>
            listProductAvailability({ id: batch }).then(({ items }) => {
                const answered = new Map(items.map((item) => [item.productId, item]));
                for (const productId of batch)
                    recordAvailability(productId, answered.get(productId), now);
            })
        )
    ).then(() => undefined);
};

/**
 * Starts reading availability for the lifetime of the calling scope (a component's setup).
 *
 * @param productIds - The products on screen, as a getter so a new page of results is followed.
 * @param staleTime - How old an answer may be before it is read again, in milliseconds: 0 on a
 *  product page, 30 s on a list.
 */
export const useWatchAvailability = (
    productIds: () => readonly string[],
    staleTime: number
): void => {
    /**
     * One read. A failure is not worth a message: the screen keeps the answers it had.
     */
    const refresh = () => {
        fetchAvailability(productIds(), staleTime).catch((error: unknown) => {
            debug('http', 'availability read failed, keeping what is on screen', error);
        });
    };

    watch(productIds, refresh, { immediate: true });

    /**
     * Staff see hidden products a guest does not, so a new person starts from nothing and the
     * screen reads again.
     */
    useResetOnViewerChange(() => {
        clearAvailability();
        refresh();
    });

    /**
     * A tab that becomes visible has been away; a tab that becomes hidden has nothing to read.
     */
    const onVisibilityChange = () => {
        if (document.visibilityState !== 'hidden') refresh();
    };

    // https://developer.mozilla.org/en-US/docs/Web/API/Window/focus_event
    addEventListener('focus', refresh);
    // https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event
    document.addEventListener('visibilitychange', onVisibilityChange);

    onScopeDispose(() => {
        removeEventListener('focus', refresh);
        document.removeEventListener('visibilitychange', onVisibilityChange);
    });
};
