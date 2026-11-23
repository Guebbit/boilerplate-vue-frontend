/**
 * @module
 * The webhooks nav badge (`composables/use-auto-disabled-badge.ts`): the total of the subscriptions
 * list filtered to the ones the failure guard switched off, read passively for a person who may
 * read subscriptions, and gone on sign-out.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises } from '@vue/test-utils';
import webhooksModule from '../module.ts';
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
    total = 2;
    server.use(
        http.get('*/webhooks/subscriptions', ({ request }) => {
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
 * Runs the webhooks nav entry's `badge` accessor as the shell does.
 */
const wireBadge = () => {
    const entry = webhooksModule.navigation.find(({ name }) => name === 'WebhooksList');
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

describe('the webhooks badge', () => {
    it('wears the auto-disabled subscriptions of the list total, asked passively for one row', async () => {
        signIn([['read', 'WebhookSubscription']]);

        const { result } = await wireBadge();
        await flushPromises();

        expect(result?.value).toBe(total);
        expect(asked).toHaveLength(1);
        expect(asked[0].passive).toBe(true);
        expect(asked[0].query.get('autoDisabled')).toBe('true');
        expect(asked[0].query.get('pageSize')).toBe('1');
    });

    it('wears nothing, and asks nothing, for a session that may not read subscriptions', async () => {
        signIn([['read', 'Locale']]);

        const { result } = await wireBadge();
        await flushPromises();

        expect(result?.value).toBeUndefined();
        expect(asked).toEqual([]);
    });

    it('wears nothing once the person signs out', async () => {
        signIn([['read', 'WebhookSubscription']]);
        const { result } = await wireBadge();
        await flushPromises();

        useSessionStore().accessToken = undefined;
        await flushPromises();

        expect(result?.value).toBeUndefined();
    });
});
