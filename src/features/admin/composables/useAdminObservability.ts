import { ref, type Ref } from 'vue';
import {
    getObservabilityHealth,
    getObservabilityMetricsOverview,
    getObservabilityAuditLogs
} from '@/utils/api.ts';
import type { ObservabilityHealth, ObservabilityMetricsSummary, AuditEventItem } from '@types';
import type { IAdminAuditFilters } from '@/features/admin/types.ts';

export interface IUseAdminObservabilityReturn {
    health: Ref<ObservabilityHealth | undefined>;
    metrics: Ref<ObservabilityMetricsSummary | undefined>;
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
 * - GET /observability/health
 * - GET /observability/metrics/overview
 * - GET /observability/audit
 */
export const useAdminObservability = (): IUseAdminObservabilityReturn => {
    const health = ref<ObservabilityHealth | undefined>(undefined);
    const metrics = ref<ObservabilityMetricsSummary | undefined>(undefined);
    const auditEvents = ref<AuditEventItem[]>([]);
    const auditTotal = ref(0);

    const loadingHealth = ref(false);
    const loadingMetrics = ref(false);
    const loadingAudit = ref(false);

    const errorHealth = ref<string | undefined>(undefined);
    const errorMetrics = ref<string | undefined>(undefined);
    const errorAudit = ref<string | undefined>(undefined);

    const fetchHealth = () => {
        loadingHealth.value = true;
        errorHealth.value = undefined;
        return getObservabilityHealth()
            .then((response) => {
                health.value = response.data.data;
            })
            .catch((error: unknown) => {
                errorHealth.value =
                    error instanceof Error ? error.message : 'Failed to load health data';
            })
            .finally(() => {
                loadingHealth.value = false;
            });
    };

    const fetchMetrics = () => {
        loadingMetrics.value = true;
        errorMetrics.value = undefined;
        return getObservabilityMetricsOverview()
            .then((response) => {
                metrics.value = response.data.data;
            })
            .catch((error: unknown) => {
                errorMetrics.value =
                    error instanceof Error ? error.message : 'Failed to load metrics data';
            })
            .finally(() => {
                loadingMetrics.value = false;
            });
    };

    const fetchAuditLogs = (filters: IAdminAuditFilters = {}) => {
        loadingAudit.value = true;
        errorAudit.value = undefined;
        return getObservabilityAuditLogs({
            actor: filters.actor,
            action: filters.action,
            outcome: filters.outcome,
            since: filters.since,
            limit: filters.limit
        })
            .then((response) => {
                auditEvents.value = response.data.data.items;
                auditTotal.value = response.data.data.total;
            })
            .catch((error: unknown) => {
                errorAudit.value =
                    error instanceof Error ? error.message : 'Failed to load audit logs';
            })
            .finally(() => {
                loadingAudit.value = false;
            });
    };

    const fetchAll = () =>
        Promise.all([fetchHealth(), fetchMetrics(), fetchAuditLogs()]).then(() => {});

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
