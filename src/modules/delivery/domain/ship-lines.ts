/**
 * @module
 * Pure helpers behind the delivery panels: what a ship dialog may send, and how many shipments an
 * order arrives in. The server re-checks every limit (`DELIVERY_LINES_INVALID`); these only keep
 * the form from asking for the impossible and the page from counting by hand.
 */
import type { FulfillmentOrder, FulfillmentOrderLine, Shipment } from '@types';

/**
 * One line of a shipment as the API takes it.
 */
export interface ShipLineInput {
    /** The product that ships. */
    productId: string;
    /** How many units of it leave in this shipment, at least 1. */
    quantity: number;
}

/**
 * What the ship dialog turns its quantity fields into.
 */
export interface ShipLinesVerdict {
    /** Whether every field is a whole number within what remains and at least one unit ships. */
    valid: boolean;
    /** The lines to send, in line order, without the zero-quantity ones. */
    lines: ShipLineInput[];
}

/**
 * The lines that can still ship: those with units remaining.
 *
 * @param lines - A fulfillment order's lines.
 * @returns The ones with `remaining > 0`, in order.
 */
export const shippableLines = (lines: readonly FulfillmentOrderLine[]): FulfillmentOrderLine[] =>
    lines.filter(({ remaining }) => remaining > 0);

/**
 * Reads the dialog's quantity fields against what remains on each line.
 *
 * @param lines - The fulfillment order's lines.
 * @param typed - What each field holds, keyed by product id; a missing key counts as empty.
 * @returns Whether it can be sent, and the lines to send.
 */
export const readShipLines = (
    lines: readonly FulfillmentOrderLine[],
    typed: Readonly<Record<string, string>>
): ShipLinesVerdict => {
    const rows = shippableLines(lines).map(({ productId, remaining }) => {
        const quantity = Number(typed[productId] ?? '');
        return {
            productId,
            quantity,
            fits: Number.isInteger(quantity) && quantity >= 0 && quantity <= remaining
        };
    });
    const picked = rows.filter(({ quantity }) => quantity > 0);
    return {
        valid: rows.every(({ fits }) => fits) && picked.length > 0,
        lines: picked.map(({ productId, quantity }) => ({ productId, quantity }))
    };
};

/**
 * How many shipments the order arrives in, so the page can say "Arrives in 2 shipments".
 *
 * Counts the shipments already cut, or the physical fulfillment orders still to ship from —
 * whichever is larger — so the number does not shrink as the first parcel leaves.
 *
 * @param fulfillmentOrders - The order's fulfillment orders.
 * @param shipments - The order's shipments.
 * @returns The count; digital and cancelled fulfillment orders carry no parcel and are left out.
 */
export const shipmentCount = (
    fulfillmentOrders: readonly FulfillmentOrder[],
    shipments: readonly Shipment[]
): number => {
    const physical = fulfillmentOrders.filter(({ kind }) => kind === 'physical');
    const parcelIds = new Set(physical.map(({ id }) => id));
    return Math.max(
        shipments.filter(({ fulfillmentOrderId }) => parcelIds.has(fulfillmentOrderId)).length,
        physical.filter(({ status }) => status !== 'cancelled').length
    );
};
