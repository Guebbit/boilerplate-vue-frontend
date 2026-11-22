/**
 * @module
 * Observability — public barrel: everything this module offers a sibling to import.
 *
 * Unused exports are allowed on purpose: an export nobody imports yet costs nothing, and a missing
 * one makes the next author copy the logic.
 *
 * Never published: views, routes, the manifest, `response-schemas.ts` and locales, plus
 * `schemas.ts` unless a sibling imports it (it pulls the generated Zod contract into the entry
 * chunk, which `tests/cross-cutting/entry-chunk-budget.spec.ts` budgets).
 * The rule: `docs/understand/strategic-ddd.md` §5.
 */

export * from './audit-target';
export * from './store';
export * from './types';
export * from './use-realtime-observability';
export * from './composables/use-admin-observability';
export * from './composables/use-audit-trail';
export { default as AdminAuditTab } from './components/AdminAuditTab.vue';
export { default as AdminOverviewTab } from './components/AdminOverviewTab.vue';
export { default as AuditMetadataDetail } from './components/AuditMetadataDetail.vue';
