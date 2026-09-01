/**
 * @module
 * Unit tests for the Admin dashboard's data composable.
 *
 * The three endpoints are mocked at `@api`: what this file owns is the composition — that each
 * fetcher writes its own slice of state without touching the other two, that the audit envelope is
 * split into items and page meta rather than tracked as state that could disagree, and that a dead
 * endpoint degrades to an error message beside the panels that did answer.
 *
 * The loading/error bookkeeping itself belongs to `useAsyncAction` and is covered in
 * `tests/unit/infrastructure/use-async-action.spec.ts`; only the parts this composable configures —
 * the fallback messages and the filter payload — are asserted here.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getObservabilityHealth,
    getObservabilityMetricsOverview,
    getObservabilityAuditLogs,
    deleteExpiredTokens
} from '@api';
import { useAdminObservability } from '@/modules/admin/composables/use-admin-observability';

const HEALTH = { status: 'ok', uptimeSeconds: 120 };
const METRICS = { totalRequests: 42, totalErrors: 1 };

/**
 * A page's worth of meta, as `PaginationMeta` declares it.
 */
const meta = (totalItems: number, totalPages = 1, page = 1, pageSize = 50) => ({
    page,
    pageSize,
    totalItems,
    totalPages
});

const AUDIT_ITEM = {
    id: 'a1',
    actor: 'ada@example.com',
    action: 'user.login',
    outcome: 'success',
    createdAt: '2026-01-01T00:00:00.000Z'
};

vi.mock('@api', () => ({
    getObservabilityHealth: vi.fn(() => Promise.resolve({ data: HEALTH })),
    getObservabilityMetricsOverview: vi.fn(() => Promise.resolve({ data: METRICS })),
    getObservabilityAuditLogs: vi.fn(() =>
        Promise.resolve({ data: { items: [AUDIT_ITEM], meta: meta(1) } })
    ),
    deleteExpiredTokens: vi.fn(() => Promise.resolve({ data: undefined }))
}));

/**
 * The reject envelope every real API failure arrives in — `onResponseReject` builds it, and it is
 * a plain object, never an `Error`. Rejecting with anything else here would let a composable that
 * reads its message off `instanceof Error` pass while showing its fallback to every user.
 */
const apiFailure = (status: number, message: string) => ({
    success: false,
    status,
    message,
    errors: [{ code: 'STUB_ERROR', message }]
});

describe('useAdminObservability', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('initial state', () => {
        it('starts with nothing loaded, nothing loading and nothing failed', () => {
            const observability = useAdminObservability();

            expect(observability.health.value).toBeUndefined();
            expect(observability.metrics.value).toBeUndefined();
            expect(observability.auditEvents.value).toEqual([]);
            expect(observability.auditTotal.value).toBe(0);
            expect(observability.loadingHealth.value).toBe(false);
            expect(observability.loadingMetrics.value).toBe(false);
            expect(observability.loadingAudit.value).toBe(false);
            expect(observability.clearingExpiredTokens.value).toBe(false);
            expect(observability.errorHealth.value).toBeUndefined();
            expect(observability.errorMetrics.value).toBeUndefined();
            expect(observability.errorAudit.value).toBeUndefined();
        });
    });

    describe('fetchHealth', () => {
        it('unwraps the response body into health', () => {
            const { health, fetchHealth } = useAdminObservability();

            return expect(fetchHealth())
                .resolves.toBeUndefined()
                .then(() => {
                    expect(getObservabilityHealth).toHaveBeenCalledTimes(1);
                    expect(health.value).toEqual(HEALTH);
                });
        });

        it('is loading while the call is in flight', () => {
            const { loadingHealth, fetchHealth } = useAdminObservability();

            const pending = fetchHealth();
            expect(loadingHealth.value).toBe(true);

            return pending.then(() => {
                expect(loadingHealth.value).toBe(false);
            });
        });

        it('reports its own failure without rejecting or touching the other panels', () => {
            vi.mocked(getObservabilityHealth).mockRejectedValueOnce(
                apiFailure(503, 'Health probe timed out')
            );
            const { health, errorHealth, errorMetrics, errorAudit, fetchHealth } =
                useAdminObservability();

            return expect(fetchHealth())
                .resolves.toBeUndefined()
                .then(() => {
                    // The API's own words, not the fallback: the panel is more useful for saying which
                    // probe failed than for saying that something did.
                    expect(errorHealth.value).toBe('Health probe timed out');
                    expect(health.value).toBeUndefined();
                    expect(errorMetrics.value).toBeUndefined();
                    expect(errorAudit.value).toBeUndefined();
                });
        });
    });

    describe('fetchMetrics', () => {
        it('unwraps the response body into metrics', () => {
            const { metrics, fetchMetrics } = useAdminObservability();

            return fetchMetrics().then(() => {
                expect(getObservabilityMetricsOverview).toHaveBeenCalledTimes(1);
                expect(metrics.value).toEqual(METRICS);
            });
        });

        it('carries its own fallback message when the rejection says nothing', () => {
            // A rejection with no readable message at all — a transport failure that never got a
            // body — is the only case the per-panel fallback is for.
            vi.mocked(getObservabilityMetricsOverview).mockRejectedValueOnce({ status: 0 });
            const { errorMetrics, fetchMetrics } = useAdminObservability();

            return fetchMetrics().then(() => {
                expect(errorMetrics.value).toBe('admin-page.error-load-metrics');
            });
        });
    });

    describe('fetchAuditLogs', () => {
        it('splits the envelope into items, total and page count', () => {
            const { auditEvents, auditTotal, auditPages, fetchAuditLogs } = useAdminObservability();

            return expect(fetchAuditLogs())
                .resolves.toBeUndefined()
                .then(() => {
                    expect(auditEvents.value).toEqual([AUDIT_ITEM]);
                    expect(auditTotal.value).toBe(1);
                    expect(auditPages.value).toBe(1);
                });
        });

        it('reports a total larger than the page, and the pages that reach the rest', () => {
            // The number the dashboard renders as "50 of 3,412" — and, unlike the capped read it
            // replaces, a page count that can actually get to the 3,412nd.
            vi.mocked(getObservabilityAuditLogs).mockResolvedValueOnce({
                data: { items: [AUDIT_ITEM], meta: meta(3412, 69) }
            } as never);
            const { auditTotal, auditPages, fetchAuditLogs } = useAdminObservability();

            return fetchAuditLogs().then(() => {
                expect(auditTotal.value).toBe(3412);
                expect(auditPages.value).toBe(69);
            });
        });

        it('sends every filter through under its contract name', () => {
            const { fetchAuditLogs } = useAdminObservability();

            return fetchAuditLogs({
                actor: 'ada@example.com',
                action: 'user.login',
                outcome: 'failure',
                since: '2026-01-01T00:00:00.000Z',
                page: 3,
                pageSize: 25
            }).then(() => {
                expect(getObservabilityAuditLogs).toHaveBeenCalledWith({
                    actor: 'ada@example.com',
                    action: 'user.login',
                    outcome: 'failure',
                    since: '2026-01-01T00:00:00.000Z',
                    page: 3,
                    pageSize: 25
                });
            });
        });

        it('asks for everything when called with no filters', () => {
            const { fetchAuditLogs } = useAdminObservability();

            return fetchAuditLogs().then(() => {
                expect(getObservabilityAuditLogs).toHaveBeenCalledWith({
                    actor: undefined,
                    action: undefined,
                    outcome: undefined,
                    since: undefined,
                    page: undefined,
                    pageSize: undefined
                });
            });
        });

        it('reads an empty page as no events and a zero total', () => {
            vi.mocked(getObservabilityAuditLogs).mockResolvedValueOnce({
                data: { items: [], meta: meta(0, 0) }
            } as never);
            const { auditEvents, auditTotal, auditPages, fetchAuditLogs } = useAdminObservability();

            return fetchAuditLogs().then(() => {
                expect(auditEvents.value).toEqual([]);
                expect(auditTotal.value).toBe(0);
                // No pages rather than one empty one: the pager hides itself below two.
                expect(auditPages.value).toBe(0);
            });
        });

        it('falls back to an empty page when the call fails', () => {
            vi.mocked(getObservabilityAuditLogs).mockRejectedValueOnce(
                apiFailure(500, 'Audit store unavailable')
            );
            const { auditEvents, auditTotal, auditPages, errorAudit, fetchAuditLogs } =
                useAdminObservability();

            return fetchAuditLogs().then(() => {
                // The panel renders "no events" rather than throwing on an undefined envelope
                expect(auditEvents.value).toEqual([]);
                expect(auditTotal.value).toBe(0);
                expect(auditPages.value).toBe(0);
                expect(errorAudit.value).toBe('Audit store unavailable');
            });
        });

        it('replaces the previous page rather than appending to it', () => {
            vi.mocked(getObservabilityAuditLogs).mockResolvedValueOnce({
                data: { items: [AUDIT_ITEM, AUDIT_ITEM], meta: meta(2) }
            } as never);
            const { auditEvents, auditTotal, fetchAuditLogs } = useAdminObservability();

            return fetchAuditLogs()
                .then(() => {
                    expect(auditTotal.value).toBe(2);
                    return fetchAuditLogs({ actor: 'ada@example.com' });
                })
                .then(() => {
                    expect(auditEvents.value).toEqual([AUDIT_ITEM]);
                    expect(auditTotal.value).toBe(1);
                });
        });
    });

    describe('fetchAll', () => {
        it('loads all three panels in one call', () => {
            const { health, metrics, auditEvents, auditTotal, fetchAll } = useAdminObservability();

            return expect(fetchAll())
                .resolves.toBeUndefined()
                .then(() => {
                    expect(getObservabilityHealth).toHaveBeenCalledTimes(1);
                    expect(getObservabilityMetricsOverview).toHaveBeenCalledTimes(1);
                    expect(getObservabilityAuditLogs).toHaveBeenCalledTimes(1);
                    expect(health.value).toEqual(HEALTH);
                    expect(metrics.value).toEqual(METRICS);
                    expect(auditEvents.value).toEqual([AUDIT_ITEM]);
                    expect(auditTotal.value).toBe(1);
                });
        });

        it('starts the three calls together rather than one after the other', () => {
            const { loadingHealth, loadingMetrics, loadingAudit, fetchAll } =
                useAdminObservability();

            const pending = fetchAll();
            expect(loadingHealth.value).toBe(true);
            expect(loadingMetrics.value).toBe(true);
            expect(loadingAudit.value).toBe(true);

            return pending.then(() => {
                expect(loadingHealth.value).toBe(false);
                expect(loadingMetrics.value).toBe(false);
                expect(loadingAudit.value).toBe(false);
            });
        });

        it('renders the panels that answered when one endpoint is down', () => {
            vi.mocked(getObservabilityMetricsOverview).mockRejectedValueOnce(
                apiFailure(502, 'Metrics upstream refused')
            );
            const { health, metrics, errorMetrics, auditEvents, fetchAll } =
                useAdminObservability();

            return expect(fetchAll())
                .resolves.toBeUndefined()
                .then(() => {
                    expect(errorMetrics.value).toBe('Metrics upstream refused');
                    expect(metrics.value).toBeUndefined();
                    expect(health.value).toEqual(HEALTH);
                    expect(auditEvents.value).toEqual([AUDIT_ITEM]);
                });
        });
    });

    /*
     * The one WRITE on this composable, and the only one that rejects: the view owes the visitor
     * an answer either way, so the rejection is passed through rather than swallowed into an
     * `error` ref like the three reads. What the composable does own is the pending flag, which
     * the view binds to the button and never sets — so both halves are asserted here.
     */
    describe('clearExpiredTokens', () => {
        it('flags the purge as pending while the call is in flight', () => {
            const { clearingExpiredTokens, clearExpiredTokens } = useAdminObservability();

            const pending = clearExpiredTokens();
            expect(clearingExpiredTokens.value).toBe(true);

            return pending.then(() => {
                expect(clearingExpiredTokens.value).toBe(false);
            });
        });

        it('resolves with nothing, so the view answers with its own copy', () => {
            const { clearExpiredTokens } = useAdminObservability();

            return expect(clearExpiredTokens())
                .resolves.toBeUndefined()
                .then(() => {
                    expect(deleteExpiredTokens).toHaveBeenCalledTimes(1);
                });
        });

        it('rejects on failure rather than swallowing it into an error ref', () => {
            vi.mocked(deleteExpiredTokens).mockRejectedValueOnce('down');
            const { clearingExpiredTokens, clearExpiredTokens } = useAdminObservability();

            return expect(clearExpiredTokens())
                .rejects.toBe('down')
                .then(() => {
                    // `.finally`, not `.then` — a failed purge must not leave the button spinning.
                    expect(clearingExpiredTokens.value).toBe(false);
                });
        });
    });
});
