/**
 * @module
 * Cart — public barrel: everything this module offers a sibling to import.
 *
 * Unused exports are allowed on purpose: an export nobody imports yet costs nothing, and a missing
 * one makes the next author copy the logic.
 *
 * Never published: views, routes, the manifest, `response-schemas.ts` and locales, plus
 * `schemas.ts` unless a sibling imports it (it pulls the generated Zod contract into the entry
 * chunk, which `tests/cross-cutting/entry-chunk-budget.spec.ts` budgets).
 * The rule: `docs/understand/strategic-ddd.md` §5.
 */

export * from './checkout-attempt-storage';
export * from './guest-cart-storage';
export * from './idempotent-calls';
export * from './store';
export * from './composables/use-cart-focus-refresh';
export * from './composables/use-cart-stock-poll';
export * from './composables/use-checkout-draft';
export * from './composables/use-checkout-refusals';
export * from './composables/use-guest-cart';
export * from './composables/use-line-quantity';
export * from './composables/use-line-warning-text';
export * from './domain';
export { default as AddToCartButton } from './components/AddToCartButton.vue';
export { default as CartEmptyState } from './components/CartEmptyState.vue';
export { default as CartLineCard } from './components/CartLineCard.vue';
export { default as GuestCart } from './components/GuestCart.vue';
export { default as MergeReportAlert } from './components/MergeReportAlert.vue';
export { default as SignedInCart } from './components/SignedInCart.vue';
