/**
 * @module
 * Pinia store (Composition API form) wrapping `useStructureRestApi` for the device-session list:
 * a plain ref rather than the record structure, since a session has no detail page and the list
 * is only ever read whole.
 */
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import { listSessions as apiListSessions, revokeSession as apiRevokeSession } from '@api';
import { getPayloadFromResponse } from '@/infrastructure/http/envelope.ts';
import { queryClient } from '@/infrastructure/query-client.ts';
import type { Session } from '@types';

/**
 * The visitor's device-session list — who else is signed in, and the one-at-a-time end button.
 * Scoped to `ProfileSessions.vue`, the only component that renders it; ending EVERY session at
 * once is `stores/auth.ts`'s `logoutEverywhere`, which this store has no reason to call.
 */
export const useAccountSessionsStore = defineStore('accountSessions', () => {
    /**
     * The toolkit's REST slice for this store: the loading flag and the `fetchAny` wrapper
     * every action below goes through.
     */
    const { loading, fetchAny } = useStructureRestApi<Session, string>({
        resourceKey: 'accountSessions',
        queryClient
    });

    /**
     * The visitor's live sessions — one entry per refresh token, the current one flagged.
     * A plain ref rather than the record structure: a session is not a domain record, it has no
     * detail page, and the list is only ever read whole.
     */
    const sessions = ref<Session[]>([]);

    /**
     * Loads the sessions list.
     *
     * @returns A promise resolving with the sessions.
     */
    const fetchSessions = () =>
        fetchAny(() =>
            apiListSessions().then((data) => {
                const payload = getPayloadFromResponse<{ sessions: Session[] }>(data);
                sessions.value = payload?.sessions ?? [];
                return sessions.value;
            })
        );

    /**
     * Ends one session — "log out that device" — and reloads the list, because the answer worth
     * rendering after a revocation is the list without it. Revoking the caller's OWN session skips
     * the reload: the server has already cleared its cookies, so the list read would be a 401 that
     * hides the sign-out the caller is about to see.
     *
     * @param sessionId - Handle from {@link fetchSessions}; never a token value.
     * @param options - `current`: the session being ended is the one this tab is using.
     * @returns A promise resolving with the refreshed sessions, or with nothing for the own session.
     */
    const revokeSession = (sessionId: string, { current = false }: { current?: boolean } = {}) =>
        fetchAny(() =>
            apiRevokeSession(sessionId).then(() => (current ? undefined : fetchSessions()))
        );

    return {
        sessions,
        loading,
        fetchSessions,
        revokeSession
    };
});
