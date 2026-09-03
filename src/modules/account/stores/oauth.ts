/**
 * @module
 * Pinia store (Composition API form) for the enabled OAuth provider list, plus the two pure
 * helpers `Login.vue`/`Signup.vue` need to render one button per provider. The list is a
 * deployment fact, not per-visitor state, so it is fetched once and reused rather than refetched
 * on every mount — see `fetchProviders`.
 */
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import { listOAuthProviders as apiListOAuthProviders } from '@api';
import { getPayloadFromResponse } from '@/infrastructure/http/envelope.ts';
import { instance } from '@/infrastructure/http/client.ts';

/**
 * Display names for the providers this app knows about. A name absent here still renders — see
 * {@link providerLabel} — this only overrides the ones a bare capitalization gets wrong (`GitHub`,
 * not `Github`).
 */
const PROVIDER_LABELS: Record<string, string> = {
    github: 'GitHub'
};

/**
 * The button label for one provider — an override from {@link PROVIDER_LABELS}, or the registry
 * name capitalized.
 *
 * @param provider - Registry key, e.g. `'google'`.
 * @returns A display name, e.g. `'Google'`.
 */
export const providerLabel = (provider: string): string =>
    PROVIDER_LABELS[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1);

/**
 * The URL a login button points at — a real navigation target, not an API call: the redirect
 * dance needs an actual top-level browser navigation to reach the provider's consent screen and
 * come back with cookies set, which neither a `RouterLink` nor an axios call can do.
 *
 * The prefix is read off the axios instance rather than `import.meta.env`, same reasoning as
 * `resolveImageUrl` — it follows the e2e shard runner's `__E2E_API_URL` override, a runtime value
 * a build-time env read can't see.
 *
 * @param provider - Registry key, e.g. `'google'`.
 * @returns The backend's start-login URL for that provider.
 */
export const oauthStartUrl = (provider: string): string =>
    `${instance.defaults.baseURL ?? ''}/account/oauth/${provider}`;

/**
 * The enabled OAuth providers — `Login.vue`/`Signup.vue` render one button per name, and render
 * none at all when the list is empty (no provider configured on this deployment).
 */
export const useOAuthProvidersStore = defineStore('accountOAuthProviders', () => {
    const { getLoading, setLoading } = useCoreStore();
    const { loading, fetchAny } = useStructureRestApi({ getLoading, setLoading });

    /** The enabled provider names, e.g. `['google', 'github']` — empty until loaded. */
    const providers = ref<string[]>([]);

    /** Whether {@link fetchProviders} has already resolved successfully once. */
    const loaded = ref(false);

    /**
     * Loads the provider list, once — a later call is a no-op that resolves with the cached
     * list. Failures are swallowed rather than surfaced as a toast: a login page working with no
     * OAuth buttons is a fine degraded state, and `loaded` stays `false` so the NEXT mount tries
     * again instead of caching a transient failure as "no providers, forever".
     *
     * @returns A promise resolving with the provider names.
     */
    const fetchProviders = () => {
        if (loaded.value) return Promise.resolve(providers.value);
        return fetchAny(() =>
            apiListOAuthProviders().then((data) => {
                const payload = getPayloadFromResponse<{ providers: string[] }>(data);
                providers.value = payload?.providers ?? [];
                loaded.value = true;
                return providers.value;
            })
        ).catch(() => providers.value);
    };

    return {
        providers,
        loading,
        fetchProviders
    };
});
