/**
 * @module
 * The examples list sorts on the server: a click on a sortable header writes `filters.sort` and
 * searches again, and the columns the contract's `ExampleSort` does not name stay inert.
 *
 * `listExamples` is the one mocked client call, so the real store, search and page run together and
 * the request that goes out is what is asserted.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { listExamples } from '@api';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import ExamplesList from '../views/ExamplesList.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { asStub } from '../../../../tests/support/stub.ts';
import { contractResponse } from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';
import * as schemas from '@api/schemas';

wireModulesIntoCore();

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@api')>()),
    listExamples: vi.fn()
}));

/**
 * The real app router, scoped to the modules this suite enables.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Every wrapper mounted so far, so teardown can unmount them all.
 */
const mounted: { unmount: () => void }[] = [];

/**
 * Mounts the page and lets its first search land.
 */
const mountList = async () => {
    const wrapper = mount(ExamplesList, { global: { plugins: [router, vuetify, i18n] } });
    mounted.push(wrapper);
    await flushPromises();
    return wrapper;
};

afterEach(() => {
    for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(listExamples).mockResolvedValue(
        asStub<Awaited<ReturnType<typeof listExamples>>>(
            contractResponse(schemas.ListExamplesResponse, {
                items: [],
                meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 }
            })
        )
    );
    return loadLocale('en').then(() => router.push('/en/examples').then(() => router.isReady()));
});

describe('ExamplesList — sorting on the server', () => {
    it('sends a header click as the sort, and leaves the unsortable columns inert', async () => {
        const wrapper = await mountList();
        const head = (title: string) =>
            wrapper.findAll('th').find((cell) => cell.text().includes(title));

        await head('Title')?.trigger('click');
        await flushPromises();

        expect(listExamples).toHaveBeenLastCalledWith(
            expect.objectContaining({ sort: ['title'], page: 1 })
        );
        expect(head('Title')?.classes()).toContain('v-data-table__th--sortable');
        expect(head('Owner')?.classes()).not.toContain('v-data-table__th--sortable');
    });

    it('sends no sort until one is chosen', async () => {
        await mountList();

        expect(vi.mocked(listExamples).mock.calls.at(0)?.[0]?.sort).toBeUndefined();
    });
});
