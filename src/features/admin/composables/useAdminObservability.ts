import { ref, type Ref } from 'vue';
import {
    getObservabilityHealth,
    getObservabilityMetricsOverview,
    getObservabilityAuditLogs
} from '@api';
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
/**
 * @returns Shared state (payloads, per-call loading flags and error messages)
 *  plus the four fetchers. Every fetcher resolves rather than rejects: failures
 *  land in the matching `error*` ref so a partially available stack still
 *  renders.
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

    /**
     * Loads the stack health report.
     *
     * @returns A promise resolving once `health` or `errorHealth` is set.
     */
    const fetchHealth = () => {
        loadingHealth.value = true;
        errorHealth.value = undefined;
        return getObservabilityHealth()
            .then((response) => {
                health.value = response.data;
            })
            .catch((error: unknown) => {
                errorHealth.value =
                    error instanceof Error ? error.message : 'Failed to load health data';
            })
            .finally(() => {
                loadingHealth.value = false;
            });
    };

    /**
     * Loads the aggregated metrics overview.
     *
     * @returns A promise resolving once `metrics` or `errorMetrics` is set.
     */
    const fetchMetrics = () => {
        loadingMetrics.value = true;
        errorMetrics.value = undefined;
        return getObservabilityMetricsOverview()
            .then((response) => {
                metrics.value = response.data;
            })
            .catch((error: unknown) => {
                errorMetrics.value =
                    error instanceof Error ? error.message : 'Failed to load metrics data';
            })
            .finally(() => {
                loadingMetrics.value = false;
            });
    };

    /**
     * Loads the audit log page matching the given filters.
     *
     * @param filters - Actor/action/outcome/since/limit criteria; defaults to no
     *  filtering at all.
     * @returns A promise resolving once `auditEvents` + `auditTotal`, or
     *  `errorAudit`, are set.
     */
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
                auditEvents.value = response.data.items;
                auditTotal.value = response.data.total;
            })
            .catch((error: unknown) => {
                errorAudit.value =
                    error instanceof Error ? error.message : 'Failed to load audit logs';
            })
            .finally(() => {
                loadingAudit.value = false;
            });
    };

    /**
     * Loads health, metrics and audit logs in parallel, for the initial
     * dashboard render.
     *
     * @returns A promise resolving once all three calls have settled.
     */
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
