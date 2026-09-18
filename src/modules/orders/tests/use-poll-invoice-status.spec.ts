/**
 * @module
 * `use-poll-invoice-status.ts` — the interval that clears the invoice button's disabled state on
 * its own once the async worker finishes, without a manual reload.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EffectScope, nextTick, ref } from 'vue';
import { usePollInvoiceStatus } from '@/modules/orders/composables/use-poll-invoice-status.ts';
import type { Order } from '@types';

/** A store record for the routed id, with the invoice status a test cares about. */
const order = (id: string, invoicePdfStatus?: Order['invoicePdfStatus']): Order =>
    ({ id, invoicePdfStatus }) as Order;

const POLL_INTERVAL_MS = 5000;

/**
 * Mounts the composable over a settable record, inside a real effect scope — the same context it
 * always runs in from a component's `setup()` — so its `onScopeDispose` cleanup has something to
 * attach to. Hands back the ref, the fetch spy, and the scope itself for the disposal case.
 */
const watchOrder = (initial: Order | undefined, targetId = 'o1') => {
    const currentOrder = ref<Order | undefined>(initial);
    const fetchOrder = vi.fn((_id: string, _settings: { forced: boolean }) =>
        Promise.resolve(undefined)
    );
    const scope = new EffectScope();
    scope.run(() => usePollInvoiceStatus(currentOrder, () => targetId, fetchOrder));
    return { currentOrder, fetchOrder, scope };
};

describe('usePollInvoiceStatus', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('does nothing for an order that is already ready', async () => {
        const { fetchOrder } = watchOrder(order('o1', 'ready'));

        await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);

        expect(fetchOrder).not.toHaveBeenCalled();
    });

    it('does nothing for a pre-existing order with no invoice status at all', async () => {
        const { fetchOrder } = watchOrder(order('o1', undefined));

        await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);

        expect(fetchOrder).not.toHaveBeenCalled();
    });

    it('polls, forced, while the order is pending', async () => {
        const { fetchOrder } = watchOrder(order('o1', 'pending'));

        await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

        expect(fetchOrder).toHaveBeenCalledWith('o1', { forced: true });
    });

    it('keeps polling on the same interval until the status changes', async () => {
        const { fetchOrder } = watchOrder(order('o1', 'pending'));

        await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);

        expect(fetchOrder).toHaveBeenCalledTimes(3);
    });

    it('stops polling once the record turns ready', async () => {
        const { currentOrder, fetchOrder } = watchOrder(order('o1', 'pending'));

        await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
        expect(fetchOrder).toHaveBeenCalledTimes(1);

        currentOrder.value = order('o1', 'ready');
        await nextTick();
        await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);

        // No further calls past the one already in flight when it turned ready.
        expect(fetchOrder).toHaveBeenCalledTimes(1);
    });

    /**
     * The `handle` guard: the interval's own answer re-triggers the watcher on the same still-
     * pending order, and without the guard that would start a second, overlapping interval.
     */
    it('does not double the request rate on its own re-fetch answers', async () => {
        const { currentOrder, fetchOrder } = watchOrder(order('o1', 'pending'));

        // Simulate the poll's own fetch resolving and writing the same pending record back —
        // exactly what re-triggers this watcher in production.
        currentOrder.value = order('o1', 'pending');
        await nextTick();

        await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

        expect(fetchOrder).toHaveBeenCalledTimes(1);
    });

    it('starts polling immediately for an order already pending in the cache', async () => {
        // `immediate: true` is the point, mirroring `useOrderActionsRefetch`: a page arriving
        // from the list already has the record cached, so waiting for a CHANGE would never start
        // the poll for an order that was already pending on mount.
        const { fetchOrder } = watchOrder(order('o1', 'pending'));

        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

        expect(fetchOrder).toHaveBeenCalledTimes(1);
    });

    it('ignores a pending record for a different id', async () => {
        const { fetchOrder } = watchOrder(order('other', 'pending'), 'o1');

        await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);

        expect(fetchOrder).not.toHaveBeenCalled();
    });

    it('retargets to a newly routed order rather than continuing the old poll', async () => {
        const currentOrder = ref<Order | undefined>(order('o1', 'pending'));
        const fetchOrder = vi.fn((_id: string, _settings: { forced: boolean }) =>
            Promise.resolve(undefined)
        );
        let targetId = 'o1';
        new EffectScope().run(() => usePollInvoiceStatus(currentOrder, () => targetId, fetchOrder));

        await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
        expect(fetchOrder).toHaveBeenCalledWith('o1', { forced: true });

        // The route moved to a second order, still pending in the cache the moment it lands.
        targetId = 'o2';
        currentOrder.value = order('o2', 'pending');
        await nextTick();
        fetchOrder.mockClear();

        await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

        expect(fetchOrder).toHaveBeenCalledWith('o2', { forced: true });
    });

    it('stops polling on scope disposal', async () => {
        const { fetchOrder, scope } = watchOrder(order('o1', 'pending'));

        await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
        expect(fetchOrder).toHaveBeenCalledTimes(1);

        scope.stop();
        fetchOrder.mockClear();
        await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3);

        expect(fetchOrder).not.toHaveBeenCalled();
    });
});
