/**
 * @module
 * Delivery — public barrel. Four components and one read-only composable, and nothing else.
 *
 * The store is not here on purpose. The siblings that use this module mount a component that
 * fetches its own state — the cart the selector, orders the parcel panel — so neither has to learn
 * what a shipping rate is. Publishing the store as well would offer a second, wider way to do the
 * same thing, and the wider one always wins.
 */

export { default as ShippingSelector } from './components/ShippingSelector.vue';
export { default as ShipmentPanel } from './components/ShipmentPanel.vue';
export { default as ShippingMethodName } from './components/ShippingMethodName.vue';
// The preorder board (a page of `inventory`) shows these two halves: the second tab is a component,
// the product table's state counts a read-only composable. Neither writes.
export { default as PreorderFulfillmentTable } from './components/PreorderFulfillmentTable.vue';
export { usePreorderSummaries } from './composables/use-preorder-summaries';
