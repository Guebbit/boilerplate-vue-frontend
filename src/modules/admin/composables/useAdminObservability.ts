import { computed, ref, type ComputedRef, type Ref } from 'vue';
import {
    getObservabilityHealth,
    getObservabilityMetricsOverview,
    getObservabilityAuditLogs,
    deleteExpiredTokens
} from '@api';
import type { ObservabilityHealth, ObservabilityMetricsSummary, AuditEventItem } from '@types';
import type { AdminAuditFilters } from '@/modules/admin/types.ts';
import { useAsyncAction } from '@/infrastructure/useAsyncAction.ts';

export interface UseAdminObservabilityReturn {
    health: Ref<ObservabilityHealth | undefined>;
    metrics: Ref<ObservabilityMetricsSummary | undefined>;
    auditEvents: ComputedRef<AuditEventItem[]>;
    auditTotal: ComputedRef<number>;
    loadingHealth: Ref<boolean>;
    loadingMetrics: Ref<boolean>;
    loadingAudit: Ref<boolean>;
    errorHealth: Ref<string | undefined>;
    errorMetrics: Ref<string | undefined>;
    errorAudit: Ref<string | undefined>;
    fetchHealth: () => Promise<void>;
    fetchMetrics: () => Promise<void>;
    fetchAuditLogs: (filters?: AdminAuditFilters) => Promise<void>;
    fetchAll: () => Promise<void>;
    clearingExpiredTokens: Ref<boolean>;
    clearExpiredTokens: () => Promise<void>;
}

/**
 * Unified composable for the Admin observability dashboard.
 *
 * It exposes the three contract-backed endpoints behind one shared state:
 * - GET /observability/health
 * - GET /observability/metrics/overview
 * - GET /observability/audit
 *
 * Each is a {@link useAsyncAction}: the loading/data/error bookkeeping is written once there
 * rather than three times here, and every fetcher resolves rather than rejects, so a partially
 * available stack still renders the panels that answered.
 *
 * @returns Shared state (payloads, per-call loading flags and error messages) plus the four
 *  fetchers.
 */
export const useAdminObservability = (): UseAdminObservabilityReturn => {
    const {
        data: health,
        error: errorHealth,
        loading: loadingHealth,
        run: runHealth
    } = useAsyncAction(() => getObservabilityHealth().then((response) => response.data), {
        fallbackErrorMessage: 'Failed to load health data'
    });

    const {
        data: metrics,
        error: errorMetrics,
        loading: loadingMetrics,
        run: runMetrics
    } = useAsyncAction(() => getObservabilityMetricsOverview().then((response) => response.data), {
        fallbackErrorMessage: 'Failed to load metrics data'
    });

    /**
     * The audit call answers with items AND a total, so its payload is the envelope; the two are
     * split back out below rather than tracked as separate state that could disagree.
     */
    const {
        data: audit,
        error: errorAudit,
        loading: loadingAudit,
        run: runAuditLogs
    } = useAsyncAction(
        (filters: AdminAuditFilters = {}) =>
            getObservabilityAuditLogs({
                actor: filters.actor,
                action: filters.action,
                outcome: filters.outcome,
                since: filters.since,
                limit: filters.limit
            }).then((response) => response.data),
        { fallbackErrorMessage: 'Failed to load audit logs' }
    );

    const auditEvents = computed(() => audit.value?.items ?? []);
    const auditTotal = computed(() => audit.value?.total ?? 0);

    /**
     * The three fetchers resolve with nothing: every consumer reads the state refs, and a
     * `Promise<void>` is what `AdminAuditTab`'s `onSearch` prop is typed to take.
     *
     * @returns A promise resolving once `health` or `errorHealth` is set.
     */
    const fetchHealth = () => runHealth().then(() => {});

    /**
     * @returns A promise resolving once `metrics` or `errorMetrics` is set.
     */
    const fetchMetrics = () => runMetrics().then(() => {});

    /**
     * Loads the audit log page matching the given filters.
     *
     * @param filters - Actor/action/outcome/since/limit criteria; defaults to no filtering at all.
     * @returns A promise resolving once `auditEvents` + `auditTotal`, or `errorAudit`, are set.
     */
    const fetchAuditLogs = (filters: AdminAuditFilters = {}) =>
        runAuditLogs(filters).then(() => {});

    /**
     * Loads health, metrics and audit logs in parallel, for the initial dashboard render.
     *
     * @returns A promise resolving once all three calls have settled.
     */
    const fetchAll = () =>
        Promise.all([fetchHealth(), fetchMetrics(), fetchAuditLogs()]).then(() => {});

    const clearingExpiredTokens = ref(false);

    /**
     * Purges the expired refresh tokens.
     *
     * The odd one out here, and deliberately not a {@link useAsyncAction}: the other four are
     * READS whose failure is a panel that renders an error, so swallowing the rejection into an
     * `error` ref is exactly right. This is a WRITE whose outcome the visitor asked for and is
     * owed either way, so it REJECTS and lets the view answer with the toast it already writes.
     * Folding it into `useAsyncAction` would mean the view polling an error ref after the fact to
     * decide which message to show.
     *
     * What it does own is the pending flag, because that is bookkeeping rather than copy — the
     * view binds it to the button and never sets it.
     *
     * @returns A promise resolving on success and rejecting on failure. The pending flag is
     *  cleared either way.
     */
    const clearExpiredTokens = (): Promise<void> => {
        clearingExpiredTokens.value = true;
        return deleteExpiredTokens()
            .then(() => undefined)
            .finally(() => {
                clearingExpiredTokens.value = false;
            });
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
        fetchAll,
        clearingExpiredTokens,
        clearExpiredTokens
    };
};
