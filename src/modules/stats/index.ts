/**
 * @module
 * Stats — public barrel: everything this module offers a sibling to import.
 *
 * Unused exports are allowed on purpose: an export nobody imports yet costs nothing, and a missing
 * one makes the next author copy the logic.
 *
 * Never published: views, routes, the manifest, `response-schemas.ts` and locales, plus
 * `schemas.ts` unless a sibling imports it (it pulls the generated Zod contract into the entry
 * chunk, which `tests/cross-cutting/entry-chunk-budget.spec.ts` budgets).
 * The rule: `docs/understand/strategic-ddd.md` §5.
 */

export * from './store';
export * from './domain';
export { default as ChartWithTable } from './components/ChartWithTable.vue';
export { default as MermaidChart } from './components/MermaidChart.vue';
export { default as OperationsSection } from './components/OperationsSection.vue';
export { default as ProductsSection } from './components/ProductsSection.vue';
export { default as SalesSection } from './components/SalesSection.vue';
export { default as StatsPeriodForm } from './components/StatsPeriodForm.vue';
