/**
 * @module
 * Pinia store (Composition API form) for the one screen between a sign-in and a session when the
 * account is in the grace of its own deletion: the credentials checked out, the server issued a
 * claim check instead of a session, and the visitor chooses to restore the account or walk away.
 * Holds the claim check from whichever door brought it here (the password step, the second step,
 * or an OAuth redirect, where the check itself rides a cookie) and redeems it.
 */
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import { queryClient } from '@/infrastructure/query-client.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { loginRestore as apiLoginRestore, RememberTier } from '@api';
import { useProfileStore } from './profile.ts';
import type { LoginOutcome } from './auth.ts';

/**
 * The offer on screen: when the account is erased, and how long this sign-in may still redeem it.
 * `challenge` and `remember` are absent for an OAuth sign-in, whose check rides an httpOnly cookie
 * and which has no "remember me" box.
 */
interface PendingRestore {
    /** Claim check from the sign-in, submitted to `POST /account/login/restore`. */
    challenge?: string;
    /** When the claim check stops being accepted. */
    expiresAt: string;
    /** When the account is erased unless restored. */
    purgeAt: string;
    /** The "remember me" choice of the form it came from, forwarded to the session. */
    remember?: boolean;
}

/**
 * The restore offer and its two outcomes: restore and sign in, or leave it to be erased.
 */
export const useDeletionRestoreStore = defineStore('accountDeletionRestore', () => {
    /**
     * The toolkit's REST slice for this store: the loading flag and the `fetchAny` wrapper.
     */
    const { loading, fetchAny } = useStructureRestApi({
        resourceKey: 'accountDeletionRestore',
        queryClient
    });

    /**
     * The live offer, or `undefined` when there is none (a reload, a bookmarked URL, a spent one).
     */
    const pending = ref<PendingRestore>();

    /**
     * Opens the offer from a password or second-step sign-in.
     *
     * @param outcome - The `deletion-pending` branch of a login outcome.
     * @param remember - The "remember me" box of the form, carried to the session it will start.
     */
    const begin = (
        outcome: Extract<LoginOutcome, { kind: 'deletion-pending' }>,
        remember: boolean
    ) => {
        pending.value = {
            challenge: outcome.challenge,
            expiresAt: outcome.expiresAt,
            purgeAt: outcome.purgeAt,
            remember
        };
    };

    /**
     * Opens the offer for an OAuth sign-in: only the dates come back in the redirect, the claim
     * check itself stays in the cookie the backend reads.
     *
     * @param parsed - `purgeAt` and `expiresAt`, read off the callback redirect's query string.
     */
    const beginOAuth = (parsed: { purgeAt: string; expiresAt: string }) => {
        pending.value = { ...parsed };
    };

    /**
     * Drops the offer: spent, expired, or the visitor chose to leave.
     */
    const clear = () => {
        pending.value = undefined;
    };

    /**
     * Redeems the claim check: the server cancels the deletion and starts the session, which is
     * adopted exactly as a plain login's is.
     *
     * @returns A promise resolving once the session is adopted and the profile loaded; rejected
     *  with `NO_ACTIVE_RESTORE` when there is no offer, and with the API's 401 for a spent or
     *  expired claim check.
     */
    const restoreAndSignIn = () => {
        if (!pending.value) return Promise.reject(new Error('NO_ACTIVE_RESTORE'));
        const { challenge, remember } = pending.value;
        return fetchAny(() =>
            apiLoginRestore({
                challenge,
                remember: remember ? RememberTier.long : undefined
            }).then((data) => {
                useSessionStore().adoptSession(data, remember ?? false);
                return useProfileStore()
                    .fetchProfile(true)
                    .then(() => {
                        clear();
                    });
            })
        );
    };

    return { pending, loading, begin, beginOAuth, clear, restoreAndSignIn };
});
