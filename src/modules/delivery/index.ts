/**
 * @module
 * Delivery — public barrel: everything this module offers a sibling to import.
 *
 * Unused exports are allowed on purpose: an export nobody imports yet costs nothing, and a missing
 * one makes the next author copy the logic.
 *
 * Never published: views, routes, the manifest, `response-schemas.ts` and locales, plus
 * `schemas.ts` unless a sibling imports it (it pulls the generated Zod contract into the entry
 * chunk, which `tests/cross-cutting/entry-chunk-budget.spec.ts` budgets).
 * The rule: `docs/theory/strategic-ddd.md` §5.
 */

export * from './store';
export * from './composables/use-preorder-summaries';
export * from './domain';
export { default as FulfillmentOrderCard } from './components/FulfillmentOrderCard.vue';
export { default as HoldDialog } from './components/HoldDialog.vue';
export { default as PreorderFulfillmentTable } from './components/PreorderFulfillmentTable.vue';
export { default as ReportLostDialog } from './components/ReportLostDialog.vue';
export { default as ShipItemsDialog } from './components/ShipItemsDialog.vue';
export { default as ShipmentPanel } from './components/ShipmentPanel.vue';
export { default as ShipmentRow } from './components/ShipmentRow.vue';
export { default as ShippingMethodName } from './components/ShippingMethodName.vue';
export { default as ShippingSelector } from './components/ShippingSelector.vue';
