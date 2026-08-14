/**
 * Admin — public barrel.
 *
 * The only surface a sibling module may import. See any sibling's barrel for the rule.
 *
 * Deliberately empty of runtime exports: nothing outside admin needs one. Its view-model types are
 * exported from here rather than from a shared `src/types/index.ts` — a shared file naming a
 * domain is exactly the coupling the module layout exists to remove.
 */

export type { AdminTabKey, AdminKpiCard, AdminAuditFilters } from './types';
