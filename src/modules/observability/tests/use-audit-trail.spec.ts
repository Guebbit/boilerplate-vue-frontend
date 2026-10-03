/**
 * @module
 * Unit tests for `useAuditTrail` — the fetcher `AdminAuditTab.vue` drives for all three audit
 * surfaces. What is worth pinning: which contract call each `endpoint` reaches, that `target` is
 * merged into every `shop` request and never sent to `platform` (whose contract declares no such
 * filter), that the envelope splits into rows/total/pages rather than tracked state that could
 * disagree, and that a dead endpoint degrades to `error` instead of rejecting.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getObservabilityAuditLogs, listAuditEntries } from '@api';
import type { AuditEntryItem, AuditEventItem } from '@api';
import * as schemas from '@api/schemas';
import { useAuditTrail } from '@/modules/observability/composables/use-audit-trail.ts';
import { contractResponse } from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

/** A page's worth of meta, as `PaginationMeta` declares it. */
const meta = (totalItems: number, totalPages = 1, page = 1, pageSize = 50) => ({
    page,
    pageSize,
    totalItems,
    totalPages
});

/** One platform-trail row exactly as `AuditEventItem` declares it. */
const EVENT_ITEM: AuditEventItem = {
    actor_user_id: 'ada@example.com',
    actor_role: 'admin',
    action: 'user.login',
    outcome: 'success',
    timestamp: '2026-01-01T00:00:00.000Z',
    level: 'info'
};

/** One shop-trail row exactly as `AuditEntryItem` declares it. */
const ENTRY_ITEM: AuditEntryItem = {
    actor_user_id: 'ada@example.com',
    actor_role: 'admin',
    action: 'order.created',
    outcome: 'success',
    target_type: 'Order',
    target_id: 'o1',
    timestamp: '2026-01-01T00:00:00.000Z',
    level: 'info'
};

vi.mock('@api', () => ({
    getObservabilityAuditLogs: vi.fn(() =>
        Promise.resolve(
            contractResponse(schemas.GetObservabilityAuditLogsResponse, {
                items: [EVENT_ITEM],
                meta: meta(1)
            })
        )
    ),
    listAuditEntries: vi.fn(() =>
        Promise.resolve(
            contractResponse(schemas.ListAuditEntriesResponse, {
                items: [ENTRY_ITEM],
                meta: meta(1)
            })
        )
    )
}));

/** Builds the reject envelope the API sends for a failed call. */
const apiFailure = (status: number, message: string) => ({
    success: false,
    status,
    message,
    errors: [{ code: 'STUB_ERROR', message }]
});

beforeEach(() => vi.clearAllMocks());

describe('useAuditTrail — platform endpoint', () => {
    it('reads GET /observability/audit and splits the envelope', () => {
        const { entries, total, pages, fetchPage } = useAuditTrail('platform');

        return fetchPage().then(() => {
            expect(getObservabilityAuditLogs).toHaveBeenCalledTimes(1);
            expect(listAuditEntries).not.toHaveBeenCalled();
            expect(entries.value).toEqual([EVENT_ITEM]);
            expect(total.value).toBe(1);
            expect(pages.value).toBe(1);
        });
    });

    it('never sends a target filter — the contract declares none', () => {
        const { fetchPage } = useAuditTrail('platform', 'some-user-id');

        return fetchPage().then(() => {
            expect(getObservabilityAuditLogs).toHaveBeenCalledWith(
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Vitest types `expect.anything()` as `any`, since it is a placeholder matcher usable against anything
                expect.not.objectContaining({ target: expect.anything() })
            );
        });
    });

    it('sends every filter through under its contract name', () =>
        useAuditTrail('platform')
            .fetchPage({
                actor: 'ada@example.com',
                action: 'user.login',
                outcome: 'failure',
                since: '2026-01-01T00:00:00.000Z',
                page: 3,
                pageSize: 25
            })
            .then(() => {
                expect(getObservabilityAuditLogs).toHaveBeenCalledWith({
                    actor: 'ada@example.com',
                    action: 'user.login',
                    outcome: 'failure',
                    since: '2026-01-01T00:00:00.000Z',
                    page: 3,
                    pageSize: 25
                });
            }));

    it('converts a datetime-local `since` (no timezone) into a real ISO instant', () =>
        // What a `<input type="datetime-local">` actually yields — no `Z`, no offset — which the
        // contract's `since` schema rejects outright.
        useAuditTrail('platform')
            .fetchPage({ since: '2026-09-24T10:00' })
            .then(() => {
                expect(getObservabilityAuditLogs).toHaveBeenCalledWith(
                    expect.objectContaining({
                        since: new Date('2026-09-24T10:00').toISOString()
                    })
                );
            }));

    it('falls back to an empty page when the call fails', () => {
        vi.mocked(getObservabilityAuditLogs).mockRejectedValueOnce(
            apiFailure(500, 'Audit store unavailable')
        );
        const { entries, total, pages, error, fetchPage } = useAuditTrail('platform');

        return fetchPage().then(() => {
            expect(entries.value).toEqual([]);
            expect(total.value).toBe(0);
            expect(pages.value).toBe(0);
            expect(error.value).toBe('Audit store unavailable');
        });
    });
});

describe('useAuditTrail — shop endpoint', () => {
    it('reads GET /audit and splits the envelope', () => {
        const { entries, total, pages, fetchPage } = useAuditTrail('shop');

        return fetchPage().then(() => {
            expect(listAuditEntries).toHaveBeenCalledTimes(1);
            expect(getObservabilityAuditLogs).not.toHaveBeenCalled();
            expect(entries.value).toEqual([ENTRY_ITEM]);
            expect(total.value).toBe(1);
            expect(pages.value).toBe(1);
        });
    });

    it("merges the fixed target into every request, for one record's history", () => {
        const { fetchPage } = useAuditTrail('shop', 'o1');

        return fetchPage({ actor: 'ada@example.com' }).then(() => {
            expect(listAuditEntries).toHaveBeenCalledWith(
                expect.objectContaining({ target: 'o1', actor: 'ada@example.com' })
            );
        });
    });

    it('asks for the whole shop trail when no target is fixed', () => {
        const { fetchPage } = useAuditTrail('shop');

        return fetchPage().then(() => {
            expect(listAuditEntries).toHaveBeenCalledWith(
                expect.objectContaining({ target: undefined })
            );
        });
    });
});
