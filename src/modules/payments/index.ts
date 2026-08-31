/**
 * @module
 * Payments — public barrel. One component: the panel the order page mounts.
 *
 * The store stays inside. Paying happens ON an order, through the panel, and a sibling reaching
 * the store directly would be building a second pay flow next to the one that exists.
 *
 * `useOrderRefund` is the one thing published beside the panel, because the operator's refund is a
 * second legitimate consumer and it is not a pay flow. It answers one question and performs one
 * action, which is why publishing it does not reopen what the paragraph above closes.
 */

export { default as PaymentPanel } from './components/PaymentPanel.vue';
export { useOrderRefund } from './composables/use-order-refund';
