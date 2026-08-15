/**
 * Payments — public barrel. One component: the panel the order page mounts.
 *
 * The store stays inside. Paying happens ON an order, through the panel, and a sibling reaching
 * the store directly would be building a second pay flow next to the one that exists.
 */

export { default as PaymentPanel } from './components/PaymentPanel.vue';
