import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useCheckoutStore } from '@/features/checkout';
import { checkout as apiCheckout } from '@api';
import { analyticsEvents } from '@/stores/observability';

const track = vi.fn();

vi.mock('@/stores/observability', () => ({
    useObservabilityStore: () => ({ track }),
    analyticsEvents: {
        CHECKOUT_COMPLETED: 'checkout_completed',
        CHECKOUT_FAILED: 'checkout_failed'
    }
}));

const ORDER = {
    id: 'o1',
    totalPrice: 19.98
};

vi.mock('@api', () => ({
    checkout: vi.fn(() => Promise.resolve({ data: { order: ORDER } }))
}));

describe('useCheckoutStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it('calls checkout with no payload when none is provided', () =>
        useCheckoutStore()
            .checkoutFromCart()
            .then(() => {
                expect(apiCheckout).toHaveBeenCalledWith(undefined);
            }));

    it('passes an explicit checkout payload through unchanged', () =>
        useCheckoutStore()
            .checkoutFromCart({ notes: 'leave at door' })
            .then((result) => {
                expect(apiCheckout).toHaveBeenCalledWith({ notes: 'leave at door' });
                expect(result).toEqual({ order: ORDER });
            }));

    it('tracks checkout completion using canonical order payload keys', () =>
        useCheckoutStore()
            .checkoutFromCart()
            .then(() => {
                expect(track).toHaveBeenCalledWith(analyticsEvents.CHECKOUT_COMPLETED, {
                    order_id: 'o1',
                    total_price: 19.98
                });
            }));

    it('tracks checkout failure and rethrows the original error', () => {
        const failure = new Error('checkout failed');
        vi.mocked(apiCheckout).mockRejectedValueOnce(failure);

        return expect(useCheckoutStore().checkoutFromCart())
            .rejects.toBe(failure)
            .then(() => {
                expect(track).toHaveBeenCalledWith(analyticsEvents.CHECKOUT_FAILED);
            });
    });
});
