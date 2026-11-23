/**
 * Typed factory for the order-list row, for the `orders` specs. The whole-order factory
 * (`anOrder`) lives with the cart, whose checkout answers it and which `orders` may reach.
 */
import type { OrderListItem } from '@types';
import { NO_ORDER_ACTIONS } from '@/modules/cart/tests/cart-fixtures.ts';

/**
 * A row of the orders list as `GET /orders` answers it: the table's fields and nothing else, so a
 * spec cannot lean on an address or a line the list never carries.
 *
 * @param overrides - the fields a case actually cares about
 * @returns an `OrderListItem`
 */
export const anOrderListItem = (overrides: Partial<OrderListItem> = {}): OrderListItem => ({
    id: 'o1',
    orderNumber: '2026-000001',
    status: 'pending',
    paymentStatus: 'unpaid',
    fulfillmentStatus: 'unfulfilled',
    returnStatus: 'none',
    totalPrice: '0.00',
    currency: 'EUR',
    actions: NO_ORDER_ACTIONS,
    ...overrides
});
