/**
 * Admin / Observability types — contract-driven from OpenAPI.
 *
 * These types are re-exported from the generated API layer and
 * supplemented with FE-only view-model types (prefixed with `I`).
 */
export type {
    AdminHealth,
    AdminHealthIntegrations,
    AdminHealthMemory,
    AdminHealthResponse,
    AdminHealthSystem,
    AdminMetricsLatency,
    AdminMetricsSummary,
    AdminMetricsSummaryResponse,
    AuditEventItem,
    AuditLogsResponse
} from '@api';

export {
    AuditEventItemActorRoleEnum,
    AuditEventItemLevelEnum,
    AuditEventItemOutcomeEnum
} from '@api';

/**
 * KPI card shown in the overview row.
 */
export interface IAdminKpi {
    title: string;
    value: string | number;
    hint?: string;
    status?: 'ok' | 'warn' | 'error' | 'loading' | 'unknown';
}

/**
 * Audit filter form state.
 */
export interface IAdminAuditFilters {
    actor?: string;
    action?: string;
    outcome?: 'success' | 'failure' | '';
    since?: string;
    limit?: number;
}
