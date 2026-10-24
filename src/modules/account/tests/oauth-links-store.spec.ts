/**
 * @module
 * Unit tests for the connected-providers store: the list, and removing one reloads it. Mocks only
 * the transport, keyed by request URL, same pattern as `sessions.spec.ts`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { startProviderLink, useOAuthLinksStore } from '../stores/oauth-links.ts';
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
        'DELETE /account/oauth/links/google': orvalEnvelope({ links: [] }),
        'POST /account/oauth/links/google': orvalEnvelope({
            authorizeUrl: 'https://accounts.example/consent?state=x'
        })
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

    it('unlinkProvider deletes the one link and keeps the links the answer carries, with no reload', () => {
        const store = useOAuthLinksStore();

        return store
            .fetchLinks()
            .then(() => store.unlinkProvider('google'))
            .then(() => {
                expect(requests()).toEqual([
                    'GET /account/oauth/links',
                    'DELETE /account/oauth/links/google'
                ]);
                expect(store.links).toEqual([]);
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

describe('startProviderLink', () => {
    it('posts to the provider and answers the consent URL, carrying where to land', async () => {
        const url = await startProviderLink('google', { continueTo: '/en/profile', locale: 'it' });

        expect(url).toBe('https://accounts.example/consent?state=x');
        const call = vi
            .mocked(orvalMutator)
            .mock.calls.find(
                ([config]) => (config as { method: string }).method === 'POST'
            )?.[0] as {
            url: string;
            params: Record<string, string>;
        };
        expect(call.url).toBe('/account/oauth/links/google');
        expect(call.params).toEqual({ continue: '/en/profile', locale: 'it' });
    });

    it('is an error when the server answers no URL', async () => {
        responses['POST /account/oauth/links/google'] = orvalEnvelope({});
        vi.mocked(orvalMutator).mockImplementationOnce(() =>
            Promise.resolve({ success: true, status: 200, message: 'OK', data: {} })
        );

        await expect(startProviderLink('google')).rejects.toThrow('no consent URL');
    });
});
