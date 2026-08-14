/**
 * Unit tests for the Admin dashboard's data composable.
 *
 * The three endpoints are mocked at `@api`: what this file owns is the composition — that each
 * fetcher writes its own slice of state without touching the other two, that the audit envelope is
 * split into items and total rather than tracked as state that could disagree, and that a dead
 * endpoint degrades to an error message beside the panels that did answer.
 *
 * The loading/error bookkeeping itself belongs to `useAsyncAction` and is covered in
 * `tests/unit/infrastructure/useAsyncAction.spec.ts`; only the parts this composable configures —
 * the fallback messages and the filter payload — are asserted here.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getObservabilityHealth,
    getObservabilityMetricsOverview,
    getObservabilityAuditLogs
} from '@api';
import { useAdminObservability } from '@/modules/admin/composables/useAdminObservability';

const HEALTH = { status: 'ok', uptimeSeconds: 120 };
const METRICS = { totalRequests: 42, totalErrors: 1 };
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
        Promise.resolve({ data: { items: [AUDIT_ITEM], total: 1 } })
    )
}));

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
            expect(observability.errorHealth.value).toBeUndefined();
            expect(observability.errorMetrics.value).toBeUndefined();
            expect(observability.errorAudit.value).toBeUndefined();
        });
    });

    describe('fetchHealth', () => {
        it('unwraps the response body into health', async () => {
            const { health, fetchHealth } = useAdminObservability();

            await expect(fetchHealth()).resolves.toBeUndefined();

            expect(getObservabilityHealth).toHaveBeenCalledTimes(1);
            expect(health.value).toEqual(HEALTH);
        });

        it('is loading while the call is in flight', async () => {
            const { loadingHealth, fetchHealth } = useAdminObservability();

            const pending = fetchHealth();
            expect(loadingHealth.value).toBe(true);

            await pending;
            expect(loadingHealth.value).toBe(false);
        });

        it('reports its own failure without rejecting or touching the other panels', async () => {
            vi.mocked(getObservabilityHealth).mockRejectedValueOnce('down');
            const { health, errorHealth, errorMetrics, errorAudit, fetchHealth } =
                useAdminObservability();

            await expect(fetchHealth()).resolves.toBeUndefined();

            expect(errorHealth.value).toBe('Failed to load health data');
            expect(health.value).toBeUndefined();
            expect(errorMetrics.value).toBeUndefined();
            expect(errorAudit.value).toBeUndefined();
        });
    });

    describe('fetchMetrics', () => {
        it('unwraps the response body into metrics', async () => {
            const { metrics, fetchMetrics } = useAdminObservability();

            await fetchMetrics();

            expect(getObservabilityMetricsOverview).toHaveBeenCalledTimes(1);
            expect(metrics.value).toEqual(METRICS);
        });

        it('carries its own fallback message', async () => {
            vi.mocked(getObservabilityMetricsOverview).mockRejectedValueOnce('down');
            const { errorMetrics, fetchMetrics } = useAdminObservability();

            await fetchMetrics();

            expect(errorMetrics.value).toBe('Failed to load metrics data');
        });
    });

    describe('fetchAuditLogs', () => {
        it('splits the envelope into items and total', async () => {
            const { auditEvents, auditTotal, fetchAuditLogs } = useAdminObservability();

            await expect(fetchAuditLogs()).resolves.toBeUndefined();

            expect(auditEvents.value).toEqual([AUDIT_ITEM]);
            expect(auditTotal.value).toBe(1);
        });

        it('sends every filter through under its contract name', async () => {
            const { fetchAuditLogs } = useAdminObservability();

            await fetchAuditLogs({
                actor: 'ada@example.com',
                action: 'user.login',
                outcome: 'failure',
                since: '2026-01-01T00:00:00.000Z',
                limit: 25
            });

            expect(getObservabilityAuditLogs).toHaveBeenCalledWith({
                actor: 'ada@example.com',
                action: 'user.login',
                outcome: 'failure',
                since: '2026-01-01T00:00:00.000Z',
                limit: 25
            });
        });

        it('asks for everything when called with no filters', async () => {
            const { fetchAuditLogs } = useAdminObservability();

            await fetchAuditLogs();

            expect(getObservabilityAuditLogs).toHaveBeenCalledWith({
                actor: undefined,
                action: undefined,
                outcome: undefined,
                since: undefined,
                limit: undefined
            });
        });

        it('reads an empty page as no events and a zero total', async () => {
            vi.mocked(getObservabilityAuditLogs).mockResolvedValueOnce({
                data: { items: [], total: 0 }
            } as never);
            const { auditEvents, auditTotal, fetchAuditLogs } = useAdminObservability();

            await fetchAuditLogs();

            expect(auditEvents.value).toEqual([]);
            expect(auditTotal.value).toBe(0);
        });

        it('falls back to an empty page when the call fails', async () => {
            vi.mocked(getObservabilityAuditLogs).mockRejectedValueOnce('down');
            const { auditEvents, auditTotal, errorAudit, fetchAuditLogs } = useAdminObservability();

            await fetchAuditLogs();

            // The panel renders "no events" rather than throwing on an undefined envelope
            expect(auditEvents.value).toEqual([]);
            expect(auditTotal.value).toBe(0);
            expect(errorAudit.value).toBe('Failed to load audit logs');
        });

        it('replaces the previous page rather than appending to it', async () => {
            vi.mocked(getObservabilityAuditLogs).mockResolvedValueOnce({
                data: { items: [AUDIT_ITEM, AUDIT_ITEM], total: 2 }
            } as never);
            const { auditEvents, auditTotal, fetchAuditLogs } = useAdminObservability();

            await fetchAuditLogs();
            expect(auditTotal.value).toBe(2);

            await fetchAuditLogs({ actor: 'ada@example.com' });
            expect(auditEvents.value).toEqual([AUDIT_ITEM]);
            expect(auditTotal.value).toBe(1);
        });
    });

    describe('fetchAll', () => {
        it('loads all three panels in one call', async () => {
            const { health, metrics, auditEvents, auditTotal, fetchAll } = useAdminObservability();

            await expect(fetchAll()).resolves.toBeUndefined();

            expect(getObservabilityHealth).toHaveBeenCalledTimes(1);
            expect(getObservabilityMetricsOverview).toHaveBeenCalledTimes(1);
            expect(getObservabilityAuditLogs).toHaveBeenCalledTimes(1);
            expect(health.value).toEqual(HEALTH);
            expect(metrics.value).toEqual(METRICS);
            expect(auditEvents.value).toEqual([AUDIT_ITEM]);
            expect(auditTotal.value).toBe(1);
        });

        it('starts the three calls together rather than one after the other', async () => {
            const { loadingHealth, loadingMetrics, loadingAudit, fetchAll } =
                useAdminObservability();

            const pending = fetchAll();
            expect(loadingHealth.value).toBe(true);
            expect(loadingMetrics.value).toBe(true);
            expect(loadingAudit.value).toBe(true);

            await pending;
            expect(loadingHealth.value).toBe(false);
            expect(loadingMetrics.value).toBe(false);
            expect(loadingAudit.value).toBe(false);
        });

        it('renders the panels that answered when one endpoint is down', async () => {
            vi.mocked(getObservabilityMetricsOverview).mockRejectedValueOnce('down');
            const { health, metrics, errorMetrics, auditEvents, fetchAll } =
                useAdminObservability();

            await expect(fetchAll()).resolves.toBeUndefined();

            expect(errorMetrics.value).toBe('Failed to load metrics data');
            expect(metrics.value).toBeUndefined();
            expect(health.value).toEqual(HEALTH);
            expect(auditEvents.value).toEqual([AUDIT_ITEM]);
        });
    });
});
