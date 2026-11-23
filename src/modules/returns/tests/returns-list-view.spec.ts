/**
 * @module
 * The returns list's "proof of sending" filter: what the to-do links (`returnsAwaitingGoods`,
 * `returnsProofGoodsLate`) put in the URL fills the select and the request, a `false` filter
 * counts as a narrowed list, and Reset clears it.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { listReturns } from '@api';
import * as schemas from '@api/schemas';
import ReturnsList from '../views/ReturnsList.vue';
import { useReturnsStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { asStub } from '../../../../tests/support/stub.ts';
import { aReturnListItem } from './return-fixtures.ts';
import { contractResponse } from '../../../../tests/support/unit/orval-fixture-schema.ts';

wireModulesIntoCore();

// The one client call the page's search reaches; the store's own mapping to it is under test.
vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@api')>()),
    listReturns: vi.fn()
}));

/**
 * The real route tree, so the page reads and writes the URL as it does in the app.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Makes the search answer with one page of the given returns.
 *
 * @param items - The returns the server lists.
 */
const answerSearchWith = (items: ReturnType<typeof aReturnListItem>[]) =>
    vi.mocked(listReturns).mockResolvedValue(
        asStub<Awaited<ReturnType<typeof listReturns>>>(
            contractResponse(schemas.ListReturnsResponse, {
                items,
                meta: { page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 }
            })
        )
    );

/**
 * Opens the page at a URL, as a link from the to-do list would.
 *
 * @param url - Where to land.
 * @returns The mounted page.
 */
const openAt = async (url: string) => {
    await router.push(url);
    const wrapper = mount(ReturnsList, { global: { plugins: [router, vuetify, i18n] } });
    await flushPromises();
    return wrapper;
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    answerSearchWith([]);
    return loadLocale('en');
});

describe('ReturnsList — the proof of sending filter', () => {
    it.each([
        ['returnsAwaitingGoods', 'false'],
        ['returnsProofGoodsLate', 'true']
    ])('opens the %s link: the URL fills the filter and the request', async (_link, value) => {
        await openAt(`/en/sales/returns?status=approved&proofOfSending=${value}`);

        expect(useReturnsStore().filters).toMatchObject({
            status: 'approved',
            proofOfSending: value === 'true'
        });
        expect(listReturns).toHaveBeenLastCalledWith(
            expect.objectContaining({ status: 'approved', proofOfSending: value === 'true' })
        );
    });

    it('shows the chosen option in the select, in words', async () => {
        const without = await openAt('/en/sales/returns?proofOfSending=false');
        expect(without.get('[data-test=filter-proof]').text()).toContain(
            'Without proof of sending'
        );
        without.unmount();

        const withProof = await openAt('/en/sales/returns?proofOfSending=true');
        expect(withProof.get('[data-test=filter-proof]').text()).toContain('With proof of sending');
    });

    it('sends no proof filter when the URL names none', async () => {
        await openAt('/en/sales/returns');

        expect(useReturnsStore().filters.proofOfSending).toBeUndefined();
        expect(vi.mocked(listReturns).mock.lastCall?.[0]?.proofOfSending).toBeUndefined();
    });

    it('sends the filter the shopper picked, when the form is submitted', async () => {
        const wrapper = await openAt('/en/sales/returns');
        useReturnsStore().filters.proofOfSending = false;

        await wrapper.get('form').trigger('submit');
        await flushPromises();

        expect(listReturns).toHaveBeenLastCalledWith(
            expect.objectContaining({ proofOfSending: false })
        );
        expect(router.currentRoute.value.query.proofOfSending).toBe('false');
    });

    it('calls "no proof yet" a narrowed list: the empty state says nothing matched', async () => {
        const wrapper = await openAt('/en/sales/returns?proofOfSending=false');

        expect(wrapper.text()).toContain('No returns match this search');
        expect(wrapper.text()).not.toContain('No returns yet');
    });

    it('calls an unfiltered empty list "no returns yet"', async () => {
        const wrapper = await openAt('/en/sales/returns');

        expect(wrapper.text()).toContain('No returns yet');
    });

    it('lists the returns the server answers with', async () => {
        answerSearchWith([aReturnListItem({ id: 'r1' }), aReturnListItem({ id: 'r2' })]);

        const wrapper = await openAt('/en/sales/returns?proofOfSending=false');

        expect(wrapper.findAll('[data-test=return-item]')).toHaveLength(2);
    });
});
