/**
 * @module
 * `PreorderFulfillmentTable.vue` — the board's second tab. The store's read is spied; covered is
 * what it asks the server for (the Late and Due-soon filters are the server's rules, passed through,
 * never recomputed) and what each row says: state, late flag, slip, deadline, who cancelled.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import PreorderFulfillmentTable from '../components/PreorderFulfillmentTable.vue';
import { useDeliveryStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aPreorderFulfillmentOrder } from '../../../../tests/support/unit/fixtures.ts';
import type { PreorderFulfillmentOrder } from '@types';

wireModulesIntoCore();

/** The real route tree, so an order link resolves. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Mounts the table over the rows the spied read will answer.
 *
 * @param rows - The page.
 * @param props - The product filter the page would hand down.
 * @returns The wrapper and the spied read.
 */
const mountTable = (
    rows: PreorderFulfillmentOrder[],
    props: { productId?: string; productLabel?: string } = {}
) => {
    const store = useDeliveryStore();
    const read = vi.spyOn(store, 'fetchPreorderBoard').mockImplementation(() => {
        store.preorderBoard = rows;
        store.preorderBoardTotal = rows.length;
        return Promise.resolve(rows);
    });
    const wrapper = mount(PreorderFulfillmentTable, {
        props,
        global: { plugins: [router, vuetify, i18n] }
    });
    return flushPromises().then(() => ({ wrapper, read }));
};

beforeEach(() => {
    setActivePinia(createPinia());
    return router.push('/en/sales/preorders').then(() => loadLocale('en'));
});

describe('what the table asks for', () => {
    it('reads the first page with no filter at all', () =>
        mountTable([aPreorderFulfillmentOrder()]).then(({ read }) => {
            expect(read).toHaveBeenCalledTimes(1);
            expect(read).toHaveBeenLastCalledWith({
                page: 1,
                pageSize: 10,
                state: undefined,
                productId: undefined,
                late: undefined,
                dueWithin: undefined
            });
        }));

    it('asks for the Late view when the switch is on', () =>
        mountTable([aPreorderFulfillmentOrder()]).then(({ wrapper, read }) =>
            wrapper
                .get('[data-test=preorder-filter-late] input')
                .setValue(true)
                .then(flushPromises)
                .then(() => {
                    expect(read).toHaveBeenLastCalledWith(expect.objectContaining({ late: true }));
                })
        ));

    it('asks for what is due within a week when the Due-soon switch is on', () =>
        mountTable([aPreorderFulfillmentOrder()]).then(({ wrapper, read }) =>
            wrapper
                .get('[data-test=preorder-filter-due-soon] input')
                .setValue(true)
                .then(flushPromises)
                .then(() => {
                    expect(read).toHaveBeenLastCalledWith(
                        expect.objectContaining({ dueWithin: 7 })
                    );
                })
        ));

    it('narrows to the product the page hands down, and lets it go again', () =>
        mountTable([aPreorderFulfillmentOrder()], {
            productId: 'p1',
            productLabel: 'Walnut desk'
        }).then(({ wrapper, read }) => {
            expect(read).toHaveBeenLastCalledWith(expect.objectContaining({ productId: 'p1' }));
            expect(wrapper.get('[data-test=preorder-filter-product]').text()).toContain(
                'Walnut desk'
            );

            return wrapper
                .get('[data-test=preorder-filter-product] .v-chip__close')
                .trigger('click')
                .then(() => {
                    expect(wrapper.emitted('clearProduct')).toHaveLength(1);
                });
        }));
});

describe('what a row says', () => {
    it('names the order, the buyer and the lines, and links the order', () =>
        mountTable([aPreorderFulfillmentOrder({ orderId: 'o7', orderNumber: '2027-000007' })]).then(
            ({ wrapper }) => {
                const row = wrapper.get('[data-test=preorder-order-row]');

                expect(row.get('[data-test=preorder-order-link]').attributes('href')).toBe(
                    '/en/orders/o7'
                );
                expect(row.text()).toContain('buyer@example.com');
                expect(row.text()).toContain('Walnut desk × 1');
                expect(row.get('[data-test=preorder-state]').text()).toBe('Waiting for stock');
            }
        ));

    it('flags a late row and shows how far it slipped', () =>
        mountTable([
            aPreorderFulfillmentOrder({
                late: true,
                slippedDays: 12,
                expectedAt: '2027-03-27T12:00:00.000Z'
            })
        ]).then(({ wrapper }) => {
            expect(wrapper.get('[data-test=preorder-late]').text()).toBe('Late');
            expect(wrapper.get('[data-test=preorder-slipped]').text()).toBe('+12 d');
        }));

    it('shows no slip and no late flag on a row that kept its date', () =>
        mountTable([aPreorderFulfillmentOrder()]).then(({ wrapper }) => {
            expect(wrapper.find('[data-test=preorder-late]').exists()).toBe(false);
            expect(wrapper.find('[data-test=preorder-slipped]').exists()).toBe(false);
        }));

    it('shows the deadline of an answer still owed', () =>
        mountTable([
            aPreorderFulfillmentOrder({
                state: 'awaiting_yes',
                consent: 'awaiting',
                consentDeadline: '2027-04-19T00:00:00.000Z'
            })
        ]).then(({ wrapper }) => {
            expect(wrapper.get('[data-test=preorder-state]').attributes('data-state')).toBe(
                'awaiting_yes'
            );
            expect(wrapper.get('[data-test=preorder-answer-by]').text()).toContain('Answer by');
        }));

    it('says who cancelled a cancelled one', () =>
        mountTable([
            aPreorderFulfillmentOrder({ state: 'cancelled', cancelReason: 'no_answer' })
        ]).then(({ wrapper }) => {
            expect(wrapper.get('[data-test=preorder-cancel-reason]').text()).toBe(
                'Cancelled: no answer'
            );
        }));

    it('says so when nothing matches', () =>
        mountTable([]).then(({ wrapper }) => {
            expect(wrapper.text()).toContain('No fulfillment orders match.');
        }));
});
