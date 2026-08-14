/**
 * Admin dashboard view-layer types.
 *
 * Contract types (ObservabilityHealth, ObservabilityMetricsSummary, AuditEventItem, etc.)
 * come from `@types`, which re-exports the generated `@api` client types.
 * Only UI/composition-specific types belong here.
 */

/** Identifies each tab in the Admin dashboard. */
export type AdminTabKey = 'overview' | 'audit';

/** A single KPI card shown in the admin overview. */
export interface AdminKpiCard {
    title: string;
    value: string | number;
    hint?: string;
    status?: 'ok' | 'warn' | 'error' | 'loading' | 'unknown';
}

/** Audit filter form state. */
export interface AdminAuditFilters {
    actor?: string;
    action?: string;
    outcome?: 'success' | 'failure';
    since?: string;
    limit?: number;
}
