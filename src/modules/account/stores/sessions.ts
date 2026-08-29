import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import { getSessions as apiGetSessions, revokeSession as apiRevokeSession } from '@api';
import { getPayloadFromResponse } from '@/infrastructure/http/envelope.ts';
import type { Session } from '@types';

/**
 * The visitor's device-session list — who else is signed in, and the one-at-a-time end button.
 * Scoped to `ProfileSessions.vue`, the only component that renders it; ending EVERY session at
 * once is `stores/auth.ts`'s `logoutEverywhere`, which this store has no reason to call.
 */
export const useAccountSessionsStore = defineStore('accountSessions', () => {
    const { getLoading, setLoading } = useCoreStore();
    const { loading, fetchAny } = useStructureRestApi<Session, string>({ getLoading, setLoading });

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
            apiGetSessions().then((data) => {
                const payload = getPayloadFromResponse<{ sessions: Session[] }>(data);
                sessions.value = payload?.sessions ?? [];
                return sessions.value;
            })
        );

    /**
     * Ends one session — "log out that device" — and reloads the list, because the answer worth
     * rendering after a revocation is the list without it.
     *
     * @param sessionId - Handle from {@link fetchSessions}; never a token value.
     * @returns A promise resolving with the refreshed sessions.
     */
    const revokeSession = (sessionId: string) =>
        fetchAny(() => apiRevokeSession(sessionId).then(() => fetchSessions()));

    return {
        sessions,
        loading,
        fetchSessions,
        revokeSession
    };
});
