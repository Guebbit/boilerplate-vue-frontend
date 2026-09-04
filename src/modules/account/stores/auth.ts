/**
 * @module
 * Pinia store (Composition API form) for session lifecycle: wraps `useStructureRestApi` for the
 * login/signup/reset calls, and each action chains a `.then` into the session/profile stores it
 * coordinates rather than awaiting them stepwise.
 */
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import type { AxiosRequestConfig } from 'axios';
import { useSessionStore } from '@/infrastructure/session.ts';
import { getTokenFromResponse, getPayloadFromResponse } from '@/infrastructure/http/envelope.ts';
import {
    login as apiLogin,
    LoginRequestRemember,
    signup as apiSignup,
    signupWithMultipart,
    requestPasswordReset as apiRequestPasswordReset,
    confirmPasswordReset as apiConfirmPasswordReset,
    reauth as apiReauth
} from '@api';
import type { MfaChallenge, LoginOutcome as ApiLoginOutcome } from '@api';
import { useObservabilityStore } from '@/infrastructure/observability/store.ts';
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
    const session = useSessionStore();
    const { getLoading, setLoading } = useCoreStore();
    const { fetchAny } = useStructureRestApi({ getLoading, setLoading });

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
     * @returns A promise resolving with the {@link LoginOutcome}, or `undefined` on the rare path
     *  where `fetchAny` swallows the call (an overlapping in-flight request); a call site treats
     *  that the same as `'session'`, matching what this action always did before it returned
     *  anything meaningful.
     */
    const login = (email: string, password: string, remember = false) =>
        fetchAny<LoginOutcome>(() =>
            apiLogin({
                email,
                password,
                remember: remember ? LoginRequestRemember.medium : undefined
            }).then((data) => {
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
        );

    /**
     * Re-proves the caller's password to answer a `REAUTH_REQUIRED` 401, without ending the
     * session. Adopts the rotated access token exactly as {@link changePassword} in
     * `stores/profile.ts` does after a password change — dropping it would leave the stale token
     * in the store, and the request the step-up interceptor is about to replay would 401 again.
     *
     * @param password - The credential being re-proven.
     * @returns A promise resolving once the fresh token is stored.
     */
    const reauth = (password: string) =>
        fetchAny(() =>
            apiReauth({ password }).then((data) => {
                session.setAccessToken(getTokenFromResponse(data));
            })
        );

    /**
     * Registers a new user account, as multipart when a profile image is attached
     * and as plain JSON otherwise.
     *
     * The backend does not auto-login on signup: the user must confirm their
     * email address and then log in separately, so no token/session is set here.
     *
     * Takes its fields as one object rather than positionally, matching
     * `createUser` / `createProduct`. Positionally this reached six arguments,
     * two of them defaulted from earlier ones — an arity at which a caller can
     * transpose `imageUpload` and `options`, or forget that `passwordConfirm`
     * defaults from `password` while `username` defaults from `email`, with
     * nothing but argument order to catch it.
     *
     * @param credentials - Account fields. `username` defaults to `email` and
     *  `passwordConfirm` to `password`; an `imageUpload` switches the call to
     *  `multipart/form-data`. `termsAccepted` must be `true` — the contract
     *  declares it `enum: [true]` — and `analyticsConsent` is opt-in, omittable.
     * @param options - Per-call axios overrides, forwarded to `orvalMutator` —
     *  `Signup.vue` passes `onUploadProgress` through it.
     * @returns A promise resolving once the account has been created.
     */
    const signup = (
        {
            email,
            password,
            username = email,
            passwordConfirm = password,
            termsAccepted,
            analyticsConsent,
            imageUpload
        }: {
            email: string;
            password: string;
            username?: string;
            passwordConfirm?: string;
            termsAccepted: true;
            analyticsConsent?: boolean;
            imageUpload?: File;
        },
        options?: AxiosRequestConfig
    ) =>
        fetchAny(() =>
            (imageUpload
                ? signupWithMultipart(
                      {
                          email,
                          username,
                          password,
                          passwordConfirm,
                          termsAccepted,
                          analyticsConsent,
                          imageUpload
                      },
                      options
                  )
                : apiSignup(
                      {
                          email,
                          username,
                          password,
                          passwordConfirm,
                          termsAccepted,
                          analyticsConsent
                      },
                      options
                  )
            ).then(() => undefined)
        );

    /**
     * Starts the password reset flow by sending a token to the provided email.
     *
     * @param email - Email of the account to reset.
     * @returns A promise resolving once the request has been accepted.
     */
    const requestPasswordReset = (email: string) =>
        fetchAny(() => apiRequestPasswordReset({ email }));

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
        reauth,
        signup,
        requestPasswordReset,
        confirmPasswordReset,
        logout,
        logoutEverywhere
    };
});
