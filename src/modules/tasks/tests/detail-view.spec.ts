/**
 * @module
 * Mounts the real task detail page over the shared MSW server: "take" assigns the viewer, a
 * note is appended with its text trimmed and the composer emptied, and the button is withheld
 * when the server does not offer the note door.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import TaskDetail from '../views/TaskDetail.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { useSessionStore } from '@/infrastructure/session.ts';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { server } from '../../../../tests/support/unit/msw-server.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aTask } from '../../../../tests/support/unit/fixtures.ts';
import type { Task } from '@types';

wireModulesIntoCore();

/**
 * The real app router: the page reads the task id off the address.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * The bodies the two writes arrived with.
 */
let assignBodies: Record<string, unknown>[];

let noteBodies: Record<string, unknown>[];

/**
 * Mocks the read of task t1 and opens the page on it.
 *
 * @param task - What `GET /tasks/t1` answers.
 */
const openDetail = (task: Task) => {
    server.use(http.get('*/tasks/t1', () => HttpResponse.json(task)));

    return router
        .push('/en/tasks/t1')
        .then(() => router.isReady())
        .then(() => mount(TaskDetail, { global: { plugins: [router, vuetify, i18n] } }))
        .then((wrapper) => flushPromises().then(() => wrapper));
};

beforeEach(() => {
    setActivePinia(createPinia());
    assignBodies = [];
    noteBodies = [];
    useSessionStore().viewer = { id: 'staff-1', email: 'sam@example.com' };
    server.use(
        http.post('*/tasks/t1/assign', async ({ request }) => {
            assignBodies.push((await request.json()) as Record<string, unknown>);
            return HttpResponse.json(aTask({ assigneeId: 'staff-1', assigneeName: 'Sam' }));
        }),
        http.post('*/tasks/t1/notes', async ({ request }) => {
            const body = (await request.json()) as { body: string };
            noteBodies.push(body);
            return HttpResponse.json(
                aTask({ notes: [{ at: '2026-01-02T00:00:00.000Z', body: body.body }] })
            );
        })
    );
    return loadLocale('en');
});

describe('TaskDetail reference', () => {
    it('shows the last eight characters of the id, as the mail subject does', () =>
        openDetail(aTask({ id: '65dc8a99604c307b702aaaaa' })).then((wrapper) => {
            expect(wrapper.get('[data-test=task-ref]').text()).toBe('#702aaaaa');
        }));
});

describe('TaskDetail record link', () => {
    it('opens the return page for a to-do linked to a return, worded with its own label', () =>
        openDetail(aTask({ kind: 'return_refund_short', link: { type: 'return', id: 'r9' } })).then(
            (wrapper) => {
                const link = wrapper.get('[data-test=task-link] a');
                expect(link.text()).toBe('Return r9');
                expect(link.attributes('href')).toBe('/en/returns/r9');
                expect(wrapper.get('[data-test=task-detail]').text()).toContain(
                    'Return refund smaller than owed'
                );
            }
        ));
});

describe('TaskDetail unknown kind', () => {
    /**
     * Production validation is report-only: a response passes through as it arrived
     * (`isReportOnly` in `src/infrastructure/http/validate.ts`).
     */
    beforeEach(() => {
        vi.stubEnv('PROD', true);
        vi.stubEnv('VITE_CONTRACT_THROW', '');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('shows the generic word, not a raw key, for a kind this client does not know', () =>
        // Spread after the fixture: its own contract check would refuse the unknown kind.
        openDetail({ ...aTask(), kind: 'kind_from_the_future' as Task['kind'] }).then((wrapper) => {
            const text = wrapper.get('[data-test=task-detail]').text();
            expect(text).toContain('Task ·');
            expect(text).not.toContain('task-kind.');
        }));
});

describe('TaskDetail take', () => {
    it('assigns the task to the viewer and then shows the assignee', () =>
        openDetail(aTask())
            .then((wrapper) =>
                wrapper
                    .get('[data-test=task-take]')
                    .trigger('click')
                    .then(flushPromises)
                    .then(() => wrapper)
            )
            .then((wrapper) => {
                expect(assignBodies).toEqual([{ userId: 'staff-1' }]);
                expect(wrapper.get('[data-test=task-assignee]').text()).toContain('Sam');
                expect(wrapper.find('[data-test=task-take]').exists()).toBe(false);
            }));
});

describe('TaskDetail take label', () => {
    it("reads 'Take over' on a task another user holds", () =>
        openDetail(aTask({ assigneeId: 'staff-2', assigneeName: 'Ann' })).then((wrapper) => {
            expect(wrapper.get('[data-test=task-take]').text()).toBe('Take over');
        }));

    it("reads 'Take' on an unassigned task", () =>
        openDetail(aTask()).then((wrapper) => {
            expect(wrapper.get('[data-test=task-take]').text()).toBe('Take');
        }));

    it("offers no take button on the viewer's own task", () =>
        openDetail(aTask({ assigneeId: 'staff-1', assigneeName: 'Sam' })).then((wrapper) => {
            expect(wrapper.find('[data-test=task-take]').exists()).toBe(false);
        }));
});

describe('TaskDetail notes', () => {
    it('appends the trimmed draft, shows it, and empties the composer', () =>
        openDetail(aTask())
            .then((wrapper) =>
                wrapper
                    .get('[data-test=task-note-draft] textarea')
                    .setValue('  Rang the courier.  ')
                    .then(() => wrapper.get('[data-test=task-note-add]').trigger('click'))
                    .then(flushPromises)
                    .then(() => wrapper)
            )
            .then((wrapper) => {
                expect(noteBodies).toEqual([{ body: 'Rang the courier.' }]);
                expect(wrapper.get('[data-test=task-note]').text()).toContain('Rang the courier.');
                expect(
                    wrapper.get<HTMLTextAreaElement>('[data-test=task-note-draft] textarea').element
                        .value
                ).toBe('');
            }));

    it('offers no composer when the server does not offer the note door', () =>
        openDetail(aTask({ actions: { ...aTask().actions, note: false } })).then((wrapper) => {
            expect(wrapper.find('[data-test=task-note-draft]').exists()).toBe(false);
        }));
});

/**
 * Grants (or withholds) `read:AuditLog`, the ability the "History" link is gated on.
 *
 * @param canReadAuditLog - Whether to hold the ability.
 */
const signIn = (canReadAuditLog: boolean) => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.setAbilities({
        tenant: canReadAuditLog ? [['read', 'AuditLog']] : [],
        platform: []
    });
};

describe('TaskDetail history', () => {
    it('links to the audit log filtered on the task, for a caller who may read it', () => {
        signIn(true);

        return openDetail(aTask({ id: 't1' })).then((wrapper) => {
            expect(wrapper.get('[data-test=task-history]').attributes('href')).toBe(
                '/en/audit?target=t1'
            );
        });
    });

    it('is absent for a caller without read:AuditLog', () => {
        signIn(false);

        return openDetail(aTask({ id: 't1' })).then((wrapper) => {
            expect(wrapper.find('[data-test=task-history]').exists()).toBe(false);
        });
    });
});

/**
 * Resizes the window the way a phone would and tells Vuetify's display to re-read it.
 *
 * @param width - the viewport width in px
 */
const resizeTo = (width: number) => {
    vi.stubGlobal('innerWidth', width);
    vuetify.display.update();
};

/** A task with every action switched on, so every button renders. */
const everyAction = () =>
    aTask({
        assigneeId: 'staff-2',
        assigneeName: 'Ann',
        actions: {
            resolve: true,
            markSpam: true,
            reopen: true,
            assign: true,
            unassign: true,
            note: true,
            delete: true
        }
    });

describe('TaskDetail touch sizing', () => {
    /** Every action button the page renders for a viewer without audit-log access (no History link). */
    const ACTIONS = [
        'task-take',
        'task-give-back',
        'task-resolve',
        'task-spam',
        'task-reopen',
        'task-note-add'
    ];

    afterEach(() => {
        vi.unstubAllGlobals();
        vuetify.display.update();
    });

    it('gives every action button the large touch size on a phone-width viewport', () => {
        resizeTo(375);

        return openDetail(everyAction()).then((wrapper) => {
            const buttons = ACTIONS.map((name) => wrapper.get(`[data-test=${name}]`));

            for (const button of buttons) {
                expect(button.classes()).toContain('v-btn--size-large');
            }
        });
    });

    it('keeps them small on a wide viewport with a mouse', () => {
        resizeTo(1280);

        return openDetail(everyAction()).then((wrapper) => {
            expect(wrapper.get('[data-test=task-take]').classes()).toContain('v-btn--size-small');
            expect(wrapper.get('[data-test=task-note-add]').classes()).toContain(
                'v-btn--size-small'
            );
        });
    });
});
