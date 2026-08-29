/**
 * The device-sessions store: the list, and revoking one entry.
 *
 * Only the transport is mocked, keyed by request URL — see `profile.spec.ts` for why.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useAccountSessionsStore } from '@/modules/account/stores/sessions.ts';
import { orvalMutator } from '@/infrastructure/http';

let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(responses[key]);
    })
}));

const requestedUrls = () =>
    vi.mocked(orvalMutator).mock.calls.map((call) => (call[0] as { url: string }).url);

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'GET /account/sessions': { data: { sessions: [{ id: 's1', current: true }] } },
        'DELETE /account/sessions/s1': { data: undefined }
    };
});

describe('useAccountSessionsStore', () => {
    it('revokeSession reloads the list it changed', () => {
        const store = useAccountSessionsStore();
        return store
            .fetchSessions()
            .then(() => store.revokeSession('s1'))
            .then(() => {
                expect(requestedUrls().slice(-3)).toEqual([
                    '/account/sessions',
                    '/account/sessions/s1',
                    '/account/sessions'
                ]);
                expect(store.sessions.map(({ id }) => id)).toEqual(['s1']);
            });
    });

    it('a sessions payload without the list reads as no sessions', () => {
        responses['GET /account/sessions'] = { data: undefined };
        const store = useAccountSessionsStore();
        return store.fetchSessions().then(() => {
            expect(store.sessions).toEqual([]);
        });
    });
});
