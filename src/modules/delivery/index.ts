/**
 * Delivery — public barrel. Two components, and nothing else.
 *
 * The store is not here on purpose. Both siblings that use this module mount a component that
 * fetches its own state — the cart the selector, orders the parcel panel — so neither has to learn
 * what a shipping rate is. Publishing the store as well would offer a second, wider way to do the
 * same thing, and the wider one always wins.
 */

export { default as ShippingSelector } from './components/ShippingSelector.vue';
export { default as ShipmentPanel } from './components/ShipmentPanel.vue';
