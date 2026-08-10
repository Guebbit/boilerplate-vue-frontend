import type { CheckoutResponse } from '@api';

/*
 * Payload for the `checkout_completed` analytics event.
 */
export interface ICheckoutCompletedPayload {
    [key: string]: unknown;
    order_id?: string;
    total_price?: number;
}

/*
 * Payload for the `order_created` analytics event.
 */
export interface IOrderCreatedPayload {
    [key: string]: unknown;
    order_id: string;
    total_amount: number;
    item_count: number;
}

/*
 * Build a checkout completion payload from the checkout response.
 *
 * @param checkoutResponse - API response body from `POST /cart/checkout`.
 * @returns Canonical checkout analytics payload.
 */
export const buildCheckoutCompletedPayload = (
    checkoutResponse?: CheckoutResponse
): ICheckoutCompletedPayload => ({
    order_id: checkoutResponse?.order?.id,
    total_price: checkoutResponse?.order?.totalPrice
});

/*
 * Build an order-created payload from direct order values.
 *
 * @param orderId - Created order id.
 * @param totalAmount - Order total amount.
 * @param itemCount - Number of order items.
 * @returns Canonical order-created analytics payload.
 */
export const buildOrderCreatedPayload = (
    orderId: string,
    totalAmount: number,
    itemCount: number
): IOrderCreatedPayload => ({
    order_id: orderId,
    total_amount: totalAmount,
    item_count: itemCount
});
