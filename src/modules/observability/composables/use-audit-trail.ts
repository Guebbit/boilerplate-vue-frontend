/**
 * @module
 * Self-contained fetcher behind `AdminAuditTab.vue`: one composable wired to whichever of the
 * two contract-backed audit reads its `endpoint` says, so the platform dashboard's audit tab, a
 * record's own history and the shop-wide audit page all page through the same code instead of
 * three copies of the same pagination/error bookkeeping. See `useAdminObservability` for the twin
 * this pattern is lifted from.
 */
import { computed, type ComputedRef, type Ref } from 'vue';
import { useAsyncAction } from '@guebbit/vue-toolkit';
import { getObservabilityAuditLogs, listAuditEntries } from '@api';
import type { AuditEntryItem, AuditEventItem } from '@types';
import type { AdminAuditFilters } from '@/modules/observability/types.ts';
import { translate } from '@/i18n';

/**
 * Which trail to read: `platform` is the installation-wide log (`GET /observability/audit`,
 * held by `platform.observability.any.read`); `shop` is the tenant-scoped one (`GET /audit`,
 * held by `audit.any.read` — `manager`/`support`/`moderator`/`admin`).
 */
export type AuditEndpoint = 'platform' | 'shop';

/**
 * One row of either trail. The two contracts declare separate schema names
 * (`AuditEventItem`/`AuditEntryItem`) but the same fields — this is the shape a caller reading
 * either can rely on.
 */
export type AuditTrailItem = AuditEventItem | AuditEntryItem;

/**
 * Shape returned by {@link useAuditTrail}.
 */
export interface UseAuditTrailReturn {
    /** Rows of the current page. */
    entries: ComputedRef<AuditTrailItem[]>;
    /** Every row matching the filters, not just the page. */
    total: ComputedRef<number>;
    /** How many pages the current filters span. */
    pages: ComputedRef<number>;
    /** Whether a fetch is in flight. */
    loading: Ref<boolean>;
    /** The last fetch's failure message, if it failed. */
    error: Ref<string | undefined>;
    /** Loads the page matching the given filters. */
    fetchPage: (filters?: AdminAuditFilters) => Promise<void>;
}

/**
 * Reads one page of an audit trail. Resolves into `error` rather than rejecting — same reasoning
 * as `useAdminObservability`'s three reads: a dead audit endpoint should render as an error panel,
 * not blank the page it sits on.
 *
 * @param endpoint - Which trail to read — fixed for the composable's lifetime, since every call
 *  site (the dashboard tab, one record's history, the shop audit page) reads exactly one.
 * @param target - A fixed `target` filter merged into every request (e.g. one user's or order's
 *  id) — invisible to and never overridden by the filter form, for a single record's history.
 *  Ignored on the `platform` endpoint, whose contract declares no such filter.
 * @returns Rows, pagination totals, load/error state and the fetcher.
 */
export const useAuditTrail = (endpoint: AuditEndpoint, target?: string): UseAuditTrailReturn => {
    const { data, error, loading, run } = useAsyncAction(
        (filters: AdminAuditFilters = {}) =>
            (endpoint === 'platform'
                ? getObservabilityAuditLogs({
                      actor: filters.actor,
                      action: filters.action,
                      outcome: filters.outcome,
                      // `datetime-local` has no timezone of its own; the contract wants a real
                      // ISO instant. An already-ISO `since` (e.g. re-run from a saved filter)
                      // round-trips unchanged.
                      since: filters.since ? new Date(filters.since).toISOString() : undefined,
                      page: filters.page,
                      pageSize: filters.pageSize
                  })
                : listAuditEntries({
                      actor: filters.actor,
                      action: filters.action,
                      outcome: filters.outcome,
                      since: filters.since ? new Date(filters.since).toISOString() : undefined,
                      target,
                      page: filters.page,
                      pageSize: filters.pageSize
                  })
            ).then((response) => response.data),
        { fallbackErrorMessage: translate('admin-page.error-load-audit') }
    );

    /**
     * Rows for the current page, or none while nothing has loaded yet.
     */
    const entries = computed(() => data.value?.items ?? []);

    /**
     * Every entry matching the filters, not the page — what the pager's "N of total" counts with.
     */
    const total = computed(() => data.value?.meta.totalItems ?? 0);

    /**
     * How many pages the current filters span, for the pager's `length`.
     */
    const pages = computed(() => data.value?.meta.totalPages ?? 0);

    /**
     * Resolves with nothing: every consumer reads the state refs, and the rejection is already
     * swallowed into `error` by {@link useAsyncAction}.
     *
     * @param filters - Actor/action/outcome/since criteria and the page to read.
     * @returns A promise resolving once `entries`/`total`/`pages`, or `error`, are set.
     */
    const fetchPage = (filters: AdminAuditFilters = {}) => run(filters).then(() => undefined);

    return { entries, total, pages, loading, error, fetchPage };
};
