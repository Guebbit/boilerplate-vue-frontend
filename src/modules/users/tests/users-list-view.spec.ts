/**
 * @module
 * Page-level spec for the users list's header sort: the header sorts the WHOLE result on the
 * server, so a click on an API-sortable column becomes `filters.sort` and a fresh search from
 * page 1, and a column the API cannot sort by stays inert. Same template as the orders list's
 * "sorting from the header" suite; the sort plumbing itself is `useServerSort`'s.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { searchUsers } from '@api';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import UsersList from '@/modules/users/views/UsersList.vue';
import { useUsersStore } from '@/modules/users/store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { asStub } from '../../../../tests/support/stub.ts';
import { aUser } from '../../../../tests/support/unit/fixtures.ts';
import { contractResponse } from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';
import * as schemas from '@api/schemas';

wireModulesIntoCore();

/*
 * The one client call the page's search makes; answered with a one-row page so the table, and so
 * its headers, render.
 */
vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@api')>()),
    searchUsers: vi.fn()
}));

/**
 * The real app router, scoped to the modules this test suite enables.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Mounts the page against a one-row result and waits for the first search to settle.
 *
 * @returns The mounted wrapper.
 */
const mountWithRows = async () => {
    vi.mocked(searchUsers).mockResolvedValue(
        asStub<Awaited<ReturnType<typeof searchUsers>>>(
            contractResponse(schemas.SearchUsersResponse, {
                items: [aUser()],
                meta: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }
            })
        )
    );
    const wrapper = mount(UsersList, {
        global: {
            plugins: [router, vuetify, i18n]
        }
    });
    await flushPromises();
    return wrapper;
};

/**
 * Finds a table header cell by its visible title.
 *
 * @param wrapper - The mounted page.
 * @param title - The column title as rendered.
 * @returns The matching `<th>`, or `undefined`.
 */
const headOf = (wrapper: Awaited<ReturnType<typeof mountWithRows>>, title: string) =>
    wrapper.findAll('th').find((head) => head.text().includes(title));

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    return loadLocale('en').then(() => router.push('/en/users').then(() => router.isReady()));
});

describe('UsersList — sorting from the header', () => {
    it('sends the clicked column to the API as the sort, and keeps it in the store', async () => {
        const wrapper = await mountWithRows();

        await headOf(wrapper, 'Email')?.trigger('click');
        await flushPromises();

        expect(useUsersStore().filters.sort).toBe('email');
        expect(searchUsers).toHaveBeenLastCalledWith(expect.objectContaining({ sort: ['email'] }));
    });

    it('sorts descending on the second click of the same column', async () => {
        const wrapper = await mountWithRows();

        await headOf(wrapper, 'Username')?.trigger('click');
        await headOf(wrapper, 'Username')?.trigger('click');
        await flushPromises();

        expect(useUsersStore().filters.sort).toBe('-username');
        expect(searchUsers).toHaveBeenLastCalledWith(
            expect.objectContaining({ sort: ['-username'] })
        );
    });

    it('leaves the columns the API cannot sort by inert', async () => {
        const wrapper = await mountWithRows();

        expect(headOf(wrapper, 'Role')?.classes()).not.toContain('v-data-table__th--sortable');
        expect(headOf(wrapper, 'Active')?.classes()).not.toContain('v-data-table__th--sortable');
        expect(headOf(wrapper, 'Email')?.classes()).toContain('v-data-table__th--sortable');
        expect(headOf(wrapper, 'Created at')?.classes()).toContain('v-data-table__th--sortable');
    });
});
