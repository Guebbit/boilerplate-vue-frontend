/**
 * @module
 * `AdminAuditTab.vue` — the self-fetching part `use-audit-trail.spec.ts` does not cover: that
 * mounting the component fires the initial load, that its `target` prop reaches the request, and
 * that the filter form's search re-fetches through the same `endpoint`.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import { listObservabilityAuditEntries, listAuditEntries } from '@api';
import * as schemas from '@api/schemas';
import AdminAuditTab from '../components/AdminAuditTab.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    contractBody,
    contractResponse
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

/** An empty audit page, the answer both audit endpoints give by default. */
const EMPTY_PAGE = { items: [], meta: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 } };

// Partial: the component also reads the contract's `ListAuditEntriesOutcome` object at runtime.
vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@api')>()),
    listObservabilityAuditEntries: vi.fn(() =>
        Promise.resolve(contractResponse(schemas.ListObservabilityAuditEntriesResponse, EMPTY_PAGE))
    ),
    listAuditEntries: vi.fn(() =>
        Promise.resolve(contractResponse(schemas.ListAuditEntriesResponse, EMPTY_PAGE))
    )
}));

/** Memory-history router carrying the real module routes, so a target can link to its page. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/** Mounts the audit tab for the platform or the shop trail, optionally filtered to one target. */
const mountTab = (props: { endpoint: 'platform' | 'shop'; target?: string }) => {
    // The copy buttons toast through the notifications store, which needs an active Pinia.
    const pinia = createPinia();
    setActivePinia(pinia);
    return mount(AdminAuditTab, { props, global: { plugins: [vuetify, i18n, pinia, router] } });
};

beforeEach(() => {
    vi.clearAllMocks();
    // The tab writes its state into the current route's query, so a real route must be current.
    return router.push('/en/audit').then(() => loadLocale('en'));
});

describe('endpoint selection', () => {
    it('reads GET /observability/audit for the platform endpoint, on mount', () => {
        mountTab({ endpoint: 'platform' });

        return flushPromises().then(() => {
            expect(listObservabilityAuditEntries).toHaveBeenCalledTimes(1);
            expect(listAuditEntries).not.toHaveBeenCalled();
        });
    });

    it('reads GET /audit for the shop endpoint, on mount', () => {
        mountTab({ endpoint: 'shop' });

        return flushPromises().then(() => {
            expect(listAuditEntries).toHaveBeenCalledTimes(1);
            expect(listObservabilityAuditEntries).not.toHaveBeenCalled();
        });
    });

    it('starts the shop request on the target it was given', () => {
        mountTab({ endpoint: 'shop', target: 'o1' });

        return flushPromises().then(() => {
            expect(listAuditEntries).toHaveBeenCalledWith(
                expect.objectContaining({ target: 'o1' })
            );
        });
    });

    it('ignores a target on the platform trail, whose contract has no such filter', () => {
        const wrapper = mountTab({ endpoint: 'platform', target: 'o1' });

        return flushPromises().then(() => {
            expect(listObservabilityAuditEntries).toHaveBeenCalledWith(
                expect.not.objectContaining({ target: 'o1' })
            );
            expect(wrapper.find('[data-test=filter-target]').exists()).toBe(false);
            expect(wrapper.find('[data-test=filter-own-order]').exists()).toBe(false);
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

describe('the target and own-order filters (shop trail)', () => {
    it('lets the pre-filled target be edited, then searches on the new one', () => {
        const wrapper = mountTab({ endpoint: 'shop', target: 'o1' });

        return flushPromises()
            .then(() => {
                expect(wrapper.get('[data-test=filter-target] input').element).toHaveProperty(
                    'value',
                    'o1'
                );
                vi.mocked(listAuditEntries).mockClear();
                return wrapper.get('[data-test=filter-target] input').setValue('u7');
            })
            .then(() => wrapper.get('form').trigger('submit'))
            .then(() => flushPromises())
            .then(() => {
                expect(listAuditEntries).toHaveBeenCalledWith(
                    expect.objectContaining({ target: 'u7', page: 1 })
                );
            });
    });

    it('sends ownOrder=true once the box is ticked', () => {
        const wrapper = mountTab({ endpoint: 'shop' });

        return flushPromises()
            .then(() => {
                vi.mocked(listAuditEntries).mockClear();
                return wrapper.get('[data-test=filter-own-order] input').setValue(true);
            })
            .then(() => wrapper.get('form').trigger('submit'))
            .then(() => flushPromises())
            .then(() => {
                expect(listAuditEntries).toHaveBeenCalledWith(
                    expect.objectContaining({ ownOrder: true })
                );
            });
    });

    it('clears both on reset', () => {
        const wrapper = mountTab({ endpoint: 'shop', target: 'o1' });

        return flushPromises()
            .then(() => {
                vi.mocked(listAuditEntries).mockClear();
                return wrapper.get('[data-test=filter-own-order] input').setValue(true);
            })
            .then(() => wrapper.get('[data-test=search-reset]').trigger('click'))
            .then(() => flushPromises())
            .then(() => {
                expect(listAuditEntries).toHaveBeenLastCalledWith(
                    expect.objectContaining({ target: undefined, ownOrder: undefined })
                );
            });
    });
});

/** One row on `targetType`/`targetId`, with the fields the table needs. */
const rowOn = (targetType?: string, targetId?: string) => ({
    actorUserId: 'u1',
    actorRole: 'admin',
    actorScope: 'tenant',
    action: 'admin.order.shipped',
    outcome: 'success',
    timestamp: '2026-10-18T08:00:00.000Z',
    level: 'info',
    targetType,
    targetId
});

/** Mounts the shop trail answering `items`. */
const mountWith = (items: ReturnType<typeof rowOn>[]) => {
    vi.mocked(listAuditEntries).mockResolvedValueOnce(
        contractBody<Awaited<ReturnType<typeof listAuditEntries>>>(
            schemas.ListAuditEntriesResponse,
            {
                items,
                meta: { page: 1, pageSize: 50, totalItems: items.length, totalPages: 1 }
            }
        )
    );
    return mountTab({ endpoint: 'shop' });
};

describe('the target column', () => {
    it('shows the type and a short id, linked to the page of a record that has one', () => {
        const wrapper = mountWith([rowOn('order', '6adc83737c230dfde46df72f')]);

        return flushPromises().then(() => {
            const cell = wrapper.get('[data-test=audit-target]');
            expect(cell.text()).toBe('order 6adc8373');
            expect(cell.element.tagName).toBe('A');
            expect(cell.attributes('href')).toBe('/en/orders/6adc83737c230dfde46df72f');
        });
    });

    it('shows plain text for a target type with no page, and a dash for no target', () => {
        const wrapper = mountWith([rowOn('api_key', 'k1234567890'), rowOn()]);

        return flushPromises().then(() => {
            const cells = wrapper.findAll('[data-test=audit-target]');
            expect(cells).toHaveLength(1);
            expect(cells[0]?.element.tagName).toBe('SPAN');
            expect(cells[0]?.text()).toBe('api_key k1234567');
        });
    });
});

describe('the correlation ids', () => {
    /** An audit row carrying ids longer than the 8 characters the cell shows. */
    const ROW = {
        actorUserId: 'u1',
        actorRole: 'admin',
        actorScope: 'tenant',
        action: 'orders.update',
        outcome: 'success',
        timestamp: '2026-10-18T08:00:00.000Z',
        level: 'info',
        requestId: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
        traceId: '0123456789abcdef0123456789abcdef'
    };

    it('gives each id a copy button that names the full id, and puts no title on the cell', () => {
        vi.mocked(listAuditEntries).mockResolvedValueOnce(
            contractBody<Awaited<ReturnType<typeof listAuditEntries>>>(
                schemas.ListAuditEntriesResponse,
                {
                    items: [ROW],
                    meta: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 }
                }
            )
        );
        const wrapper = mountTab({ endpoint: 'shop' });

        return flushPromises().then(() => {
            expect(wrapper.get('[data-test=audit-copy-requestId]').attributes('aria-label')).toBe(
                'Copy request ID 0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'
            );
            expect(wrapper.get('[data-test=audit-copy-traceId]').attributes('aria-label')).toBe(
                'Copy trace ID 0123456789abcdef0123456789abcdef'
            );
            expect(wrapper.find('[title]').exists()).toBe(false);
        });
    });
});

/** An audit row of a refund, with or without the flag a staff member handling their own order earns. */
const refundRow = (metadata: Record<string, unknown>) => ({
    actorUserId: 'u1',
    actorRole: 'admin',
    actorScope: 'tenant',
    action: 'admin.payment.refunded',
    outcome: 'success',
    timestamp: '2026-10-18T08:00:00.000Z',
    level: 'info',
    metadata
});

describe('own money', () => {
    it('badges a row whose metadata says ownOrder, and no other', () => {
        vi.mocked(listAuditEntries).mockResolvedValueOnce(
            contractBody<Awaited<ReturnType<typeof listAuditEntries>>>(
                schemas.ListAuditEntriesResponse,
                {
                    items: [refundRow({ ownOrder: true }), refundRow({ amount: 5 })],
                    meta: { page: 1, pageSize: 50, totalItems: 2, totalPages: 1 }
                }
            )
        );
        const wrapper = mountTab({ endpoint: 'shop' });

        return flushPromises().then(() => {
            expect(wrapper.findAll('[data-test=audit-own-order]')).toHaveLength(1);
            expect(wrapper.get('[data-test=audit-own-order]').text()).toBe('Own order');
        });
    });
});

describe('list state in the URL', () => {
    it('opens on the filters and page its link names', () => {
        return router
            .push('/en/audit?audit-actor=ada&audit-page=3&audit-pageSize=20')
            .then(() => {
                mountTab({ endpoint: 'platform' });
                return flushPromises();
            })
            .then(() => {
                expect(listObservabilityAuditEntries).toHaveBeenCalledWith(
                    expect.objectContaining({ actor: 'ada', page: 3, pageSize: 20 })
                );
            });
    });
});
