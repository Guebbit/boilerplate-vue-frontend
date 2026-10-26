/**
 * `useOrderNumberLink` — `src/kernel/order-link.ts` — the feedback inbox's way to the staff orders
 * list filtered to the number a ticket quotes, only when the build ships that list.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOrderNumberLink } from '@/kernel/order-link';

/** The route names the stubbed router resolves; reset per case. */
let routed: string[] = [];

vi.mock('vue-router', () => ({
    useRouter: () => ({ hasRoute: (name: string) => routed.includes(name) })
}));

beforeEach(() => {
    routed = [];
});

describe('useOrderNumberLink', () => {
    it('links a number to the staff orders list filtered by it', () => {
        routed = ['SalesOrders'];

        expect(useOrderNumberLink()('2026-000041')).toMatchObject({
            name: 'SalesOrders',
            query: { orderNumber: '2026-000041' }
        });
    });

    it('gives nothing for a build without the staff list, or without a number', () => {
        expect(useOrderNumberLink()('2026-000041')).toBeUndefined();

        routed = ['SalesOrders'];
        expect(useOrderNumberLink()(undefined)).toBeUndefined();
    });
});
