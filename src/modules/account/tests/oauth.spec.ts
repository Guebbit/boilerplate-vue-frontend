/**
 * @module
 * Unit tests for the OAuth provider store and its two pure helpers — mocking only the transport
 * and keying answers by request URL, same pattern as `sessions.spec.ts`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
    useOAuthProvidersStore,
    oauthStartUrl,
    providerLabel
} from '@/modules/account/stores/oauth.ts';
import { orvalMutator } from '@/infrastructure/http';

/**
 * Responses per endpoint, consulted by the mocked transport below and reset in `beforeEach`.
 */
let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        const response = responses[key];
        return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
    })
}));

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'GET /account/oauth/providers': { data: { providers: ['google', 'github'] } }
    };
});

describe('providerLabel', () => {
    it('overrides the names a bare capitalization gets wrong', () => {
        expect(providerLabel('github')).toBe('GitHub');
    });

    it('capitalizes anything it has no override for', () => {
        expect(providerLabel('google')).toBe('Google');
        expect(providerLabel('fake')).toBe('Fake');
    });
});

describe('oauthStartUrl', () => {
    it('points at the backend start-login route for that provider', () => {
        const apiUrl = import.meta.env.VITE_API_URL as string;
        expect(oauthStartUrl('google')).toBe(`${apiUrl}/account/oauth/google`);
    });
});

describe('useOAuthProvidersStore', () => {
    it('fetchProviders loads the enabled provider list', () =>
        useOAuthProvidersStore()
            .fetchProviders()
            .then((providers) => {
                expect(providers).toEqual(['google', 'github']);
                expect(useOAuthProvidersStore().providers).toEqual(['google', 'github']);
            }));

    it('a later call is a no-op, reusing the cached list', () =>
        useOAuthProvidersStore()
            .fetchProviders()
            .then(() => useOAuthProvidersStore().fetchProviders())
            .then(() => {
                expect(orvalMutator).toHaveBeenCalledTimes(1);
            }));

    it('a payload with no list reads as no providers', () => {
        responses['GET /account/oauth/providers'] = { data: undefined };
        return useOAuthProvidersStore()
            .fetchProviders()
            .then((providers) => {
                expect(providers).toEqual([]);
            });
    });

    it('a failed request resolves to the empty list and stays retryable', () => {
        responses['GET /account/oauth/providers'] = new Error('network down');
        const store = useOAuthProvidersStore();

        return store
            .fetchProviders()
            .then((providers) => {
                expect(providers).toEqual([]);
                // Not cached as "no providers, forever" — a transient failure gets another try.
                responses['GET /account/oauth/providers'] = { data: { providers: ['github'] } };
                return store.fetchProviders();
            })
            .then((providers) => {
                expect(providers).toEqual(['github']);
                expect(orvalMutator).toHaveBeenCalledTimes(2);
            });
    });
});
