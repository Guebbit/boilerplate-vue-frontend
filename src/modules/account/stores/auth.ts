/**
 * @module
 * Pinia store (Composition API form) for session lifecycle: wraps `useStructureRestApi` for the
 * login/signup/reset calls, and each action chains a `.then` into the session/profile stores it
 * coordinates rather than awaiting them stepwise.
 */
import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import type { AxiosRequestConfig } from 'axios';
import { useSessionStore } from '@/infrastructure/session.ts';
import { queryClient } from '@/infrastructure/query-client.ts';
import { getTokenFromResponse, getPayloadFromResponse } from '@/infrastructure/http/envelope.ts';
import {
    login as apiLogin,
    LoginRequestRemember,
    signup as apiSignup,
    requestPasswordReset as apiRequestPasswordReset,
    confirmPasswordReset as apiConfirmPasswordReset
} from '@api';
import type { MfaChallenge, LoginOutcome as ApiLoginOutcome } from '@api';
import { useObservabilityStore } from '@/infrastructure/observability/store.ts';
import { useIdempotencyKey } from '@/infrastructure/http/idempotency.ts';
import { useProfileStore } from './profile.ts';

/**
 * What `login()` resolves with: a discriminated narrowing of the contract's own
 * `AuthTokens | MfaChallenge` union. A call site branches on `kind` instead of inferring "did
 * this establish a session" from which fields happen to be present.
 */
export type LoginOutcome =
    | { kind: 'session' }
    | {
          kind: 'mfa';
          /** Claim check for the half-finished login — not a code. Submit it to `/login/2fa[/send]`. */
          challenge: string;
          /** When the challenge stops being accepted. Count down from it; never hardcode a number. */
          expiresAt: string;
          /** The factors armed on this account, in the order to offer them. */
          methods: MfaChallenge['methods'];
          /** Which of `methods` to offer first. */
          defaultMethod?: string;
      };

/**
 * Establishing or ending a session: login, signup, password reset, and the two ways out (this
 * device, or every device).
 *
 * Deliberately NOT here: the editable record itself, once a session exists — that is
 * `stores/profile.ts`'s `useProfileStore`, which this store asks to load a profile after login
 * and to drop its cache on the way out. See `docs/theory/modules.md` for why this domain is split
 * this many ways.
 */
export const useAuthStore = defineStore('accountAuth', () => {
    /**
     * The session store, whose token and viewer this store writes.
     */
    const session = useSessionStore();

    /**
     * The toolkit's REST slice for this store: every action below goes
     * through `fetchAny`.
     */
    const { fetchAny } = useStructureRestApi({
        resourceKey: 'accountAuth',
        queryClient
    });

    /**
     * Authenticates the user. A plain account stores the access token, flags the `isAuth` cookie
     * and loads the profile; an account with two-factor armed resolves with the step-up challenge
     * instead — nothing here touches the session store on that branch, since an `MfaChallenge`
     * response carries no token to store.
     *
     * @param email - Account email.
     * @param password - Plain-text password, sent over the wire only.
     * @param remember - The "remember me" checkbox. One checkbox, one tier: thirty days is what
     *  the phrase conventionally promises, so it maps to `medium`. Unchecked, the refresh cookie
     *  the API sets lives only as long as an access token. Dropped by the backend on the 2FA path
     *  regardless of this value — see `TwoFactorChallenge.vue`.
     * @param options - Per-call axios overrides, forwarded to `orvalMutator` — `Login.vue` attaches
     *  a solved `HumanCheck` token through it on the retry after an `ANTIBOT_VERIFICATION_FAILED`
     *  refusal (rung 3 only engages once the per-identity failure budget is mostly spent).
     * @returns A promise resolving with the {@link LoginOutcome}.
     * @throws {Error} If `fetchAny` ever resolves without a value. It can't for this call — that
     *  only happens on its cached (`key`) path, and this call passes none — but if it ever did,
     *  failing loudly beats a caller silently treating a missing outcome as `'session'`.
     */
    const login = (
        email: string,
        password: string,
        remember = false,
        options?: AxiosRequestConfig
    ): Promise<LoginOutcome> =>
        fetchAny<LoginOutcome>(() =>
            apiLogin(
                {
                    email,
                    password,
                    remember: remember ? LoginRequestRemember.medium : undefined
                },
                options
            ).then((data) => {
                const payload = getPayloadFromResponse<ApiLoginOutcome>(data);
                // `in` rather than a property read: `AuthTokens` carries no `mfaRequired` field at
                // all, so the union needs a guard TS can narrow on rather than an optional access.
                if (payload && 'mfaRequired' in payload)
                    return {
                        kind: 'mfa',
                        challenge: payload.challenge,
                        expiresAt: payload.expiresAt,
                        methods: payload.methods,
                        defaultMethod: payload.defaultMethod
                    } as const;

                session.setAccessToken(getTokenFromResponse(data), remember);
                return useProfileStore()
                    .fetchProfile(true)
                    .then(() => ({ kind: 'session' }) as const);
            })
        ).then((outcome) => {
            if (!outcome) throw new Error('login(): fetchAny resolved without a value');
            return outcome;
        });

    /**
     * `Idempotency-Key` for `signup` (B10) — a network error or a 5xx during the round trip
     * resends the SAME key on retry, so a lost response never creates two accounts; any other
     * outcome (success, or a 422 like "email taken") mints a fresh one for the next attempt.
     */
    const signupIdempotencyKey = useIdempotencyKey();

    /**
     * Registers a new user account — JSON only. The API takes no image at signup (a stranger
     * writes nothing to the store before registering), so a picked avatar is a follow-up
     * {@link setAvatarAfterSignup}.
     *
     * Signup DOES sign the caller in: the response sets the session cookies, and the router's
     * restore guard (or {@link setAvatarAfterSignup}) mints the access token from them.
     *
     * Takes its fields as one object rather than positionally, matching
     * `createUser` / `createProduct`: `username` defaults from `email` and `passwordConfirm`
     * from `password`, which nothing but argument order would otherwise keep straight.
     *
     * @param credentials - Account fields. `username` defaults to `email` and
     *  `passwordConfirm` to `password`. `termsAccepted` must be `true` — the contract
     *  declares it `enum: [true]` — and `analyticsConsent` is opt-in, omittable.
     * @param options - Per-call axios overrides, forwarded to `orvalMutator`.
     * @returns A promise resolving once the account has been created.
     */
    const signup = (
        {
            email,
            password,
            username = email,
            passwordConfirm = password,
            termsAccepted,
            analyticsConsent
        }: {
            email: string;
            password: string;
            username?: string;
            passwordConfirm?: string;
            termsAccepted: true;
            analyticsConsent?: boolean;
        },
        options?: AxiosRequestConfig
    ) =>
        fetchAny(() =>
            apiSignup(
                {
                    email,
                    username,
                    password,
                    passwordConfirm,
                    termsAccepted,
                    analyticsConsent
                },
                signupIdempotencyKey.withKey(options)
            )
                .then(() => {
                    signupIdempotencyKey.settle();
                    return undefined;
                })
                .catch((error: unknown) => {
                    signupIdempotencyKey.settle(error);
                    throw error;
                })
        );

    /**
     * The second half of a signup that picked an avatar: `PATCH /account` with the file, as the
     * session `signup` just opened.
     *
     * Mints the access token first — signup sets cookies only — then loads the profile so the
     * store knows whose record it is patching. A failure here leaves a signed-in account with no
     * avatar, which the profile page fixes in one click.
     *
     * @param imageUpload - The file picked on the signup form.
     * @param options - Per-call axios overrides — `Signup.vue` passes `onUploadProgress`.
     * @returns A promise resolving once the avatar is stored.
     */
    const setAvatarAfterSignup = (imageUpload: File, options?: AxiosRequestConfig) => {
        const profile = useProfileStore();
        return session
            .refreshToken()
            .then(() => profile.fetchProfile(true))
            .then(() => profile.updateProfile({ imageUpload }, options));
    };

    /**
     * Starts the password reset flow by sending a token to the provided email.
     *
     * @param email - Email of the account to reset.
     * @param options - Per-call axios overrides, forwarded to `orvalMutator` —
     *  `PasswordResetRequest.vue` attaches a solved `HumanCheck` token through it: this route is
     *  always guarded by `humanChallengeGate` once a provider is active.
     * @returns A promise resolving once the request has been accepted.
     */
    const requestPasswordReset = (email: string, options?: AxiosRequestConfig) =>
        fetchAny(() => apiRequestPasswordReset({ email }, options));

    /**
     * Completes the password reset using the one-time token and a new password.
     *
     * @param token - One-time token received by email.
     * @param password - New password.
     * @param passwordConfirm - Confirmation of the new password.
     * @returns A promise resolving once the password has been changed.
     */
    const confirmPasswordReset = (token: string, password: string, passwordConfirm: string) =>
        fetchAny(() => apiConfirmPasswordReset({ token, password, passwordConfirm }));

    /**
     * Logs out of THIS session and clears all cached user data. Other devices stay signed in —
     * ending everything is {@link logoutEverywhere}, offered from the sessions panel.
     *
     * @returns A promise resolving once the API call succeeds and the local
     *  token, cached records and `isAuth` cookie have been cleared. The httpOnly
     *  jwt cookie can only be cleared server-side.
     */
    const logout = () => {
        // The httpOnly jwt cookie can only be cleared server-side; isAuth is JS-accessible.
        useObservabilityStore().unidentifyUser();
        return session.logout().then(() => {
            useProfileStore().resetAll();
        });
    };

    /**
     * Ends EVERY session for this account — the compromised-credentials button.
     *
     * @returns A promise resolving once every refresh token is revoked and local state cleared.
     */
    const logoutEverywhere = () => {
        useObservabilityStore().unidentifyUser();
        return session.logoutAll().then(() => {
            useProfileStore().resetAll();
        });
    };

    return {
        login,
        signup,
        setAvatarAfterSignup,
        requestPasswordReset,
        confirmPasswordReset,
        logout,
        logoutEverywhere
    };
});
