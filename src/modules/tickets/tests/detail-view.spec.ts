/**
 * @module
 * Mounts the real ticket detail page over the shared MSW server: "take" assigns the viewer, a
 * note is appended with its text trimmed and the composer emptied, and the button is withheld
 * when the server does not offer the note door.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import TicketDetail from '../views/TicketDetail.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { useSessionStore } from '@/infrastructure/session.ts';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { server } from '../../../../tests/support/unit/msw-server.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aTicket } from '../../../../tests/support/unit/fixtures.ts';
import type { Ticket } from '@types';

wireModulesIntoCore();

/**
 * The real app router: the page reads the ticket id off the address.
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
 * Mocks the read of ticket t1 and opens the page on it.
 *
 * @param ticket - What `GET /tickets/t1` answers.
 */
const openDetail = (ticket: Ticket) => {
    server.use(http.get('*/tickets/t1', () => HttpResponse.json(ticket)));

    return router
        .push('/en/tickets/t1')
        .then(() => router.isReady())
        .then(() => mount(TicketDetail, { global: { plugins: [router, vuetify, i18n] } }))
        .then((wrapper) => flushPromises().then(() => wrapper));
};

beforeEach(() => {
    setActivePinia(createPinia());
    assignBodies = [];
    noteBodies = [];
    useSessionStore().viewer = { id: 'staff-1', email: 'sam@example.com' };
    server.use(
        http.put('*/tickets/t1/assignee', async ({ request }) => {
            assignBodies.push((await request.json()) as Record<string, unknown>);
            return HttpResponse.json(aTicket({ assigneeId: 'staff-1', assigneeName: 'Sam' }));
        }),
        http.post('*/tickets/t1/notes', async ({ request }) => {
            const body = (await request.json()) as { body: string };
            noteBodies.push(body);
            return HttpResponse.json(
                aTicket({ notes: [{ at: '2026-01-02T00:00:00.000Z', body: body.body }] })
            );
        })
    );
    return loadLocale('en');
});

describe('TicketDetail take', () => {
    it('assigns the ticket to the viewer and then shows the assignee', () =>
        openDetail(aTicket())
            .then((wrapper) =>
                wrapper
                    .get('[data-test=ticket-take]')
                    .trigger('click')
                    .then(flushPromises)
                    .then(() => wrapper)
            )
            .then((wrapper) => {
                expect(assignBodies).toEqual([{ userId: 'staff-1' }]);
                expect(wrapper.get('[data-test=ticket-assignee]').text()).toContain('Sam');
                expect(wrapper.find('[data-test=ticket-take]').exists()).toBe(false);
            }));
});

describe('TicketDetail notes', () => {
    it('appends the trimmed draft, shows it, and empties the composer', () =>
        openDetail(aTicket())
            .then((wrapper) =>
                wrapper
                    .get('[data-test=ticket-note-draft] textarea')
                    .setValue('  Rang the courier.  ')
                    .then(() => wrapper.get('[data-test=ticket-note-add]').trigger('click'))
                    .then(flushPromises)
                    .then(() => wrapper)
            )
            .then((wrapper) => {
                expect(noteBodies).toEqual([{ body: 'Rang the courier.' }]);
                expect(wrapper.get('[data-test=ticket-note]').text()).toContain(
                    'Rang the courier.'
                );
                expect(
                    wrapper.get<HTMLTextAreaElement>('[data-test=ticket-note-draft] textarea')
                        .element.value
                ).toBe('');
            }));

    it('offers no composer when the server does not offer the note door', () =>
        openDetail(aTicket({ actions: { ...aTicket().actions, note: false } })).then((wrapper) => {
            expect(wrapper.find('[data-test=ticket-note-draft]').exists()).toBe(false);
        }));
});
