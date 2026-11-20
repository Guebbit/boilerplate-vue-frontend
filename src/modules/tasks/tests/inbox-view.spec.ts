/**
 * @module
 * Mounts the real staff inbox over the shared MSW server: the filters in the address reach the
 * search body, a typed filter is sent on submit, and "take" assigns the task to the viewer.
 * The store, the generated client and the interceptors are real; only the wire is faked.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
import { aTask, aTaskListItem } from '../../../../tests/support/unit/fixtures.ts';
import type { Task } from '@types';

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
 * Every body `POST /tasks/search` arrived with, and every body of `POST /tasks/t1/assign`.
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
                items: [aTaskListItem({ actions: { ...aTaskListItem().actions, assign: true } })],
                meta: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }
            });
        }),
        http.post('*/tasks/t1/assign', async ({ request }) => {
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

describe('TaskInbox reference', () => {
    it('shows the same short reference as the mail subject on each row', () => {
        server.use(
            http.post('*/tasks/search', () =>
                HttpResponse.json({
                    items: [aTaskListItem({ id: '65dc8a99604c307b702aaaaa' })],
                    meta: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }
                })
            )
        );

        return openInbox('/en/tasks').then((wrapper) => {
            expect(wrapper.get('[data-test=task-item] [data-test=task-ref]').text()).toBe(
                '#702aaaaa'
            );
        });
    });
});

describe('TaskInbox message', () => {
    it('shows the preview the list carries, and the whole message only on the detail page', () => {
        server.use(
            http.post('*/tasks/search', () =>
                HttpResponse.json({
                    items: [aTaskListItem({ messagePreview: 'The checkout button does nothi…' })],
                    meta: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }
                })
            )
        );

        return openInbox('/en/tasks').then((wrapper) => {
            expect(wrapper.get('[data-test=task-message-preview]').text()).toBe(
                'The checkout button does nothi…'
            );
            expect(wrapper.get('[data-test=task-open]').attributes('href')).toContain('/tasks/t1');
        });
    });
});

describe('TaskInbox unknown kind', () => {
    // Production validation is report-only: a response passes through as it arrived
    // (`isReportOnly` in `src/infrastructure/http/validate.ts`).
    beforeEach(() => {
        vi.stubEnv('PROD', true);
        vi.stubEnv('VITE_CONTRACT_THROW', '');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('shows the generic word, not a raw key, for a kind this client does not know', () => {
        server.use(
            http.post('*/tasks/search', () =>
                HttpResponse.json({
                    // Spread after the fixture: its own contract check would refuse the unknown kind.
                    items: [
                        {
                            ...aTaskListItem({ email: undefined }),
                            kind: 'kind_from_the_future' as Task['kind']
                        }
                    ],
                    meta: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }
                })
            )
        );

        return openInbox('/en/tasks').then((wrapper) => {
            const row = wrapper.get('[data-test=task-item]').text();
            expect(row).toContain('Task');
            expect(row).not.toContain('task-kind.');
        });
    });
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
