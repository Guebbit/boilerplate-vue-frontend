/**
 * @module
 * The one runtime path into the generated API a `.vue` file may still use: a handful of
 * enum-shaped constants a template branches on directly (a status badge's color, a select's
 * options). Everything else generated stays type-only through `@types` — `eslint.config.ts`
 * bans a component from reaching `@api` or a runtime value from `@types`, and allows this file
 * as the one named exception.
 *
 * Re-exported one enum at a time, deliberately, rather than `export * from '@api'` — a new
 * constant a component needs is a one-line addition here, not a silent widening of what a
 * template can reach.
 */

// Order lifecycle: a status badge's color, a filter select's options.
export { OrderStatus } from '@api';

// Inventory movement reasons: a movement ledger's filter select.
export { StockMovementReason } from '@api';

// Offline payment methods: a payment method picker's options.
export { RecordOfflinePaymentRequestMethod } from '@api';

// Translation provenance: stamped onto a save, not read from one.
export { TranslationOrigin } from '@api';

// Feedback request lifecycle: an inbox's status filter and status-change options.
export { FeedbackRequestStatus } from '@api';

// Return lifecycle and reasons: the returns list's filter selects.
export { ReturnStatus, ReturnReason } from '@api';
