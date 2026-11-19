/**
 * @module
 * Orders — public barrel: everything this module offers a sibling to import.
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
export * from './composables/use-order-documents';
export * from './composables/use-order-hero';
export * from './domain';
export { default as OrderTimeline } from './components/OrderTimeline.vue';
export { default as ShippingAddressForm } from './components/ShippingAddressForm.vue';
export { default as BillingAddressForm } from './components/BillingAddressForm.vue';
