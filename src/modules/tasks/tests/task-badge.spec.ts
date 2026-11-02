/**
 * @module
 * The inbox's nav badge (`composables/use-task-badge.ts`): it reads `GET /tasks/summary` for a
 * person who may read tasks, wears unassigned plus mine, follows a task notice arriving in the
 * bell, and wears nothing for someone who may not read tasks or once they sign out.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope, nextTick } from 'vue';
import type { Ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import tasksModule from '../module.ts';
import { useSessionStore, type SessionViewer } from '@/infrastructure/session.ts';
import { server } from '../../../../tests/support/unit/msw-server.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { asStub } from '../../../../tests/support/stub.ts';

wireModulesIntoCore();

/**
 * What `GET /tasks/summary` answers, and how many times it was asked.
 */
let counts: { open: number; mine: number; overdue: number; unassigned: number };
let reads: { passive: boolean }[];

/**
 * Runs the inbox navigation entry's `badge` accessor as the shell does, in a scope of its own.
 *
 * @returns The ref the shell would render.
 */
const wireBadge = (): Ref<number | undefined> | undefined => {
    const entry = tasksModule.navigation.find(({ name }) => name === 'TaskInbox');
    return effectScope().run(() => entry?.badge?.());
};

/**
 * Signs a stub staff member in with the given abilities.
 *
 * @param can - The tenant rules they hold.
 */
const signIn = (can: [string, string][]) => {
    const session = useSessionStore();
    session.viewer = asStub<SessionViewer>({ id: 'staff-1', email: 'sam@example.com' });
    session.accessToken = 'tok';
    session.setAbilities({ tenant: can, platform: [] });
};

beforeEach(() => {
    setActivePinia(createPinia());
    counts = { open: 9, mine: 2, overdue: 1, unassigned: 3 };
    reads = [];
    server.use(
        http.get('*/tasks/summary', ({ request }) => {
            reads.push({ passive: request.headers.get('Session-Passive') === 'true' });
            return HttpResponse.json(counts);
        })
    );
});

describe('the task badge', () => {
    it('wears unassigned plus mine for a person who may read tasks, read passively', async () => {
        signIn([['read', 'Task']]);

        const badge = wireBadge();
        await flushPromises();

        expect(badge?.value).toBe(5);
        expect(reads).toEqual([{ passive: true }]);
    });

    it('wears nothing, and asks nothing, for a session that may not read tasks', async () => {
        signIn([['read', 'Order']]);

        const badge = wireBadge();
        await flushPromises();

        expect(badge?.value).toBeUndefined();
        expect(reads).toEqual([]);
    });

    it('wears nothing once the person signs out', async () => {
        signIn([['read', 'Task']]);
        const badge = wireBadge();
        await flushPromises();

        useSessionStore().accessToken = undefined;
        await flushPromises();

        expect(badge?.value).toBeUndefined();
    });

    it('reads again when a task notice reaches the bell, and not for any other notice', async () => {
        signIn([['read', 'Task']]);
        const badge = wireBadge();
        await flushPromises();
        counts = { open: 10, mine: 2, overdue: 1, unassigned: 4 };

        const messages = useNotificationsStore();
        messages.addMessage('hold', undefined, -1, {
            id: 'n1',
            persistent: true,
            meta: {
                source: 'inbox',
                notification: { code: 'notifications.staff.purchase-hold-placed' }
            }
        });
        await nextTick();
        await flushPromises();
        expect(reads).toHaveLength(1);

        messages.addMessage('task', undefined, -1, {
            id: 'n2',
            persistent: true,
            meta: {
                source: 'inbox',
                notification: { code: 'notifications.staff.task-opened' }
            }
        });
        await nextTick();
        await flushPromises();

        expect(reads).toHaveLength(2);
        expect(badge?.value).toBe(6);
    });

    it('reads again when a task goes overdue: the reminder is a task notice too', async () => {
        signIn([['read', 'Task']]);
        wireBadge();
        await flushPromises();

        useNotificationsStore().addMessage('late', undefined, -1, {
            id: 'n3',
            persistent: true,
            meta: {
                source: 'inbox',
                notification: { code: 'notifications.staff.task-overdue' }
            }
        });
        await nextTick();
        await flushPromises();

        expect(reads).toHaveLength(2);
    });
});
