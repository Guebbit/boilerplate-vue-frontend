/**
 * @module
 * Composable wrapping the admin dashboard's two read endpoints (health, metrics). The audit trail
 * is NOT here — `AdminAuditTab.vue` fetches its own through
 * `useAuditTrail`, which is what lets that component be reused unchanged for a record's history
 * and the shop-wide audit page, not just this dashboard's tab. Each read is a
 * {@link useAsyncAction}, so a failure resolves into that panel's own error ref rather than
 * rejecting.
 */
import type { Ref } from 'vue';
import { useAsyncAction } from '@guebbit/vue-toolkit';
import { getObservabilityHealth, getObservabilityMetricsOverview } from '@api';
import type { ObservabilityHealth, ObservabilityMetricsSummary } from '@types';
import { translate } from '@/i18n';

/**
 * Shape returned by {@link useAdminObservability}: the two panels' payloads and per-call
 * load/error state, plus the fetchers.
 */
export interface UseAdminObservabilityReturn {
    /**
     * Latest health payload, or `undefined` before the first successful call.
     */
    health: Ref<ObservabilityHealth | undefined>;
    /**
     * Latest metrics payload, or `undefined` before the first successful call.
     */
    metrics: Ref<ObservabilityMetricsSummary | undefined>;
    /**
     * Whether the health call is in flight.
     */
    loadingHealth: Ref<boolean>;
    /**
     * Whether the metrics call is in flight.
     */
    loadingMetrics: Ref<boolean>;
    /**
     * The health call's error message, if its last attempt failed.
     */
    errorHealth: Ref<string | undefined>;
    /**
     * The metrics call's error message, if its last attempt failed.
     */
    errorMetrics: Ref<string | undefined>;
    /**
     * Runs the health fetch.
     */
    fetchHealth: () => Promise<void>;
    /**
     * Runs the metrics fetch.
     */
    fetchMetrics: () => Promise<void>;
    /**
     * Runs both fetches in parallel.
     */
    fetchAll: () => Promise<void>;
}

/**
 * Unified composable for the Admin observability dashboard's overview tab.
 *
 * It exposes two contract-backed endpoints behind one shared state:
 * - GET /observability/health
 * - GET /observability/metrics/overview
 *
 * Each is a {@link useAsyncAction}: the loading/data/error bookkeeping is written once there
 * rather than twice here, and every fetcher resolves rather than rejects, so a partially
 * available stack still renders the panel that answered.
 *
 * @returns Shared state (payloads, per-call loading flags and error messages) plus the fetchers.
 */
export const useAdminObservability = (): UseAdminObservabilityReturn => {
    /**
     * Wraps GET /observability/health; resolves into `errorHealth` rather than rejecting.
     */
    const {
        data: health,
        error: errorHealth,
        loading: loadingHealth,
        run: runHealth
    } = useAsyncAction(() => getObservabilityHealth().then((response) => response.data), {
        fallbackErrorMessage: translate('admin-page.error-load-health')
    });

    /**
     * Wraps GET /observability/metrics/overview; resolves into `errorMetrics` rather than
     * rejecting.
     */
    const {
        data: metrics,
        error: errorMetrics,
        loading: loadingMetrics,
        run: runMetrics
    } = useAsyncAction(() => getObservabilityMetricsOverview().then((response) => response.data), {
        fallbackErrorMessage: translate('admin-page.error-load-metrics')
    });

    /**
     * The two fetchers resolve with nothing: every consumer reads the state refs, and the
     * rejection is already swallowed into `error` by {@link useAsyncAction}.
     *
     * @returns A promise resolving once `health` or `errorHealth` is set.
     */
    const fetchHealth = () => runHealth().then(() => undefined);

    /**
     * @returns A promise resolving once `metrics` or `errorMetrics` is set.
     */
    const fetchMetrics = () => runMetrics().then(() => undefined);

    /**
     * Loads health and metrics in parallel, for the initial dashboard render.
     *
     * @returns A promise resolving once both calls have settled.
     */
    const fetchAll = () => Promise.all([fetchHealth(), fetchMetrics()]).then(() => undefined);

    return {
        health,
        metrics,
        loadingHealth,
        loadingMetrics,
        errorHealth,
        errorMetrics,
        fetchHealth,
        fetchMetrics,
        fetchAll
    };
};
