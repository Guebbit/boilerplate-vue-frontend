/**
 * @module
 * Mounts the real staff inbox over the shared MSW server: the filters in the address reach the
 * search body, a typed filter is sent on submit, and "take" assigns the task to the viewer.
 * The store, the generated client and the interceptors are real; only the wire is faked.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import TaskInbox from '../views/TaskInbox.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { useSessionStore } from '@/infrastructure/session.ts';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { server } from '../../../../tests/support/unit/msw-server.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aTask } from '../../../../tests/support/unit/fixtures.ts';

wireModulesIntoCore();

/**
 * The real app router: the page reads the filters off the address it was opened on.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Every body `POST /tasks/search` arrived with, and every body of `PUT /tasks/t1/assignee`.
 */
let searchBodies: Record<string, unknown>[];
let assignBodies: Record<string, unknown>[];

/**
 * Opens the inbox on `address`, waits for the first search to settle.
 *
 * @param address - the path and query staff arrived on
 */
const openInbox = (address: string) =>
    router
        .push(address)
        .then(() => router.isReady())
        .then(() => mount(TaskInbox, { global: { plugins: [router, vuetify, i18n] } }))
        .then((wrapper) => flushPromises().then(() => wrapper));

beforeEach(() => {
    setActivePinia(createPinia());
    searchBodies = [];
    assignBodies = [];
    server.use(
        http.post('*/tasks/search', async ({ request }) => {
            searchBodies.push((await request.json()) as Record<string, unknown>);
            return HttpResponse.json({
                items: [aTask({ actions: { ...aTask().actions, assign: true } })],
                meta: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }
            });
        }),
        http.put('*/tasks/t1/assignee', async ({ request }) => {
            assignBodies.push((await request.json()) as Record<string, unknown>);
            return HttpResponse.json(aTask({ assigneeId: 'staff-1', assigneeName: 'Sam' }));
        })
    );
    return loadLocale('en');
});

describe('TaskInbox filters', () => {
    it('sends the filters named in the address with the first search', () =>
        openInbox('/en/tasks?status=resolved&assignee=me&overdue=true&kind=contact').then(() => {
            expect(searchBodies[0]).toMatchObject({
                status: 'resolved',
                assignee: 'me',
                overdue: true,
                kind: 'contact'
            });
        }));

    it('sends a typed text filter when the form is submitted', () =>
        openInbox('/en/tasks')
            .then((wrapper) =>
                wrapper
                    .get('[data-test=filter-text] input')
                    .setValue('parcel')
                    .then(() => wrapper.get('form').trigger('submit'))
            )
            .then(flushPromises)
            .then(() => {
                expect(searchBodies.at(-1)).toMatchObject({ text: 'parcel', page: 1 });
            }));
});

describe('TaskInbox take', () => {
    it('assigns the task to the signed-in viewer', () => {
        useSessionStore().viewer = { id: 'staff-1', email: 'sam@example.com' };

        return openInbox('/en/tasks')
            .then((wrapper) => wrapper.get('[data-test=task-take]').trigger('click'))
            .then(flushPromises)
            .then(() => {
                expect(assignBodies).toEqual([{ userId: 'staff-1' }]);
            });
    });
});
