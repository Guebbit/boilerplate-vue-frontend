/**
 * The commerce cross-talk of the mock layer — the BE's domain-event listeners, mock-side.
 *
 * On the backend, checkout/cancel/ship don't call payments, delivery or inventory: they emit
 * events those modules answer. MSW has no event bus, so the listeners live here as plain
 * functions and the handlers that move money, parcels or units call them — through this support
 * file rather than through each other, because a module's `mocks/handlers.ts` is internal and
 * the barrels must stay mock-free (a barrel export would drag MSW into the production chunk).
 *
 * Same residency rule as `createMockOrder` and `cartItemToOrderItem` in `mockShared`: the
 * support layer is allowed to know several domains at once. Deleting one of the three modules
 * leaves its collection and listener here unread — harmless, and one grep away from removal.
 */
import type { Payment, Shipment, ShippingMethod, StockMovement } from 'src/types';
import { getIsoDateNow, mockDatabase, recordMockEmail } from './mockShared.ts';

declare module '@/kernel/registry' {
    interface IMockSeedData {
        samplePayments: Payment[];
        sampleShipments: Shipment[];
        sampleStockMovements: StockMovement[];
    }
}

/*
 * All three collections start EMPTY: money exists because somebody paid, a parcel because an
 * order shipped, a ledger row because units moved — and the demo flows are those actions. The
 * declaration merge registers them so `resetMockDatabase` wipes them between tests, exactly
 * like the feedback inbox.
 */
mockDatabase.samplePayments = mockDatabase.samplePayments ?? [];
mockDatabase.sampleShipments = mockDatabase.sampleShipments ?? [];
mockDatabase.sampleStockMovements = mockDatabase.sampleStockMovements ?? [];

/** The same table the BE's `delivery/domain` carries — the mock quotes what the live one would. */
export const MOCK_SHIPPING_METHODS: ShippingMethod[] = [
    { id: 'standard', price: 5, freeAbove: 100 },
    { id: 'express', price: 15 },
    { id: 'pickup', price: 0 }
];

/**
 * What a method costs against an items total — the display half of the free-above rule.
 *
 * @param methodId - the chosen method
 * @param itemsTotal - the lines total the threshold compares against
 * @returns the effective price, or undefined for a method that does not exist
 */
export const priceMockShipping = (methodId: string, itemsTotal: number): number | undefined => {
    const method = MOCK_SHIPPING_METHODS.find(({ id }) => id === methodId);
    if (!method) return undefined;
    return method.freeAbove !== undefined && itemsTotal >= method.freeAbove ? 0 : method.price;
};

let movementIdCounter = 0;

/**
 * The BE's `STOCK_MOVED` listener, mock-side: whichever handler moves units calls this with the
 * why attached — the checkout, the cancel, the admin product write, the restock.
 *
 * @param movement - the signed change and its reason
 */
export const recordMockStockMovement = (movement: {
    productId: string;
    delta: number;
    reason: StockMovement['reason'];
    reference?: string;
}): void => {
    movementIdCounter += 1;
    (mockDatabase.sampleStockMovements ??= []).unshift({
        id: `movement-${movementIdCounter}`,
        ...movement,
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    });
};

let shipmentIdCounter = 0;

/**
 * The BE's `ORDER_STATUS_CHANGED` listener, mock-side: called when a status write lands on
 * `shipped`. Idempotent, and the shipped email goes into the outbox with the tracking code —
 * where an e2e reads it like a customer would.
 *
 * @param orderId - the order that moved
 * @param email - where the order talks
 */
export const shipMockOrder = (orderId: string, email: string): void => {
    const shipments = (mockDatabase.sampleShipments ??= []);
    if (shipments.some((entry) => entry.orderId === orderId)) return;
    shipmentIdCounter += 1;
    const shipment: Shipment = {
        id: `shipment-${shipmentIdCounter}`,
        orderId,
        trackingCode: `TRK-${orderId.slice(-8).toUpperCase()}`,
        status: 'shipped',
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    };
    shipments.unshift(shipment);
    recordMockEmail({
        to: email,
        subject: 'Your order is on its way',
        template: 'delivery.shipment-shipped.ejs',
        lines: [shipment.trackingCode]
    });
};

/**
 * The BE's `ORDER_CANCELLED` listener, mock-side: give the money back if any was taken — the
 * same at-most-once `succeeded → refunded` move.
 *
 * @param orderId - the cancelled order
 */
export const refundMockPaymentForOrder = (orderId: string): void => {
    const payment = (mockDatabase.samplePayments ?? []).find(
        (entry) => entry.orderId === orderId && entry.status === 'succeeded'
    );
    if (!payment) return;
    payment.status = 'refunded';
    payment.updatedAt = getIsoDateNow();
};
