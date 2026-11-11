/**
 * @module
 * Products — public barrel: everything this module offers a sibling to import.
 *
 * Unused exports are allowed on purpose: an export nobody imports yet costs nothing, and a missing
 * one makes the next author copy the logic.
 *
 * Never published: views, routes, the manifest, `response-schemas.ts` and locales, plus
 * `schemas.ts` unless a sibling imports it (it pulls the generated Zod contract into the entry
 * chunk, which `tests/cross-cutting/entry-chunk-budget.spec.ts` budgets).
 * The rule: `docs/theory/strategic-ddd.md` §5.
 */

export * from './release-date';
export * from './store';
export * from './translation-tab-errors';
export * from './translations-body';
export * from './composables/use-product-lines';
export * from './composables/use-release-date-confirm';
export * from './composables/use-translated-entity-form';
export * from './domain';
export { default as ProductCard } from './components/ProductCard.vue';
