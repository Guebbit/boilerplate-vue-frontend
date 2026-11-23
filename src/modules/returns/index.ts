/**
 * @module
 * Returns — public barrel: everything this module offers a sibling to import.
 *
 * Unused exports are allowed on purpose: an export nobody imports yet costs nothing, and a missing
 * one makes the next author copy the logic.
 *
 * Never published: views, routes, the manifest, `response-schemas.ts` and locales, plus
 * `schemas.ts` unless a sibling imports it (it pulls the generated Zod contract into the entry
 * chunk, which `tests/cross-cutting/entry-chunk-budget.spec.ts` budgets).
 * The rule: `docs/understand/strategic-ddd.md` §5.
 */

export * from './domain/enums';
export * from './store';
export * from './domain/whole-return';
export { default as CancelRemainderDialog } from './components/CancelRemainderDialog.vue';
export { default as RecordWithdrawalDialog } from './components/RecordWithdrawalDialog.vue';
export { default as ReturnRequestForm } from './components/ReturnRequestForm.vue';
export { default as ReturnStaffActions } from './components/ReturnStaffActions.vue';
export { default as StatedAtFields } from './components/StatedAtFields.vue';
export { default as WithdrawalPanel } from './components/WithdrawalPanel.vue';
