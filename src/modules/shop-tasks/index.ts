/**
 * @module
 * Shop tasks — public barrel: everything this module offers a sibling to import.
 *
 * Unused exports are allowed on purpose: an export nobody imports yet costs nothing, and a missing
 * one makes the next author copy the logic.
 *
 * Never published: views, routes, the manifest, `response-schemas.ts` and locales, plus
 * `schemas.ts` unless a sibling imports it (it pulls the generated Zod contract into the entry
 * chunk, which `tests/cross-cutting/entry-chunk-budget.spec.ts` budgets).
 * The rule: `docs/understand/strategic-ddd.md` §5.
 */

export * from './describe';
export * from './notices';
export * from './store';
export * from './composables/use-shop-work-feed';
export { default as ShopWorkFeed } from './components/ShopWorkFeed.vue';
