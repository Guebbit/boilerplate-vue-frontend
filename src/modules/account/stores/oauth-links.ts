/**
 * @module
 * Pinia store (Composition API form) for the visitor's connected sign-in providers: the list,
 * connecting one and disconnecting one. A plain ref rather than the record structure — a link has no detail page and
 * is only ever read whole. Not `oauth.ts`: that store holds the deployment's provider list, a
 * public fact, where this one is the signed-in visitor's own.
 */
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import {
    listOAuthLinks as apiListOAuthLinks,
    startOAuthLink as apiStartOAuthLink,
    unlinkOAuthProvider as apiUnlinkOAuthProvider
} from '@api';
import { getPayloadFromResponse } from '@/infrastructure/http/envelope.ts';
import { queryClient } from '@/infrastructure/query-client.ts';
import type { OAuthLink, OAuthLinks, OAuthLinkStart } from '@types';

/**
 * Starts connecting a provider to the signed-in account: the server issues a short-lived connect
 * attempt (cookies) and answers the provider's consent URL, which the caller navigates the browser
 * to. A fresh session is required; the shared step-up prompt answers a stale one. Nothing is stored:
 * the account is only linked once the browser comes back through the callback, and the panel
 * re-reads the list then.
 *
 * @param provider - Registry key from `GET /account/oauth/providers`, e.g. `'google'`.
 * @param options - Where to land afterwards (a same-origin path) and the visitor's language.
 * @returns A promise resolving with the provider's consent URL.
 * @throws {Error} when the server answers no URL to go to.
 */
export const startProviderLink = (
    provider: string,
    options: { continueTo?: string; locale?: string } = {}
): Promise<string> =>
    apiStartOAuthLink(provider, {
        ...(options.continueTo ? { continue: options.continueTo } : {}),
        ...(options.locale ? { locale: options.locale } : {})
    }).then((data) => {
        const authorizeUrl = getPayloadFromResponse<OAuthLinkStart>(data)?.authorizeUrl;
        if (!authorizeUrl) throw new Error('The server answered no consent URL to connect to.');
        return authorizeUrl;
    });

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
