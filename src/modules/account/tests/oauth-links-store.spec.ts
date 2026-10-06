/**
 * @module
 * Unit tests for the connected-providers store: the list, and removing one reloads it. Mocks only
 * the transport, keyed by request URL, same pattern as `sessions.spec.ts`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useOAuthLinksStore } from '@/modules/account/stores/oauth-links.ts';
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
 * Every request the transport saw, as `METHOD url`, in order.
 */
const requests = () =>
    vi
        .mocked(orvalMutator)
        .mock.calls.map(
            (call) =>
                `${(call[0] as { method: string }).method} ${(call[0] as { url: string }).url}`
        );

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'GET /account/oauth/links': orvalEnvelope({
            links: [{ provider: 'google', connectedAt: '2026-01-01T00:00:00.000Z' }]
        }),
        'DELETE /account/oauth/links/google': orvalEnvelope()
    };
});

describe('useOAuthLinksStore', () => {
    it('fetchLinks keeps the providers and when each was connected', () => {
        const store = useOAuthLinksStore();

        return store.fetchLinks().then(() => {
            expect(store.links).toEqual([
                { provider: 'google', connectedAt: '2026-01-01T00:00:00.000Z' }
            ]);
        });
    });

    it('unlinkProvider deletes the one link and reloads the list it changed', () => {
        const store = useOAuthLinksStore();

        return store
            .fetchLinks()
            .then(() => store.unlinkProvider('google'))
            .then(() => {
                expect(requests().slice(-3)).toEqual([
                    'GET /account/oauth/links',
                    'DELETE /account/oauth/links/google',
                    'GET /account/oauth/links'
                ]);
            });
    });

    it('a payload without the list reads as no links', () => {
        vi.mocked(orvalMutator).mockImplementationOnce(() =>
            Promise.resolve({ success: true, status: 200, message: 'OK', data: {} })
        );
        const store = useOAuthLinksStore();

        return store.fetchLinks().then(() => {
            expect(store.links).toEqual([]);
        });
    });
});
