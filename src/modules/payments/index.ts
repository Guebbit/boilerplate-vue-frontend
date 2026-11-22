/**
 * @module
 * Payments — public barrel: everything this module offers a sibling to import.
 *
 * Unused exports are allowed on purpose: an export nobody imports yet costs nothing, and a missing
 * one makes the next author copy the logic.
 *
 * Never published: views, routes, the manifest, `response-schemas.ts` and locales, plus
 * `schemas.ts` unless a sibling imports it (it pulls the generated Zod contract into the entry
 * chunk, which `tests/cross-cutting/entry-chunk-budget.spec.ts` budgets).
 * The rule: `docs/understand/strategic-ddd.md` §5.
 */

export * from './refund-notice';
export * from './store';
export * from './composables/use-order-refund';
export * from './composables/use-paged-table';
export * from './composables/use-record-offline-payment';
export * from './composables/use-row-select';
export { default as AttentionList } from './components/AttentionList.vue';
export { default as AwaitingTransfersTable } from './components/AwaitingTransfersTable.vue';
export { default as DisputeBanner } from './components/DisputeBanner.vue';
export { default as OrderDisputes } from './components/OrderDisputes.vue';
export { default as OrderReferenceSearch } from './components/OrderReferenceSearch.vue';
export { default as PaymentDrawer } from './components/PaymentDrawer.vue';
export { default as PaymentMethodSelector } from './components/PaymentMethodSelector.vue';
export { default as PaymentPanel } from './components/PaymentPanel.vue';
export { default as PaymentStatusChip } from './components/PaymentStatusChip.vue';
export { default as PaymentsTable } from './components/PaymentsTable.vue';
export { default as RecordOfflinePaymentForm } from './components/RecordOfflinePaymentForm.vue';
export { default as RefundCancelForm } from './components/RefundCancelForm.vue';
export { default as RefundsTable } from './components/RefundsTable.vue';
export { default as TestCardPicker } from './components/TestCardPicker.vue';
export { default as TransferInstructionsPanel } from './components/TransferInstructionsPanel.vue';
