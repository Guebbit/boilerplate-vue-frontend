/**
 * @module
 * `AdminAuditTab.vue` — the self-fetching part `use-audit-trail.spec.ts` does not cover: that
 * mounting the component fires the initial load, that its `target` prop reaches the request, and
 * that the filter form's search re-fetches through the same `endpoint`.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { getObservabilityAuditLogs, listAuditEntries } from '@api';
import * as schemas from '@api/schemas';
import AdminAuditTab from '@/modules/observability/components/AdminAuditTab.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { contractResponse } from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

/** An empty audit page, the answer both audit endpoints give by default. */
const EMPTY_PAGE = { items: [], meta: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 } };

vi.mock('@api', () => ({
    getObservabilityAuditLogs: vi.fn(() =>
        Promise.resolve(contractResponse(schemas.GetObservabilityAuditLogsResponse, EMPTY_PAGE))
    ),
    listAuditEntries: vi.fn(() =>
        Promise.resolve(contractResponse(schemas.ListAuditEntriesResponse, EMPTY_PAGE))
    )
}));

/** Mounts the audit tab for the platform or the shop trail, optionally filtered to one target. */
const mountTab = (props: { endpoint: 'platform' | 'shop'; target?: string }) =>
    mount(AdminAuditTab, { props, global: { plugins: [vuetify, i18n] } });

beforeEach(() => {
    vi.clearAllMocks();
    return loadLocale('en');
});

describe('endpoint selection', () => {
    it('reads GET /observability/audit for the platform endpoint, on mount', () => {
        mountTab({ endpoint: 'platform' });

        return flushPromises().then(() => {
            expect(getObservabilityAuditLogs).toHaveBeenCalledTimes(1);
            expect(listAuditEntries).not.toHaveBeenCalled();
        });
    });

    it('reads GET /audit for the shop endpoint, on mount', () => {
        mountTab({ endpoint: 'shop' });

        return flushPromises().then(() => {
            expect(listAuditEntries).toHaveBeenCalledTimes(1);
            expect(getObservabilityAuditLogs).not.toHaveBeenCalled();
        });
    });

    it('merges a fixed target into the shop request', () => {
        mountTab({ endpoint: 'shop', target: 'o1' });

        return flushPromises().then(() => {
            expect(listAuditEntries).toHaveBeenCalledWith(
                expect.objectContaining({ target: 'o1' })
            );
        });
    });
});

describe('the filter form', () => {
    it('re-fetches through the same endpoint when the search is submitted', () => {
        const wrapper = mountTab({ endpoint: 'shop' });

        return flushPromises()
            .then(() => {
                vi.mocked(listAuditEntries).mockClear();
                return wrapper.get('input[type=text]').setValue('ada@example.com');
            })
            .then(() => wrapper.get('form').trigger('submit'))
            .then(() => flushPromises())
            .then(() => {
                expect(listAuditEntries).toHaveBeenCalledWith(
                    expect.objectContaining({ actor: 'ada@example.com', page: 1 })
                );
            });
    });
});
