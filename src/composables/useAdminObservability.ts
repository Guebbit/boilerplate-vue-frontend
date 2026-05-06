import { ref, type Ref } from 'vue';
import { adminApi } from '@/utils/api.ts';
import type { AdminHealth, AdminMetricsSummary, AuditEventItem } from '@types';
import type { IAdminAuditFilters } from '@/types/admin.ts';

export interface IUseAdminObservabilityReturn {
    health: Ref<AdminHealth | undefined>;
    metrics: Ref<AdminMetricsSummary | undefined>;
    auditEvents: Ref<AuditEventItem[]>;
    auditTotal: Ref<number>;
    loadingHealth: Ref<boolean>;
    loadingMetrics: Ref<boolean>;
    loadingAudit: Ref<boolean>;
    errorHealth: Ref<string | undefined>;
    errorMetrics: Ref<string | undefined>;
    errorAudit: Ref<string | undefined>;
    fetchHealth: () => Promise<void>;
    fetchMetrics: () => Promise<void>;
    fetchAuditLogs: (filters?: IAdminAuditFilters) => Promise<void>;
    fetchAll: () => Promise<void>;
}

/**
 * Unified composable for the Admin observability dashboard.
 *
 * It exposes the three contract-backed endpoints behind one shared state:
 * - GET /admin/health
 * - GET /admin/metrics/summary
 * - GET /admin/audit
 */
export const useAdminObservability = (): IUseAdminObservabilityReturn => {
    const health = ref<AdminHealth | undefined>(undefined);
    const metrics = ref<AdminMetricsSummary | undefined>(undefined);
    const auditEvents = ref<AuditEventItem[]>([]);
    const auditTotal = ref(0);

    const loadingHealth = ref(false);
    const loadingMetrics = ref(false);
    const loadingAudit = ref(false);

    const errorHealth = ref<string | undefined>(undefined);
    const errorMetrics = ref<string | undefined>(undefined);
    const errorAudit = ref<string | undefined>(undefined);

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

    const fetchAuditLogs = async (filters: IAdminAuditFilters = {}) => {
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
            auditEvents.value = response.data.data.items;
            auditTotal.value = response.data.data.total;
        } catch (error: unknown) {
            errorAudit.value = error instanceof Error ? error.message : 'Failed to load audit logs';
        } finally {
            loadingAudit.value = false;
        }
    };

    const fetchAll = async () => {
        await Promise.all([fetchHealth(), fetchMetrics(), fetchAuditLogs()]);
    };

    return {
        health,
        metrics,
        auditEvents,
        auditTotal,
        loadingHealth,
        loadingMetrics,
        loadingAudit,
        errorHealth,
        errorMetrics,
        errorAudit,
        fetchHealth,
        fetchMetrics,
        fetchAuditLogs,
        fetchAll
    };
};
