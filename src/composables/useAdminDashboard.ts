import { ref, type Ref } from 'vue';
import { adminApi } from '@/utils/api.ts';
import type {
    AdminHealth,
    AdminMetricsSummary,
    AuditEventItem,
    GetAdminAuditLogsOutcomeEnum
} from '@types';

export interface IUseAdminDashboardAuditFilters {
    actor?: string;
    action?: string;
    outcome?: GetAdminAuditLogsOutcomeEnum;
    since?: string;
    limit?: number;
}

export interface IUseAdminDashboardReturn {
    /** Health data from GET /admin/health */
    health: Ref<AdminHealth | undefined>;
    /** Metrics data from GET /admin/metrics/summary */
    metrics: Ref<AdminMetricsSummary | undefined>;
    /** Audit events from GET /admin/audit */
    auditItems: Ref<AuditEventItem[]>;
    auditTotal: Ref<number>;
    /** Loading flags */
    loadingHealth: Ref<boolean>;
    loadingMetrics: Ref<boolean>;
    loadingAudit: Ref<boolean>;
    /** Error messages */
    errorHealth: Ref<string | undefined>;
    errorMetrics: Ref<string | undefined>;
    errorAudit: Ref<string | undefined>;
    /** Fetch actions */
    fetchHealth: () => Promise<void>;
    fetchMetrics: () => Promise<void>;
    fetchAudit: (filters?: IUseAdminDashboardAuditFilters) => Promise<void>;
    fetchAll: () => Promise<void>;
}

/**
 * Unified composable for the Admin dashboard.
 *
 * Provides typed access to all three admin observability endpoints:
 *   - GET /admin/health        → AdminHealth
 *   - GET /admin/metrics/summary → AdminMetricsSummary
 *   - GET /admin/audit         → AuditLogsResponse
 *
 * Contract types are sourced from the generated @api layer via @types.
 * UI-only types (AdminTabKey, IAdminKpiCard) live in types/admin.ts.
 */
export const useAdminDashboard = (): IUseAdminDashboardReturn => {
    const health = ref<AdminHealth | undefined>();
    const metrics = ref<AdminMetricsSummary | undefined>();
    const auditItems = ref<AuditEventItem[]>([]);
    const auditTotal = ref(0);

    const loadingHealth = ref(false);
    const loadingMetrics = ref(false);
    const loadingAudit = ref(false);

    const errorHealth = ref<string | undefined>();
    const errorMetrics = ref<string | undefined>();
    const errorAudit = ref<string | undefined>();

    const fetchHealth = async () => {
        loadingHealth.value = true;
        errorHealth.value = undefined;
        try {
            const response = await adminApi.getAdminHealth();
            health.value = response.data.data;
        } catch (error: unknown) {
            errorHealth.value =
                error instanceof Error ? error.message : 'Failed to load health data';
        } finally {
            loadingHealth.value = false;
        }
    };

    const fetchMetrics = async () => {
        loadingMetrics.value = true;
        errorMetrics.value = undefined;
        try {
            const response = await adminApi.getAdminMetricsSummary();
            metrics.value = response.data.data;
        } catch (error: unknown) {
            errorMetrics.value =
                error instanceof Error ? error.message : 'Failed to load metrics data';
        } finally {
            loadingMetrics.value = false;
        }
    };

    const fetchAudit = async (filters: IUseAdminDashboardAuditFilters = {}) => {
        loadingAudit.value = true;
        errorAudit.value = undefined;
        try {
            const response = await adminApi.getAdminAuditLogs(
                filters.actor,
                filters.action,
                filters.outcome,
                filters.since,
                filters.limit
            );
            auditItems.value = response.data.data.items;
            auditTotal.value = response.data.data.total;
        } catch (error: unknown) {
            errorAudit.value = error instanceof Error ? error.message : 'Failed to load audit data';
        } finally {
            loadingAudit.value = false;
        }
    };

    const fetchAll = async () => {
        await Promise.all([fetchHealth(), fetchMetrics(), fetchAudit()]);
    };

    return {
        health,
        metrics,
        auditItems,
        auditTotal,
        loadingHealth,
        loadingMetrics,
        loadingAudit,
        errorHealth,
        errorMetrics,
        errorAudit,
        fetchHealth,
        fetchMetrics,
        fetchAudit,
        fetchAll
    };
};
