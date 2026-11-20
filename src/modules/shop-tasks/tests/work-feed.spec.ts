/**
 * @module
 * The feed behind the staff nav badges (`composables/use-shop-work-feed.ts`): a person who may open
 * a counted screen gets `GET /shop-tasks/summary` read passively into the kernel's counts; a buyer
 * is never asked; a route change inside the minute reuses the answer and a staff notice forces a
 * new one; sign-out empties the counts.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { EToastType, useNotificationsStore } from '@guebbit/vue-toolkit';
import { useShopWorkFeed } from '../composables/use-shop-work-feed.ts';
import { clearWorkCounts, useWorkCount } from '@/kernel/work-counts.ts';
import { queryClient } from '@/infrastructure/query-client.ts';
import { useSessionStore, type SessionViewer } from '@/infrastructure/session.ts';
import { server } from '../../../../tests/support/unit/msw-server.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { mountBadge } from '../../../../tests/support/unit/badge-host.ts';
import { asStub } from '../../../../tests/support/stub.ts';
import { aSummary } from './summary-fixtures.ts';

wireModulesIntoCore();

/**
 * What the endpoint answers next, and how it was asked.
 */
let answer: ReturnType<typeof aSummary>;

let reads: { passive: boolean }[];

beforeEach(() => {
    setActivePinia(createPinia());
    queryClient.clear();
    clearWorkCounts();
    answer = aSummary();
    reads = [];
    server.use(
        http.get('*/shop-tasks/summary', ({ request }) => {
            reads.push({ passive: request.headers.get('Session-Passive') === 'true' });
            return HttpResponse.json(answer);
        })
    );
});

/**
 * Signs a stub staff member in with the given tenant rules.
 *
 * @param can - the rules they hold
 */
const signIn = (can: [string, string][]) => {
    const session = useSessionStore();
    session.viewer = asStub<SessionViewer>({ id: 'staff-1', email: 'staff-1@example.com' });
    session.accessToken = 'tok';
    session.setAbilities({ tenant: can, platform: [] });
};

describe('the shop work feed', () => {
    it('reads the summary passively for a person who may open a counted screen', async () => {
        signIn([['display', 'Order']]);

        await mountBadge(useShopWorkFeed);
        await flushPromises();

        expect(reads).toEqual([{ passive: true }]);
        expect(useWorkCount('salesOrders').value).toBe(answer.salesOrders);
        expect(useWorkCount('inventory').value).toBe(answer.inventory);
    });

    it('never asks for a buyer, who opens none of the five screens', async () => {
        signIn([['read', 'Order']]);

        await mountBadge(useShopWorkFeed);
        await flushPromises();

        expect(reads).toEqual([]);
        expect(useWorkCount('salesOrders').value).toBeUndefined();
    });

    it('reuses the answer for a route change within the minute, and forces one for a staff notice', async () => {
        signIn([['display', 'Order']]);
        const { router } = await mountBadge(useShopWorkFeed);
        await flushPromises();

        await router.push('/a');
        await flushPromises();
        expect(reads).toHaveLength(1);

        answer = aSummary({ salesOrders: 9 });
        useNotificationsStore().addMessage('text', EToastType.PRIMARY, -1, {
            id: 'n1',
            persistent: true,
            meta: {
                source: 'inbox',
                notification: { id: 'n1', code: 'shop-tasks.staff.unshipped' }
            }
        });
        await nextTick();
        await flushPromises();

        expect(reads).toHaveLength(2);
        expect(useWorkCount('salesOrders').value).toBe(9);
    });

    it('reads again for another person, and empties every count on sign-out', async () => {
        signIn([['display', 'Order']]);
        await mountBadge(useShopWorkFeed);
        await flushPromises();

        useSessionStore().viewer = asStub<SessionViewer>({
            id: 'staff-2',
            email: 's2@example.com'
        });
        // The handler runs a tick after the request leaves, so wait for the read rather than for the microtask queue.
        await vi.waitFor(() => expect(reads).toHaveLength(2));

        useSessionStore().accessToken = undefined;
        await flushPromises();
        expect(useWorkCount('salesOrders').value).toBeUndefined();
        expect(useWorkCount('returns').value).toBeUndefined();
    });
});
