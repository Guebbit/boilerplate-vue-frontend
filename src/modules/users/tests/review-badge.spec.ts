/**
 * @module
 * The users nav badge (`composables/use-review-badge.ts`): the total of the users list filtered to
 * live accounts flagged for review, read passively for a person who may read users, and gone on
 * sign-out. Its own read, not the shop summary: `users` names no shop code.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises } from '@vue/test-utils';
import usersModule from '../module.ts';
import { queryClient } from '@/infrastructure/query-client.ts';
import { useSessionStore, type SessionViewer } from '@/infrastructure/session.ts';
import { server } from '../../../../tests/support/unit/msw-server.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { mountBadge } from '../../../../tests/support/unit/badge-host.ts';
import { asStub } from '../../../../tests/support/stub.ts';

wireModulesIntoCore();

/**
 * The queries the list was asked with, and its answer's total.
 */
let asked: { query: URLSearchParams; passive: boolean }[];
let total: number;

beforeEach(() => {
    setActivePinia(createPinia());
    queryClient.clear();
    asked = [];
    total = 3;
    server.use(
        http.get('*/users', ({ request }) => {
            asked.push({
                query: new URL(request.url).searchParams,
                passive: request.headers.get('Session-Passive') === 'true'
            });
            return HttpResponse.json({
                items: [],
                meta: { page: 1, pageSize: 1, totalItems: total, totalPages: total }
            });
        })
    );
});

/**
 * Runs the users nav entry's `badge` accessor as the shell does.
 */
const wireBadge = () => {
    const entry = usersModule.navigation.find(({ name }) => name === 'UsersList');
    return mountBadge(() => entry?.badge?.());
};

/**
 * Signs a stub staff member in.
 *
 * @param can - the rules they hold
 */
const signIn = (can: [string, string][]) => {
    const session = useSessionStore();
    session.viewer = asStub<SessionViewer>({ id: 'staff-1', email: 's@example.com' });
    session.accessToken = 'tok';
    session.setAbilities({ tenant: can, platform: [] });
};

describe('the users badge', () => {
    it('wears the flagged live accounts of the list total, asked passively for one row', async () => {
        signIn([['read', 'User']]);

        const { result } = await wireBadge();
        await flushPromises();

        expect(result?.value).toBe(total);
        expect(asked).toHaveLength(1);
        expect(asked[0].passive).toBe(true);
        expect(asked[0].query.get('purchaseHoldReview')).toBe('true');
        expect(asked[0].query.get('deleted')).toBe('false');
        expect(asked[0].query.get('pageSize')).toBe('1');
    });

    it('wears nothing, and asks nothing, for a session that may not read users', async () => {
        signIn([['read', 'Order']]);

        const { result } = await wireBadge();
        await flushPromises();

        expect(result?.value).toBeUndefined();
        expect(asked).toEqual([]);
    });

    it('wears nothing once the person signs out', async () => {
        signIn([['read', 'User']]);
        const { result } = await wireBadge();
        await flushPromises();

        useSessionStore().accessToken = undefined;
        await flushPromises();

        expect(result?.value).toBeUndefined();
    });
});
