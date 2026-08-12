import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import type { AxiosRequestConfig } from 'axios';
import { i18n } from '@/infrastructure/i18n.ts';
import {
    getPayloadFromResponse,
    getTokenFromResponse,
    useSessionStore
} from '@/infrastructure/session.ts';
import type { User } from '@types';
import {
    getAccount as apiGetAccount,
    requestAccountDelete as apiRequestAccountDelete,
    confirmAccountDelete as apiConfirmAccountDelete,
    login as apiLogin,
    signup as apiSignup,
    signupWithMultipart,
    requestPasswordReset as apiRequestPasswordReset,
    confirmPasswordReset as apiConfirmPasswordReset,
    updateUserById as apiUpdateUserById
} from '@api';
import { useObservabilityStore, analyticsEvents } from '@/infrastructure/observability';

/**
 * The account domain: the visitor's own record, and every operation that changes it.
 *
 * What is deliberately NOT here is the session — the access token and the `{ id, email, admin }`
 * projection the app shell and the router guards read. Those live in `@/infrastructure/session.ts`, because
 * `infrastructure/http` must attach a token before any domain exists and a guard must decide access before
 * any domain loads. This store *writes* into that projection whenever it learns something new
 * about the visitor, and reads nothing back from it that it did not put there.
 *
 * The division is by question, not by endpoint prefix. `GET /account`, `/account/refresh` and
 * `/account/logout-all` answer "who holds this token, is it still valid, end it" — session. Signup,
 * the password resets, the deletion flow and editing your own record are operations *on* an
 * account — here.
 */

/**
 * While we can't access to inject/provide in guards or any non-components,
 * we can access Pinia, so it is useful to safely store "global" variables (if needed)
 */
export const useAccountStore = defineStore('account', () => {
    const session = useSessionStore();
    const { getLoading, setLoading } = useCoreStore();
    const {
        selectedIdentifier,
        resetAll,
        selectedRecord: profile,
        loading,
        fetchAny,
        fetchTarget,
        updateTarget
    } = useStructureRestApi<User, string>({ getLoading, setLoading });

    /**
     * Warning: can't use useI18n because it wouldn't work in global guards
     * (It works correctly on changes and so on)
     */

    const profileLanguage = i18n.global.locale;

    /**
     * Push what the shell and the guards are allowed to know into the session store.
     *
     * Called on every path that learns the visitor's identity, so that `isAuth` / `isAdmin` never
     * lag behind the record this store holds.
     *
     * @param user - The freshly loaded or updated account record.
     */
    const publishViewer = (user?: User) => {
        session.setViewer(user && { id: user.id, email: user.email, admin: Boolean(user.admin) });
    };

    /**
     * Authenticates the user, stores the access token, flags the `isAuth`
     * cookie and loads the profile.
     *
     * @param email - Account email.
     * @param password - Plain-text password, sent over the wire only.
     * @returns A promise resolving once the token is stored and the profile has
     *  been (re)fetched.
     */
    const login = (email: string, password: string) =>
        fetchAny(() =>
            apiLogin({ email, password })
                .then((data) => {
                    session.setAccessToken(getTokenFromResponse(data));
                })
                .then(() => {
                    const obs = useObservabilityStore();
                    obs.track(analyticsEvents.USER_LOGGED_IN, { method: 'email' });
                    return fetchProfile(true);
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
            ).then(() => {
                const obs = useObservabilityStore();
                obs.track(analyticsEvents.USER_SIGNED_UP, { method: 'email' });
            })
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
     * Loads the authenticated user's profile and identifies them in the
     * observability tools.
     *
     * Requires authentication, but an expired or missing access token triggers
     * an automatic refresh (using the jwt refresh cookie) and a retry.
     *
     * @param forced - Bypass the store cache and always hit the API.
     * @returns A promise resolving with the profile, or `undefined` when the
     *  response carries no payload.
     */
    const fetchProfile = (forced = false) => {
        return fetchTarget(
            () =>
                apiGetAccount().then((data) => {
                    const payload = getPayloadFromResponse<User>(data);
                    if (!payload) return;
                    // to handle single-target stores we just need to select the correct identifier
                    selectedIdentifier.value = payload.id;
                    // Identify user in observability tools after profile is fetched
                    const obs = useObservabilityStore();
                    obs.identifyUser(payload.id, payload.email);
                    // Keep the shell's projection in step with the record just loaded.
                    publishViewer(payload);
                    return payload;
                }),
            undefined,
            { forced }
        );
    };

    /**
     * Updates the current user's own profile.
     *
     * @param userData - Fields to change; only `email`, `username` and
     *  `password` are sent to the API.
     * @returns A promise resolving with the updated profile, rejected with an
     *  `invalid user` error when no profile is selected.
     */
    const updateProfile = (userData: Partial<User> & { password?: string } = {}) => {
        if (!selectedIdentifier.value) return Promise.reject(new Error('invalid user'));
        return updateTarget(
            () =>
                apiUpdateUserById(selectedIdentifier.value!, {
                    email: userData.email,
                    password: userData.password,
                    username: userData.username
                }),
            userData,
            selectedIdentifier.value
        );
    };

    /**
     * Switches the user's language and persists the profile.
     *
     * @param language - Locale code to store, e.g. `it`. Defaults to an empty
     *  string, which clears the preference.
     * @returns A promise resolving with the updated profile.
     */
    const updateProfileLanguage = (language = '') => {
        // TODO check
        profileLanguage.value = language;
        return updateProfile({
            ...profile.value
        });
    };

    /**
     * Drops every trace of the current session: cached records, query cache, token and cookie.
     *
     * `resetAll()` rather than emptying `itemDictionary` by hand, because the hand-written version
     * left the TanStack entries behind — so a logout followed by a login could be served the
     * previous user's cached response until it went stale.
     *
     * @returns Nothing; state is cleared as a side effect.
     */
    const clearSession = () => {
        // `resetAll()` rather than emptying `itemDictionary` by hand, because the hand-written
        // version left the TanStack entries behind — so a logout followed by a login could be
        // served the previous user's cached response until it went stale.
        resetAll();
        session.clearSession();
    };

    /**
     * Logs out of every session and clears all cached user data.
     *
     * @returns A promise resolving once the API call succeeds and the local
     *  token, cached records and `isAuth` cookie have been cleared. The httpOnly
     *  jwt cookie can only be cleared server-side.
     */
    const logout = () => {
        // The httpOnly jwt cookie can only be cleared server-side; isAuth is JS-accessible.
        const obs = useObservabilityStore();
        obs.track(analyticsEvents.USER_LOGGED_OUT);
        obs.unidentifyUser();
        return session.logoutAll().then(() => {
            resetAll();
        });
    };

    /**
     * Initiates the account deletion flow, sending a confirmation token to the
     * user's email.
     *
     * @returns A promise resolving once the request has been accepted.
     */
    const requestAccountDelete = () => fetchAny(() => apiRequestAccountDelete());

    /**
     * Completes account deletion using the one-time token.
     *
     * @param token - Confirmation token received by email.
     * @returns A promise resolving once the account is deleted and the local
     *  session, cached records and observability identity have been cleared.
     */
    const confirmAccountDelete = (token: string) =>
        fetchAny(() =>
            apiConfirmAccountDelete({ token }).then(() => {
                // Clear user identity from observability tools
                const obs = useObservabilityStore();
                obs.unidentifyUser();
                clearSession();
            })
        );

    return {
        profileLanguage,
        profile,
        publishViewer,

        loading,
        login,
        signup,
        requestPasswordReset,
        confirmPasswordReset,
        requestAccountDelete,
        confirmAccountDelete,
        fetchProfile,
        updateProfile,
        updateProfileLanguage,
        logout
    };
});
