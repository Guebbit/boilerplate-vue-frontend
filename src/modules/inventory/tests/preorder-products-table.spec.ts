/**
 * @module
 * `PreorderProductsTable.vue` — the board's first tab. The two reads are answered at the transport;
 * what is covered is the join on screen: the allowance's numbers, the state counts (only the
 * non-zero ones), the "fulfillment orders" hand-off, and the release-date link offered only to a
 * holder of the product write.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import PreorderProductsTable from '../components/PreorderProductsTable.vue';
import { useSessionStore } from '@/infrastructure/session.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aPreorderLevel, aPreorderSummary } from '../../../../tests/support/unit/fixtures.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';
import type { PreorderLevel, PreorderProductSummary } from '@types';

wireModulesIntoCore();

/**
 * What the two reads answer, per URL; set by each case. The transport is the seam: the allowance
 * is this module's own read and the counts come through `delivery`'s barrel, so neither store is
 * reached into from here.
 */
let answers: { '/inventory/preorders': unknown; '/delivery/fulfillment-orders/summary': unknown };

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: keyof typeof answers }) =>
        Promise.resolve(parseOrvalFixture('GET', config.url, answers[config.url]))
    )
}));

/** The real route tree, so the product edit link resolves. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Mounts the table over what the two stubbed reads will answer.
 *
 * @param levels - The allowances.
 * @param summaries - The units by state.
 * @param abilities - What the viewer may do.
 */
const mountTable = (
    levels: PreorderLevel[],
    summaries: PreorderProductSummary[],
    abilities: [string, string][] = []
) => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'staff@example.com', role: 'admin' };
    session.setAbilities({ tenant: abilities, platform: [] });
    answers = {
        '/inventory/preorders': orvalEnvelope({
            items: levels,
            meta: { page: 1, pageSize: 100, totalItems: levels.length, totalPages: 1 }
        }),
        '/delivery/fulfillment-orders/summary': orvalEnvelope({
            items: summaries,
            meta: { page: 1, pageSize: 100, totalItems: summaries.length, totalPages: 1 }
        })
    };
    const wrapper = mount(PreorderProductsTable, { global: { plugins: [router, vuetify, i18n] } });
    return flushPromises().then(() => wrapper);
};

beforeEach(() => {
    setActivePinia(createPinia());
    return router.push('/en/sales/preorders').then(() => loadLocale('en'));
});

describe('PreorderProductsTable', () => {
    it('shows the allowance: limit, outstanding with its split, and what is left', () =>
        mountTable([aPreorderLevel()], [aPreorderSummary()]).then((wrapper) => {
            const row = wrapper.get('[data-test=preorder-product-row]');

            expect(row.text()).toContain('Walnut desk');
            expect(row.get('[data-test=preorder-outstanding]').text()).toBe('4');
            expect(row.text()).toContain('1 unpaid, 3 paid');
            expect(row.text()).toContain('10');
        }));

    it('shows only the states that hold units, the late ones flagged', () =>
        mountTable(
            [aPreorderLevel()],
            [aPreorderSummary({ waiting: 2, awaitingYes: 1, late: 1, shipped: 0 })]
        ).then((wrapper) => {
            const counts = wrapper
                .findAll('[data-count]')
                .map((chip) => [chip.attributes('data-count'), chip.text()]);

            expect(counts).toEqual([
                ['waiting', '2 waiting'],
                ['awaitingYes', '1 awaiting an answer'],
                ['late', '1 late']
            ]);
        }));

    it('lists a product that was sold but has no allowance row, with dashes for the allowance', () =>
        mountTable([], [aPreorderSummary({ productId: 'p9', title: 'Old poster' })]).then(
            (wrapper) => {
                const row = wrapper.get('[data-test=preorder-product-row]');

                expect(row.text()).toContain('Old poster');
                expect(row.find('[data-test=preorder-outstanding]').exists()).toBe(false);
            }
        ));

    it('says so when nothing was ever sold as a preorder', () =>
        mountTable([], []).then((wrapper) => {
            expect(wrapper.text()).toContain('Nothing has been sold as a preorder yet.');
        }));

    it('hands the product to the second tab', () =>
        mountTable([aPreorderLevel({ productId: 'p1', title: 'Desk' })], []).then((wrapper) =>
            wrapper
                .get('[data-test=preorder-show-orders]')
                .trigger('click')
                .then(() => {
                    expect(wrapper.emitted('showOrders')).toEqual([['p1', 'Desk']]);
                })
        ));

    it('offers the release-date link to a holder of the product write only', () =>
        mountTable([aPreorderLevel({ productId: 'p1' })], [], [['update', 'Product']])
            .then((writer) => {
                expect(writer.get('[data-test=preorder-move-date]').attributes('href')).toBe(
                    '/en/products/p1/edit'
                );
                setActivePinia(createPinia());
                return mountTable([aPreorderLevel({ productId: 'p1' })], []);
            })
            .then((reader) => {
                expect(reader.find('[data-test=preorder-move-date]').exists()).toBe(false);
            }));
});
