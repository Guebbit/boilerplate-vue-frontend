import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import { checkout as apiCheckout } from '@api';
import type { CheckoutRequest, CheckoutResponse } from '@types';
import { useObservabilityStore, analyticsEvents } from '@/stores/observability';
import { buildCheckoutCompletedPayload } from '@/entities/order';

/*
 * Checkout flow orchestration store.
 *
 * Keeps cart-to-order conversion in its own feature boundary so cart and orders
 * stay focused on their own domains.
 */
export const useCheckoutStore = defineStore('checkout', () => {
    const { getLoading, setLoading } = useCoreStore();
    const { loading, fetchAny } = useStructureRestApi<CheckoutResponse, string>({
        getLoading,
        setLoading
    });

    /*
     * Convert the authenticated user's current cart into an order.
     *
     * @param checkoutData - Optional checkout payload (address, notes, ...).
     * @returns A promise resolving with the checkout response body.
     */
    const checkoutFromCart = (checkoutData?: CheckoutRequest) =>
        fetchAny(() =>
            apiCheckout(checkoutData)
                .then((response) => {
                    const obs = useObservabilityStore();
                    obs.track(
                        analyticsEvents.CHECKOUT_COMPLETED,
                        buildCheckoutCompletedPayload(response.data)
                    );
                    return response.data;
                })
                .catch((error) => {
                    const obs = useObservabilityStore();
                    obs.track(analyticsEvents.CHECKOUT_FAILED);
                    throw error;
                })
        );

    return {
        loading,
        checkoutFromCart
    };
});
