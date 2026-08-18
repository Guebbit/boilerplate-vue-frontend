/**
 * The commerce cross-talk of the mock layer — the BE's domain-event listeners, mock-side.
 *
 * On the backend, checkout/cancel/ship don't call payments, delivery or inventory: they emit
 * events those modules answer. MSW has no event bus, so the listeners live here as plain
 * functions and the handlers that move money, parcels or units call them — through this support
 * file rather than through each other, because a module's `mocks/handlers.ts` is internal and
 * the barrels must stay mock-free (a barrel export would drag MSW into the production chunk).
 *
 * Same residency rule as `createMockOrder` and `cartItemToOrderItem` in `mockDb`: the
 * support layer is allowed to know several domains at once. Deleting one of the three modules
 * leaves its collection and listener here unread — harmless, and one grep away from removal.
 */
import type { InventoryLevel, Payment, Shipment, ShippingMethod, StockMovement } from 'src/types';
import { getIsoDateNow, mockDatabase, recordMockEmail } from './mockDb.ts';

declare module '@/kernel/registry' {
    interface MockSeedData {
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
 * why attached — the checkout, the cancel, the delivery, the stocktake correction.
 *
 * The two deltas are separate because the counters are: a hold moves `reserved` and leaves
 * `onHand` alone, a delivery does the opposite, and a completed sale moves both. The
 * reason→deltas table the backend keeps in `src/modules/inventory/domain/transitions.ts` is what
 * a caller should read before inventing a pair.
 *
 * @param movement - the signed changes and their reason
 */
export const recordMockStockMovement = (
    /* The contract's own `StockMovement`, less the three fields this function is here to supply.
     * Spelling the four remaining ones out again would be a second declaration of a shape
     * `openapi.yaml` already owns — and it had already started to rot inwards, reaching into
     * `StockMovement['reason']` for one field while restating the other three by hand. */
    movement: Omit<StockMovement, 'id' | 'createdAt' | 'updatedAt'>
): void => {
    movementIdCounter += 1;
    (mockDatabase.sampleStockMovements ??= []).unshift({
        id: `movement-${movementIdCounter}`,
        ...movement,
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    });
};

/**
 * The reason→deltas table, mock-side.
 *
 * A deliberate mirror of the backend's `src/modules/inventory/domain/transitions.ts`, and the one
 * piece of inventory logic worth restating here: `onHand` and `reserved` move independently, and
 * which of them a transition touches IS the domain rule. Getting it wrong produces a ledger that
 * balances against itself and against nothing else.
 *
 * @param reason - the transition
 * @param quantity - how many units; already signed for `adjust`, positive otherwise
 * @returns the pair of counter deltas that transition records
 */
export const mockCounterDeltaFor = (
    reason: StockMovement['reason'],
    quantity: number
): { onHandDelta: number; reservedDelta: number } => {
    switch (reason) {
        // A hold. The units stay where they are and stop being sellable.
        case 'reserve': {
            return { onHandDelta: 0, reservedDelta: quantity };
        }
        // The sale completes: the units leave the building and stop being spoken for.
        case 'commit': {
            return { onHandDelta: -quantity, reservedDelta: -quantity };
        }
        // The hold is given up — cancelled, or timed out. The units become sellable again.
        case 'release':
        case 'expire': {
            return { onHandDelta: 0, reservedDelta: -quantity };
        }
        // A delivery. The only transition that can create units.
        case 'receive': {
            return { onHandDelta: quantity, reservedDelta: 0 };
        }
        // The one case where `quantity` arrives already signed — `-3` is three units of shrinkage.
        default: {
            return { onHandDelta: quantity, reservedDelta: 0 };
        }
    }
};

/**
 * Move one product's counters and write the row that explains the move.
 *
 * The counters are `readOnly` in the contract — the API derives them, so the generated `Product`
 * makes them non-assignable and the row has to be REPLACED rather than mutated. That is the same
 * shape `products/mocks/handlers.ts` uses for an update, and it is why this lives here instead of
 * being repeated by each handler that shifts stock.
 *
 * @param reason - the transition
 * @param productId - the product whose shelf moves
 * @param quantity - how many units; already signed for `adjust`
 * @param context - what to record on the row beyond the deltas
 * @returns the product's counters after the move, or undefined when no such product exists
 */
export const applyMockStockTransition = (
    reason: StockMovement['reason'],
    productId: string,
    quantity: number,
    context: { reference?: string; note?: string } = {}
): InventoryLevel | undefined => {
    const index = mockDatabase.sampleProducts.findIndex(({ id }) => id === productId);
    if (index === -1) return undefined;

    const product = mockDatabase.sampleProducts[index];
    const { onHandDelta, reservedDelta } = mockCounterDeltaFor(reason, quantity);

    mockDatabase.sampleProducts[index] = {
        ...product,
        onHand: Math.max(0, (product.onHand ?? 0) + onHandDelta),
        reserved: Math.max(0, (product.reserved ?? 0) + reservedDelta)
    };

    recordMockStockMovement({ productId, reason, onHandDelta, reservedDelta, ...context });

    return mockInventoryLevels().find((level) => level.productId === productId);
};

/**
 * The stock board, derived rather than stored.
 *
 * `available` is `onHand - reserved` and is computed here for the same reason the API computes it
 * server-side: it is not a fact anybody writes, and a stored copy is a third number that can
 * disagree with the two it comes from. A product with no counters reads as zeroes rather than
 * being dropped, so the board lists the catalogue rather than a subset of it.
 *
 * @returns one row per product in the mock catalogue
 */
export const mockInventoryLevels = (): InventoryLevel[] =>
    mockDatabase.sampleProducts.map((product) => {
        const onHand = product.onHand ?? 0;
        const reserved = product.reserved ?? 0;
        return {
            productId: product.id,
            title: product.title,
            onHand,
            reserved,
            available: Math.max(0, onHand - reserved)
        };
    });

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
