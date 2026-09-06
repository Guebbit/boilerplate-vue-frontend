/**
 * @module
 * `use-order-actions-refetch.ts` — the one forced detail re-fetch an order page needs.
 *
 * Four conditions guard that fetch and every one of them has been a bug: the once-only latch (a
 * second fetch raced the loading lock and swallowed a cancel click), the stale-id check, the
 * `actions === undefined` test, and the `immediate` run that catches a record already in the cache.
 * Each is asserted on its own, because any of them alone would look correct from the outside.
 */
import { describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { useOrderActionsRefetch } from '@/modules/orders/composables/use-order-actions-refetch.ts';
import type { Order, OrderActions } from '@types';

/** A store record for the routed id; `actions` present means the detail representation arrived. */
const order = (id: string, actions?: OrderActions): Order => ({ id, actions }) as Order;

/** A terminal order: the detail representation arrived and offers nothing. */
const NO_MOVES: OrderActions = { transitions: [], cancel: false, pay: false };

/** A live order with a move available. */
const CAN_CANCEL: OrderActions = { transitions: ['cancelled'], cancel: true, pay: false };

/**
 * Mounts the composable over a settable record, handing back the ref and the fetch spy.
 *
 * `targetId` is a getter rather than a value because the composable reads it on every run — a
 * navigation has to be able to retarget the latch.
 */
const watchOrder = (initial: Order | undefined, targetId = 'o1') => {
    const currentOrder = ref<Order | undefined>(initial);
    const fetchOrder = vi.fn((_id: string, _settings: { forced: boolean }) =>
        Promise.resolve(undefined)
    );
    useOrderActionsRefetch(currentOrder, () => targetId, fetchOrder);
    return { currentOrder, fetchOrder };
};

describe('useOrderActionsRefetch', () => {
    /**
     * `immediate: true` is the point: a page arriving from the list already has the summary row in
     * the cache, so waiting for a change would never fire.
     */
    it('fetches immediately for a summary row already in the cache', () => {
        const { fetchOrder } = watchOrder(order('o1'));

        expect(fetchOrder).toHaveBeenCalledWith('o1', { forced: true });
    });

    it('fetches once the record resolves', async () => {
        const { currentOrder, fetchOrder } = watchOrder(undefined);
        expect(fetchOrder).not.toHaveBeenCalled();

        currentOrder.value = order('o1');
        await nextTick();

        expect(fetchOrder).toHaveBeenCalledWith('o1', { forced: true });
    });

    /**
     * `forced: true` is what bypasses the cache-first `watchOne`; without it the re-fetch settles
     * for the very summary row that is missing `actions`.
     */
    it('forces the fetch past the cache', () => {
        const { fetchOrder } = watchOrder(order('o1'));

        expect(fetchOrder.mock.calls[0][1]).toEqual({ forced: true });
    });

    it('does nothing for a record that already carries actions', () => {
        const { fetchOrder } = watchOrder(order('o1', CAN_CANCEL));

        expect(fetchOrder).not.toHaveBeenCalled();
    });

    /**
     * An `actions` object offering nothing is a real answer — a terminal order — not a missing
     * one. Testing truthiness of the moves rather than `actions !== undefined` would re-fetch
     * forever on a delivered order.
     */
    it('treats an actions object with no available moves as present', () => {
        const { fetchOrder } = watchOrder(order('o1', NO_MOVES));

        expect(fetchOrder).not.toHaveBeenCalled();
    });

    it('ignores a record for a different id', () => {
        const { fetchOrder } = watchOrder(order('other'), 'o1');

        expect(fetchOrder).not.toHaveBeenCalled();
    });

    /**
     * The latch. A second forced fetch racing the toolkit's loading lock is what silently swallowed
     * a cancel click, so once is the contract — even though the re-fetch's own answer re-triggers
     * the watcher.
     */
    it('fetches at most once per mount, however often the record changes', async () => {
        const { currentOrder, fetchOrder } = watchOrder(order('o1'));

        currentOrder.value = order('o1');
        await nextTick();
        currentOrder.value = undefined;
        await nextTick();
        currentOrder.value = order('o1');
        await nextTick();

        expect(fetchOrder).toHaveBeenCalledOnce();
    });

    it('stays latched even after the fetch answers with actions', async () => {
        const { currentOrder, fetchOrder } = watchOrder(order('o1'));
        currentOrder.value = order('o1', NO_MOVES);
        await nextTick();

        expect(fetchOrder).toHaveBeenCalledOnce();
    });

    it('never fetches while the record is undefined', async () => {
        const { currentOrder, fetchOrder } = watchOrder(undefined);
        currentOrder.value = undefined;
        await nextTick();

        expect(fetchOrder).not.toHaveBeenCalled();
    });
});
