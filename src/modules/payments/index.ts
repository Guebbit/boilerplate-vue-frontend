/**
 * @module
 * Payments — public barrel. Four components: the panel and the transfer-instructions card the
 * order page mounts, the method choice the cart's checkout mounts, and the form the operator's
 * order-edit page mounts.
 *
 * The store stays inside, and so does `useRecordOfflinePayment`: only the form above uses it, and
 * that form lives in this same module, so there is no sibling for it to be published to.
 * `useOrderRefund` is different — `orders`' own edit page calls it directly, which is why it alone
 * crosses the barrel. It answers one question and performs one action, which is why publishing it
 * does not reopen what reaching the store directly would.
 */

export { default as PaymentPanel } from './components/PaymentPanel.vue';
export { default as PaymentMethodSelector } from './components/PaymentMethodSelector.vue';
export { default as TransferInstructionsPanel } from './components/TransferInstructionsPanel.vue';
export { default as RecordOfflinePaymentForm } from './components/RecordOfflinePaymentForm.vue';
export { useOrderRefund } from './composables/use-order-refund';
