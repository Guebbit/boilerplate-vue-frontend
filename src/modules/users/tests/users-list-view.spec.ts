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
 * @param items - The rows the search answers; one default user when omitted.
 * @returns The mounted wrapper.
 */
const mountWithRows = async (items: ReturnType<typeof aUser>[] = [aUser()]) => {
    vi.mocked(searchUsers).mockResolvedValue(
        asStub<Awaited<ReturnType<typeof searchUsers>>>(
            contractResponse(schemas.SearchUsersResponse, {
                items,
                meta: { page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 }
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

/**
 * The row actions are the server's answer for THIS admin on THIS account (the route's key and the
 * rank rule together), not the session's: a moderator may edit, ban and erase a customer and none
 * of those on a support agent; support may edit a customer and not ban or erase.
 */
describe('UsersList — the row actions follow each row’s own `actions`', () => {
    it('offers every write on a row that allows them, and only the view on one that allows none', async () => {
        const wrapper = await mountWithRows([
            aUser({
                id: 'u1',
                username: 'customer',
                actions: { update: true, ban: true, delete: true }
            }),
            aUser({
                id: 'u2',
                username: 'support',
                actions: { update: false, ban: false, delete: false }
            })
        ]);

        const rows = wrapper.findAll('tbody tr');
        const writesOf = (row: (typeof rows)[number]) =>
            row
                .findAll('[data-test]')
                .map((button) => button.attributes('data-test'))
                .filter((name) => name?.startsWith('row-') && name !== 'row-view')
                .toSorted();

        expect(writesOf(rows[0])).toEqual([
            'row-access',
            'row-delete',
            'row-edit',
            'row-hard-delete'
        ]);
        expect(writesOf(rows[1])).toEqual([]);
        expect(rows[1].find('[data-test=row-view]').exists()).toBe(true);
    });

    it('offers edit and access, but no delete, on a row that allows only the profile edit', async () => {
        const wrapper = await mountWithRows([
            aUser({
                id: 'u1',
                username: 'customer',
                actions: { update: true, ban: false, delete: false }
            })
        ]);

        const row = wrapper.get('tbody tr');

        expect(row.find('[data-test=row-edit]').exists()).toBe(true);
        expect(row.find('[data-test=row-access]').exists()).toBe(true);
        expect(row.find('[data-test=row-delete]').exists()).toBe(false);
        expect(row.find('[data-test=row-hard-delete]').exists()).toBe(false);
    });

    it('offers the access shortcut on a ban-only row, which edits nothing else', async () => {
        const wrapper = await mountWithRows([
            aUser({
                id: 'u1',
                username: 'customer',
                actions: { update: false, ban: true, delete: false }
            })
        ]);

        const row = wrapper.get('tbody tr');

        expect(row.find('[data-test=row-access]').exists()).toBe(true);
        expect(row.find('[data-test=row-edit]').exists()).toBe(false);
    });
});
