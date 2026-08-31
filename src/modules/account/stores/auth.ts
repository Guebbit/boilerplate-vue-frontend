/**
 * @module
 * Pinia store (Composition API form) for session lifecycle: wraps `useStructureRestApi` for the
 * login/signup/reset calls, and each action chains a `.then` into the session/profile stores it
 * coordinates rather than awaiting them stepwise.
 */
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import type { AxiosRequestConfig } from 'axios';
import { useSessionStore } from '@/infrastructure/stores/session.ts';
import { getTokenFromResponse } from '@/infrastructure/http/envelope.ts';
import {
    login as apiLogin,
    LoginRequestRemember,
    signup as apiSignup,
    signupWithMultipart,
    requestPasswordReset as apiRequestPasswordReset,
    confirmPasswordReset as apiConfirmPasswordReset
} from '@api';
import { useObservabilityStore } from '@/infrastructure/stores/observability.ts';
import { useProfileStore } from './profile.ts';

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
     * Authenticates the user, stores the access token, flags the `isAuth`
     * cookie and loads the profile.
     *
     * @param email - Account email.
     * @param password - Plain-text password, sent over the wire only.
     * @param remember - The "remember me" checkbox. One checkbox, one tier: thirty days is what
     *  the phrase conventionally promises, so it maps to `medium`. Unchecked, the refresh cookie
     *  the API sets lives only as long as an access token.
     * @returns A promise resolving once the token is stored and the profile has
     *  been (re)fetched.
     */
    const login = (email: string, password: string, remember = false) =>
        fetchAny(() =>
            apiLogin({
                email,
                password,
                remember: remember ? LoginRequestRemember.medium : undefined
            })
                .then((data) => {
                    session.setAccessToken(getTokenFromResponse(data));
                })
                .then(() => useProfileStore().fetchProfile(true))
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
     *  `multipart/form-data`.
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
            imageUpload
        }: {
            email: string;
            password: string;
            username?: string;
            passwordConfirm?: string;
            imageUpload?: File;
        },
        options?: AxiosRequestConfig
    ) =>
        fetchAny(() =>
            (imageUpload
                ? signupWithMultipart(
                      { email, username, password, passwordConfirm, imageUpload },
                      options
                  )
                : apiSignup({ email, username, password, passwordConfirm }, options)
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
        signup,
        requestPasswordReset,
        confirmPasswordReset,
        logout,
        logoutEverywhere
    };
});
