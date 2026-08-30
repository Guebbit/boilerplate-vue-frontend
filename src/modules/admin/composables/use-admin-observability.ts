/**
 * @module
 * Composable wrapping the admin dashboard's three read endpoints (health, metrics, audit) and one
 * write (expired-token purge). Each read is a {@link useAsyncAction}, so a failure resolves into
 * that panel's own error ref rather than rejecting; the write rejects instead, since its outcome
 * is owed to the visitor who asked for it.
 */
import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { useAsyncAction } from '@guebbit/vue-toolkit';
import {
    getObservabilityHealth,
    getObservabilityMetricsOverview,
    getObservabilityAuditLogs,
    deleteExpiredTokens
} from '@api';
import type { ObservabilityHealth, ObservabilityMetricsSummary, AuditEventItem } from '@types';
import type { AdminAuditFilters } from '@/modules/admin/types.ts';
import { translate } from '@/infrastructure/i18n';

/**
 * Shape returned by {@link useAdminObservability}: the three panels' payloads and per-call
 * load/error state, plus the fetchers and the token-purge action.
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
     * Audit rows for the current page.
     */
    auditEvents: ComputedRef<AuditEventItem[]>;
    /**
     * Total audit rows matching the current filters, across every page.
     */
    auditTotal: ComputedRef<number>;
    /**
     * Total pages the current filters span.
     */
    auditPages: ComputedRef<number>;
    /**
     * Whether the health call is in flight.
     */
    loadingHealth: Ref<boolean>;
    /**
     * Whether the metrics call is in flight.
     */
    loadingMetrics: Ref<boolean>;
    /**
     * Whether the audit call is in flight.
     */
    loadingAudit: Ref<boolean>;
    /**
     * The health call's error message, if its last attempt failed.
     */
    errorHealth: Ref<string | undefined>;
    /**
     * The metrics call's error message, if its last attempt failed.
     */
    errorMetrics: Ref<string | undefined>;
    /**
     * The audit call's error message, if its last attempt failed.
     */
    errorAudit: Ref<string | undefined>;
    /**
     * Runs the health fetch.
     */
    fetchHealth: () => Promise<void>;
    /**
     * Runs the metrics fetch.
     */
    fetchMetrics: () => Promise<void>;
    /**
     * Runs the audit fetch with the given filters.
     */
    fetchAuditLogs: (filters?: AdminAuditFilters) => Promise<void>;
    /**
     * Runs all three fetches in parallel.
     */
    fetchAll: () => Promise<void>;
    /**
     * Whether the expired-token purge is in flight.
     */
    clearingExpiredTokens: Ref<boolean>;
    /**
     * Purges expired refresh tokens; rejects on failure.
     */
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
     * The audit call answers with a page AND its meta, so its payload is the envelope; the parts
     * are split back out below rather than tracked as separate state that could disagree.
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
                page: filters.page,
                pageSize: filters.pageSize
            }).then((response) => response.data),
        { fallbackErrorMessage: translate('admin-page.error-load-audit') }
    );

    /**
     * Audit rows for the current page, or none while nothing has loaded yet.
     */
    const auditEvents = computed(() => audit.value?.items ?? []);

    // Every entry matching the filters, not the page — which is what the pager below counts with.
    const auditTotal = computed(() => audit.value?.meta.totalItems ?? 0);

    /**
     * How many pages the current filters span, for the pager's `length`.
     */
    const auditPages = computed(() => audit.value?.meta.totalPages ?? 0);

    /**
     * The three fetchers resolve with nothing: every consumer reads the state refs, and the
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
     * Loads the audit log page matching the given filters.
     *
     * @param filters - Actor/action/outcome/since criteria and the page to read; defaults to the
     *   first page, unfiltered.
     * @returns A promise resolving once `auditEvents` + `auditTotal`, or `errorAudit`, are set.
     */
    const fetchAuditLogs = (filters: AdminAuditFilters = {}) =>
        runAuditLogs(filters).then(() => undefined);

    /**
     * Loads health, metrics and audit logs in parallel, for the initial dashboard render.
     *
     * @returns A promise resolving once all three calls have settled.
     */
    const fetchAll = () =>
        Promise.all([fetchHealth(), fetchMetrics(), fetchAuditLogs()]).then(() => undefined);

    /**
     * Pending flag for {@link clearExpiredTokens}, bound by the view to its button.
     */
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
        auditPages,
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
