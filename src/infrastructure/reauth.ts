/**
 * @module
 * The step-up re-proof: the dialog's own spinner and write, plus the two stateless calls that feed
 * it (the ways an account may answer, and the mailed code). It renews the session through `useSessionStore().adoptSession` and shares no other
 * state with it. Lives in `infrastructure`, not in `account`, because the shell renders the prompt
 * on every page.
 */
import { ref } from 'vue';
import { defineStore } from 'pinia';
import {
    reauth as apiReauth,
    getReauthMethods as apiGetReauthMethods,
    sendReauthCode as apiSendReauthCode
} from '@api';
import { ERROR_CODES } from '@api/error-codes';
import { getPayloadFromResponse, getRetryAfter } from '@/infrastructure/http/envelope.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import type { ReauthMethod, ReauthMethods, ReauthRequest, TwoFactorDelivery } from '@types';

/**
 * The seconds a refused step-up code send still has to wait, read off its 429.
 *
 * @param error - The rejected value `sendReauthCode()` threw.
 * @returns Seconds to wait, or `undefined` when this was not that refusal.
 */
export const reauthSendRetryAfter = (error: unknown): number | undefined =>
    getRetryAfter(error, ERROR_CODES.TWO_FACTOR_RESEND_TOO_SOON);

/**
 * Which ways this account can answer the step-up prompt, in the order to offer them. The
 * server decides: the kernel that raises the challenge cannot see whether the account has a
 * password.
 *
 * @returns The methods; empty when the account has no password and mail cannot be delivered.
 */
export const reauthMethods = (): Promise<ReauthMethod[]> =>
    apiGetReauthMethods().then(
        (data) => getPayloadFromResponse<ReauthMethods>(data)?.methods ?? []
    );

/**
 * Mails the visitor their step-up code — only an account with no password may ask.
 *
 * @returns The server's own resend cooldown in seconds; counting it down means the 429 the
 *  endpoint answers inside it is never met.
 */
export const sendReauthCode = (): Promise<number> =>
    // 'email' is the delivery channel; it is the only one the endpoint offers.
    apiSendReauthCode('email').then(
        (data) => getPayloadFromResponse<TwoFactorDelivery>(data)?.resendAfter ?? 0
    );

/**
 * Store instance: the step-up prompt's spinner and its one write.
 */
export const useReauthStore = defineStore('reauth', () => {
    /**
     * Whether a re-proof is in flight — the step-up dialog's own spinner, so it does not answer
     * to a login or a signup running behind it.
     */
    const reauthing = ref(false);

    /**
     * Proves who the visitor is again and adopts the re-minted session — the step-up prompt's
     * one write.
     *
     * @param proof - The tagged body: a password, or the code mailed to an account with none.
     * @returns A promise resolving once the fresh token is stored; rejects with the API's error
     *  (a 422 means a wrong password or code — the API keeps 401 for "your session is gone").
     */
    const reauth = (proof: ReauthRequest): Promise<void> => {
        reauthing.value = true;
        return apiReauth(proof)
            .then((data) => {
                useSessionStore().adoptSession(data);
            })
            .finally(() => {
                reauthing.value = false;
            });
    };

    return { reauthing, reauth };
});
