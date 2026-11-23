/**
 * Typed factories for fulfillment orders, shipments and the preorder board's rows, proven against
 * the generated response schema as every factory in `tests/support/unit/fixtures.ts` is. The
 * preorder summary lives here, not with `inventory`, because `inventory` depends on `delivery`.
 */
import {
    GetFulfillmentOrderResponse,
    GetShipmentResponse,
    ListPreorderFulfillmentOrdersResponse,
    SummarizePreorderFulfillmentOrdersResponse
} from '@api/schemas';
import { contractBody } from '../../../../tests/support/unit/orval-fixture-schema.ts';
import type {
    FulfillmentOrder,
    PreorderFulfillmentOrder,
    PreorderProductSummary,
    Shipment
} from '@types';

/**
 * A valid row of the preorder board's second tab — one waiting fulfillment order of a paid order.
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `PreorderFulfillmentOrder` that parses against the generated schema
 */
export const aPreorderFulfillmentOrder = (
    overrides: Partial<PreorderFulfillmentOrder> = {}
): PreorderFulfillmentOrder =>
    contractBody<PreorderFulfillmentOrder>(
        ListPreorderFulfillmentOrdersResponse.shape.items.element,
        {
            id: 'fo1',
            orderId: 'o1',
            orderNumber: '2027-000001',
            number: 1,
            status: 'on_hold',
            state: 'waiting',
            lines: [
                {
                    productId: 'p1',
                    title: 'Walnut desk',
                    quantity: 1,
                    shippedQuantity: 0,
                    canceledQuantity: 0,
                    remaining: 1
                }
            ],
            buyer: { userId: 'u1', email: 'buyer@example.com' },
            paidAt: '2026-10-01T10:00:00.000Z',
            agreedAt: '2027-03-15',
            slippedDays: 0,
            late: false,
            delivered: false,
            holdReason: 'awaiting_stock',
            createdAt: '2026-10-01T10:00:00.000Z',
            ...overrides
        }
    );

/**
 * A valid fulfillment order as `GET /orders/{id}/fulfillment-orders` answers it — one physical line, open,
 * nothing shipped, and no action offered.
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `FulfillmentOrder` that parses against the generated schema
 */
export const aFulfillmentOrder = (overrides: Partial<FulfillmentOrder> = {}): FulfillmentOrder =>
    contractBody<FulfillmentOrder>(GetFulfillmentOrderResponse, {
        id: 'fo1',
        orderId: 'o1',
        number: 1,
        kind: 'physical',
        status: 'open',
        lines: [
            {
                productId: 'p1',
                title: 'Shirt',
                quantity: 2,
                shippedQuantity: 0,
                canceledQuantity: 0,
                remaining: 2
            }
        ],
        actions: { ship: false, fulfill: false, hold: false, release: false },
        createdAt: '2026-09-01T10:00:00.000Z',
        ...overrides
    });

/**
 * A valid shipment as the delivery routes answer it — shipped, one line, no action offered.
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `Shipment` that parses against the generated schema
 */
export const aShipment = (overrides: Partial<Shipment> = {}): Shipment =>
    contractBody<Shipment>(GetShipmentResponse, {
        id: 's1',
        orderId: 'o1',
        fulfillmentOrderId: 'fo1',
        number: 1,
        status: 'shipped',
        lines: [{ productId: 'p1', title: 'Shirt', quantity: 1 }],
        forced: false,
        awaitingTracking: false,
        shippedAt: '2026-09-02T10:00:00.000Z',
        actions: { deliver: false, update: false, markLost: false },
        ...overrides
    });

/**
 * A valid per-product preorder summary — three paid units, all waiting for stock.
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `PreorderProductSummary` that parses against the generated schema
 */
export const aPreorderSummary = (
    overrides: Partial<PreorderProductSummary> = {}
): PreorderProductSummary =>
    contractBody<PreorderProductSummary>(
        SummarizePreorderFulfillmentOrdersResponse.shape.items.element,
        {
            productId: 'p1',
            title: 'Walnut desk',
            firstAgreedAt: '2027-03-15',
            paid: 3,
            waiting: 3,
            allocated: 0,
            shipped: 0,
            canceled: 0,
            late: 0,
            ...overrides
        }
    );
