/**
 * @module
 * The kernel's work counts: one writer replaces them, a reader follows them, and clearing empties
 * every key.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { clearWorkCounts, setWorkCounts, useWorkCount } from '@/kernel/work-counts.ts';

afterEach(clearWorkCounts);

describe('the work counts', () => {
    it('hands a reader the count of its own key, and follows the next write', () => {
        const orders = useWorkCount('salesOrders');
        expect(orders.value).toBeUndefined();

        setWorkCounts({ salesOrders: 4, returns: 1 });
        expect(orders.value).toBe(4);
        expect(useWorkCount('returns').value).toBe(1);

        setWorkCounts({ salesOrders: 0 });
        expect(orders.value).toBe(0);
        expect(useWorkCount('returns').value).toBeUndefined();
    });

    it('empties every key when the reader is gone', () => {
        setWorkCounts({ salesOrders: 4, inventory: 2 });

        clearWorkCounts();

        expect(useWorkCount('salesOrders').value).toBeUndefined();
        expect(useWorkCount('inventory').value).toBeUndefined();
    });
});
