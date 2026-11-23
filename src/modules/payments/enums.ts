/**
 * @module
 * Payments — the runtime enum constants this module's templates branch on, re-exported one
 * at a time from the generated API (a `.vue` file may not import `@api` itself). Payment, refund and outside-money vocabulary: the lists' filters, sorts and the offline-payment form's methods.
 * The barrel publishes them, so a sibling reads them from `@/modules/payments`.
 */

export {
    OutsideMoneyMethod,
    PaymentDisplayStatus,
    PaymentMethodKind,
    PaymentSortItem,
    PaymentAttentionKind,
    RefundStatus,
    RefundReason,
    RefundFailureReason
} from '@api';
