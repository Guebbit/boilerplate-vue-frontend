/**
 * Admin dashboard view-layer types.
 *
 * Contract types (AdminHealth, AdminMetricsSummary, AuditEventItem, etc.)
 * are generated from openapi.yaml and imported from @types (which re-exports @api).
 * Only UI/composition-specific types belong here.
 */

/** Identifies each tab in the Admin dashboard. */
export type AdminTabKey = 'overview' | 'metrics' | 'audit';

/** A single KPI card shown at the top of the Admin dashboard. */
export interface IAdminKpiCard {
    title: string;
    value: string | number;
    hint?: string;
    status?: 'ok' | 'warn' | 'error';
}
