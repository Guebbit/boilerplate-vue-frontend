/**
 * @module
 * Pinia store (Composition API form) for the visitor's connected sign-in providers: the list, and
 * disconnecting one. A plain ref rather than the record structure — a link has no detail page and
 * is only ever read whole. Not `oauth.ts`: that store holds the deployment's provider list, a
 * public fact, where this one is the signed-in visitor's own.
 */
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import {
    listOAuthLinks as apiListOAuthLinks,
    unlinkOAuthProvider as apiUnlinkOAuthProvider
} from '@api';
import { getPayloadFromResponse } from '@/infrastructure/http/envelope.ts';
import { queryClient } from '@/infrastructure/query-client.ts';
import type { OAuthLink, OAuthLinks } from '@types';

/**
 * The providers linked to the signed-in account. Scoped to `ProfileConnectedAccounts.vue`.
 */
export const useOAuthLinksStore = defineStore('accountOAuthLinks', () => {
    /**
     * The toolkit's REST slice for this store: the loading flag and the `fetchAny` wrapper
     * every action below goes through.
     */
    const { loading, fetchAny } = useStructureRestApi<OAuthLink, string>({
        resourceKey: 'accountOAuthLinks',
        queryClient
    });

    /**
     * The linked providers, each with when it was connected. Never carries a provider's own id.
     */
    const links = ref<OAuthLink[]>([]);

    /**
     * Loads the connected providers.
     *
     * @returns A promise resolving with the links.
     */
    const fetchLinks = () =>
        fetchAny(() =>
            apiListOAuthLinks().then((data) => {
                links.value = getPayloadFromResponse<OAuthLinks>(data)?.links ?? [];
                return links.value;
            })
        );

    /**
     * Disconnects one provider and reloads the list, because the answer worth rendering after a
     * removal is the list without it. The server asks for a fresh session; the shared step-up
     * prompt answers that, so nothing here handles it.
     *
     * @param provider - Registry key from {@link fetchLinks}, e.g. `'google'`.
     * @returns A promise resolving with the refreshed links.
     */
    const unlinkProvider = (provider: string) =>
        fetchAny(() => apiUnlinkOAuthProvider(provider).then(() => fetchLinks()));

    return { links, loading, fetchLinks, unlinkProvider };
});
