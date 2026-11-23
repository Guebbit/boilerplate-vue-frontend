/**
 * @module
 * Orders — the runtime enum constants this module's templates branch on, re-exported one
 * at a time from the generated API (a `.vue` file may not import `@api` itself). Order lifecycle and list vocabulary: a status badge's colour, the list's filter and sort selects.
 * The barrel publishes them, so a sibling reads them from `@/modules/orders`.
 */

export {
    OrderStatus,
    OrderFulfillmentFilter,
    OrderSortItem,
    OrderPaymentStatus,
    OrderReturnStatus
} from '@api';
