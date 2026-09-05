/**
 * @module
 * Unit tests for the device-sessions store — the list, and revoking one entry — mocking only the
 * transport and keying answers by request URL, same pattern as `profile.spec.ts`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useAccountSessionsStore } from '@/modules/account/stores/sessions.ts';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

/**
 * Responses per endpoint, consulted by the mocked transport below and reset in `beforeEach`.
 */
let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(parseOrvalFixture(config.method, config.url, responses[key]));
    })
}));

/**
 * Every request URL handed to the transport, in order.
 */
const requestedUrls = () =>
    vi.mocked(orvalMutator).mock.calls.map((call) => (call[0] as { url: string }).url);

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'GET /account/sessions': orvalEnvelope({ sessions: [{ id: 's1', current: true }] }),
        'DELETE /account/sessions/s1': orvalEnvelope()
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
        // `sessions` is required by the real contract, so this exact payload is impossible
        // against it — it bypasses `parseOrvalFixture` on purpose to pin the store's OWN defence
        // for that state, same as `addresses.spec.ts`'s book-less case.
        vi.mocked(orvalMutator).mockImplementationOnce(() =>
            Promise.resolve({ success: true, status: 200, message: 'OK', data: {} })
        );
        const store = useAccountSessionsStore();
        return store.fetchSessions().then(() => {
            expect(store.sessions).toEqual([]);
        });
    });
});
