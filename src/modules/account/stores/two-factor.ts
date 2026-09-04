/**
 * @module
 * Pinia store (Composition API form) for every 2FA surface: the account's armed/available
 * methods, the enrollment machine (setup → confirm → backup codes), and the login-time challenge
 * (send → submit). A `resendAfter` countdown ticks here rather than in each component, since both
 * the login challenge and the enrollment panel need the same server-driven number.
 */
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import {
    getTwoFactorStatus as apiGetTwoFactorStatus,
    setupTwoFactorMethod as apiSetupTwoFactorMethod,
    confirmTwoFactorMethod as apiConfirmTwoFactorMethod,
    removeTwoFactorMethod as apiRemoveTwoFactorMethod,
    disableTwoFactor as apiDisableTwoFactor,
    sendTwoFactorCode as apiSendTwoFactorCode,
    loginTwoFactor as apiLoginTwoFactor
} from '@api';
import { getPayloadFromResponse, getTokenFromResponse } from '@/infrastructure/http/envelope.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useProfileStore } from './profile.ts';
import type {
    TwoFactorStatus,
    TwoFactorSetup,
    TwoFactorConfirmed,
    TwoFactorDelivery,
    TwoFactorMethodSummary
} from '@api';
import type { LoginOutcome } from './auth.ts';

/**
 * The login-time challenge, as handed off by `useAuthStore().login()`'s `mfa` branch, plus the
 * "remember me" choice the visitor made on the form it came from — an `MfaChallenge` response
 * carries no `remember` field, so the form's own choice has to survive the hop across the two
 * steps for {@link submitLoginCode} to apply it.
 */
interface LoginChallenge {
    challenge: string;
    expiresAt: string;
    methods: TwoFactorMethodSummary[];
    defaultMethod?: string;
    remember: boolean;
}

/**
 * Reads `errors[0].details.retryAfter` off a `TWO_FACTOR_RESEND_TOO_SOON` rejection, without
 * trusting the shape past the wire — the same duck-typing `checkout-errors.ts` uses. Module-level
 * rather than inside the store: it captures no store state, only the error it is handed.
 *
 * @param error - Whatever a `.catch` caught, still unknown at this boundary.
 * @returns The seconds to wait, or `undefined` when this is not that rejection.
 */
const resendRetryAfter = (error: unknown): number | undefined => {
    if (typeof error !== 'object' || error === null) return undefined;
    const items = (error as { errors?: unknown }).errors;
    if (!Array.isArray(items) || items.length === 0) return undefined;
    const [item] = items as unknown[];
    if (typeof item !== 'object' || item === null) return undefined;
    const { code, details } = item as { code?: unknown; details?: unknown };
    if (code !== 'TWO_FACTOR_RESEND_TOO_SOON') return undefined;
    const retryAfter = (details as { retryAfter?: unknown } | undefined)?.retryAfter;
    return typeof retryAfter === 'number' ? retryAfter : undefined;
};

/**
 * Account-wide 2FA: status, enrollment, and the login-time challenge.
 *
 * Deliberately one store rather than three: the enrollment machine and the status list answer the
 * same `GET /account/2fa`, and the login challenge shares the resend countdown with enrollment's
 * own "send me a code" step. Follows `stores/sessions.ts` — plain refs, actions that re-read from
 * the server rather than patch state locally.
 */
export const useTwoFactorStore = defineStore('accountTwoFactor', () => {
    const { getLoading, setLoading } = useCoreStore();
    const { loading, fetchAny } = useStructureRestApi({ getLoading, setLoading });

    /**
     * What this account has armed and could still add. `undefined` until {@link fetchStatus}
     * resolves once.
     */
    const status = ref<TwoFactorStatus>();

    /**
     * The pending enrollment for whichever method {@link setupMethod} was last called with.
     */
    const setup = ref<TwoFactorSetup>();

    /**
     * The result of the most recent {@link confirmMethod} call — carries `backupCodes` only when
     * that confirm armed the account's FIRST factor.
     */
    const confirmed = ref<TwoFactorConfirmed>();

    /**
     * The live login-time challenge, from `useAuthStore().login()`'s `mfa` branch. `undefined`
     * outside the 2FA login step.
     */
    const challenge = ref<LoginChallenge>();

    /**
     * The most recent code delivery — login-challenge send, or an enrollment send — whichever
     * happened last. Both read `resendAfter` off it the same way.
     */
    const delivery = ref<TwoFactorDelivery>();

    /**
     * Wall-clock time {@link delivery}'s `resendAfter` counts down to, in epoch ms. `undefined`
     * once the cooldown has elapsed or nothing has been sent yet.
     */
    const resendAvailableAt = ref<number>();

    /**
     * Ticks once a second while a cooldown is running, so {@link secondsUntilResend} recomputes.
     */
    const now = ref(Date.now());

    /**
     * Handle for the ticking interval above; `undefined` while nothing is counting down.
     */
    let tickHandle: ReturnType<typeof setInterval> | undefined;

    /**
     * Starts the one-second tick, idempotently — refreshing `now` immediately, not just once the
     * first interval fires a second later. Without that, `now` stays frozen at whenever the STORE
     * was created, which is generally well before whatever just called this, and every read of
     * {@link secondsUntilResend} in between reads a countdown inflated by that drift.
     */
    const startTicking = () => {
        now.value = Date.now();
        if (tickHandle) return;
        tickHandle = setInterval(() => {
            now.value = Date.now();
        }, 1000);
    };

    /**
     * Stops the tick and drops the target — called once the cooldown reaches zero.
     */
    const stopTicking = () => {
        if (tickHandle) clearInterval(tickHandle);
        tickHandle = undefined;
        resendAvailableAt.value = undefined;
    };

    /**
     * Seconds left before a resend is allowed again. Counts down from the SERVER's `resendAfter`
     * — never a client-invented cooldown, so it can never disagree with the rate limiter.
     */
    const secondsUntilResend = computed(() => {
        if (!resendAvailableAt.value) return 0;
        const remaining = Math.ceil((resendAvailableAt.value - now.value) / 1000);
        if (remaining <= 0) {
            stopTicking();
            return 0;
        }
        return remaining;
    });

    /**
     * Records a fresh delivery and (re)starts its cooldown.
     *
     * @param nextDelivery - The `sentTo` / `resendAfter` / `expiresAt` triple from a send or setup
     *  response.
     */
    const trackDelivery = (nextDelivery: TwoFactorDelivery) => {
        delivery.value = nextDelivery;
        resendAvailableAt.value = Date.now() + nextDelivery.resendAfter * 1000;
        startTicking();
    };

    /**
     * Starts the resend cooldown from a 429's OWN `retryAfter` when that is what failed the call,
     * then rethrows — the caller still sees the rejection to report it, but the countdown is
     * already running by the time it does, so the button cannot be hammered while the server is
     * still refusing it. Wraps {@link setupMethod} and {@link sendLoginCode}: the only two calls
     * this cooldown can be answered to.
     *
     * @param promise - The in-flight setup/send call.
     * @returns The same promise, untouched on any other outcome.
     */
    const applyResendCooldown = <T>(promise: Promise<T>): Promise<T> =>
        promise.catch((error: unknown) => {
            const retryAfter = resendRetryAfter(error);
            if (retryAfter !== undefined) {
                resendAvailableAt.value = Date.now() + retryAfter * 1000;
                startTicking();
            }
            throw error;
        });

    /**
     * Loads the account's 2FA status: armed methods, what else could be added, and how many
     * backup codes remain.
     *
     * @returns A promise resolving with the status.
     */
    const fetchStatus = () =>
        fetchAny(() =>
            apiGetTwoFactorStatus().then((data) => {
                status.value = getPayloadFromResponse<TwoFactorStatus>(data);
                return status.value;
            })
        );

    /**
     * Begins — or restarts — enrollment of one method. Calling this on an already-armed method
     * disarms it and starts over; the caller (`TwoFactorEnroll.vue`) is the one that has to say so
     * before the click reaches here.
     *
     * @param method - Wire name of the method to enroll, e.g. `'email'`, `'totp'`.
     * @returns A promise resolving with the setup payload — `delivers` says which half to render.
     *  A `TWO_FACTOR_RESEND_TOO_SOON` 429 still rejects, but starts the resend cooldown first —
     *  see {@link applyResendCooldown}.
     */
    const setupMethod = (method: string) =>
        applyResendCooldown(
            fetchAny(() =>
                apiSetupTwoFactorMethod(method).then((data) => {
                    const payload = getPayloadFromResponse<TwoFactorSetup>(data);
                    setup.value = payload;
                    if (
                        payload?.delivers &&
                        payload.sentTo &&
                        payload.resendAfter &&
                        payload.expiresAt
                    )
                        trackDelivery({
                            method: payload.method,
                            sentTo: payload.sentTo,
                            resendAfter: payload.resendAfter,
                            expiresAt: payload.expiresAt
                        });
                    return payload;
                })
            )
        );

    /**
     * Arms the method pending from {@link setupMethod}, proving receipt of its code.
     *
     * @param method - The method being confirmed.
     * @param code - The code read off the device or received through its channel.
     * @returns A promise resolving with the confirmation once the account status has been
     *  refetched, so `status` never lags what the server just armed.
     */
    const confirmMethod = (method: string, code: string) =>
        fetchAny(() =>
            apiConfirmTwoFactorMethod(method, { code }).then((data) => {
                confirmed.value = getPayloadFromResponse<TwoFactorConfirmed>(data);
                setup.value = undefined;
                stopTicking();
                return fetchStatus().then(() => confirmed.value);
            })
        );

    /**
     * Drops one armed method, proving it (or a backup code) first. Removing the last one turns
     * 2FA off and discards the backup codes with it — the caller must have said so already.
     *
     * @param method - The method to remove.
     * @param code - A code from any armed method, or an unused backup code.
     * @returns A promise resolving once `status` reflects the removal.
     */
    const removeMethod = (method: string, code: string) =>
        fetchAny(() => apiRemoveTwoFactorMethod(method, { code }).then(() => fetchStatus()));

    /**
     * Drops EVERY armed method and every unused backup code in one call.
     *
     * @param code - A code from any armed method, or an unused backup code.
     * @returns A promise resolving once `status` reflects 2FA being off.
     */
    const disableAll = (code: string) =>
        fetchAny(() => apiDisableTwoFactor({ code }).then(() => fetchStatus()));

    /**
     * Clears the pending-enrollment state — the "never mind" path out of `TwoFactorEnroll.vue`.
     */
    const clearSetup = () => {
        setup.value = undefined;
        confirmed.value = undefined;
        stopTicking();
    };

    /**
     * Opens the login-time challenge, from `useAuthStore().login()`'s `mfa` branch.
     *
     * @param outcome - The `mfa` branch of a {@link LoginOutcome}.
     * @param remember - The "remember me" checkbox from the login form, carried across to
     *  {@link submitLoginCode} — the challenge response itself has nowhere to hold it.
     */
    const beginLoginChallenge = (
        outcome: Extract<LoginOutcome, { kind: 'mfa' }>,
        remember: boolean
    ) => {
        challenge.value = {
            challenge: outcome.challenge,
            expiresAt: outcome.expiresAt,
            methods: outcome.methods,
            defaultMethod: outcome.defaultMethod,
            remember
        };
    };

    /**
     * Drops the live login challenge — spent, expired, or the visitor navigated away.
     */
    const clearChallenge = () => {
        challenge.value = undefined;
        delivery.value = undefined;
        stopTicking();
    };

    /**
     * Sends a fresh login code through one of the challenge's delivered methods.
     *
     * @param method - A `method` from `challenge.value.methods` whose `delivers` is `true`.
     * @returns A promise resolving once the code is sent, rejected with `NO_ACTIVE_CHALLENGE` when
     *  called with no live challenge. A `TWO_FACTOR_RESEND_TOO_SOON` 429 still rejects, but starts
     *  the resend cooldown first — see {@link applyResendCooldown}.
     */
    const sendLoginCode = (method: string) => {
        if (!challenge.value) return Promise.reject(new Error('NO_ACTIVE_CHALLENGE'));
        return applyResendCooldown(
            fetchAny(() =>
                apiSendTwoFactorCode({ challenge: challenge.value!.challenge, method }).then(
                    (data) => {
                        const payload = getPayloadFromResponse<TwoFactorDelivery>(data);
                        if (payload) trackDelivery(payload);
                        return payload;
                    }
                )
            )
        );
    };

    /**
     * Submits a code (or an unused backup code) against the live login challenge. On success,
     * adopts the session exactly as a plain login does — token, `isAuth` cookie, and the freshly
     * fetched profile — then clears the challenge.
     *
     * @param code - The 6-digit code, or a backup code.
     * @returns A promise resolving once the session is established.
     */
    const submitLoginCode = (code: string) => {
        if (!challenge.value) return Promise.reject(new Error('NO_ACTIVE_CHALLENGE'));
        const { challenge: challengeToken, remember } = challenge.value;
        return fetchAny(() =>
            apiLoginTwoFactor({ challenge: challengeToken, code }).then((data) => {
                useSessionStore().setAccessToken(getTokenFromResponse(data), remember);
                return useProfileStore()
                    .fetchProfile(true)
                    .then(() => {
                        clearChallenge();
                    });
            })
        );
    };

    return {
        status,
        setup,
        confirmed,
        challenge,
        delivery,
        secondsUntilResend,
        loading,

        fetchStatus,
        setupMethod,
        confirmMethod,
        removeMethod,
        disableAll,
        clearSetup,

        beginLoginChallenge,
        clearChallenge,
        sendLoginCode,
        submitLoginCode
    };
});
