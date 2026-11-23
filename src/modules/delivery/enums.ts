/**
 * @module
 * Delivery — the runtime enum constants this module's templates branch on, re-exported one
 * at a time from the generated API (a `.vue` file may not import `@api` itself). Shipment and hold dialogs' reasons, and the preorder board's state filter.
 * The barrel publishes them, so a sibling reads them from `@/modules/delivery`.
 */

export {
    PreorderFulfillmentState,
    ShipmentLostReason,
    HoldFulfillmentOrderRequestReason
} from '@api';
