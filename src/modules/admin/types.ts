/**
 * @module
 * Admin dashboard view-layer types.
 *
 * Contract types (ObservabilityHealth, ObservabilityMetricsSummary, AuditEventItem, etc.)
 * come from `@types`, which re-exports the generated `@api` client types.
 * Only UI/composition-specific types belong here.
 */

/**
 * Identifies each tab in the Admin dashboard.
 */
export type AdminTabKey = 'overview' | 'audit';

/**
 * A single KPI card shown in the admin overview.
 */
export interface AdminKpiCard {
    /** Card label. */
    title: string;
    /** Formatted metric value, already display-ready. */
    value: string | number;
    /** Optional supporting text shown under the value. */
    hint?: string;
    /** Visual state driving the card's icon/colour; omitted means no status badge. */
    status?: 'ok' | 'warn' | 'error' | 'loading' | 'unknown';
}

/**
 * Audit filter form state.
 */
export interface AdminAuditFilters {
    /** Filter by the actor who performed the action. */
    actor?: string;
    /** Filter by the audited action name. */
    action?: string;
    /** Filter by whether the action succeeded or failed. */
    outcome?: 'success' | 'failure';
    /** ISO timestamp lower bound — only events at or after this time. */
    since?: string;
    /** Requested page number, 1-based. */
    page?: number;
    /** Rows per page. */
    pageSize?: number;
}
