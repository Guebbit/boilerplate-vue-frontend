import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import type { AxiosRequestConfig } from 'axios';
import { i18n } from '@/utils/i18n.ts';
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
    refreshToken as apiRefreshToken,
    logoutAll as apiLogoutAll,
    updateUserById as apiUpdateUserById
} from '@api';
import { useObservabilityStore, analyticsEvents } from '@/stores/observability';

/**
 * Narrows any value to a plain keyed object.
 *
 * @param value - Value to test.
 * @returns `true` when `value` is a non-null object.
 */
const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

/**
 * Detects the envelope shape (`{ data: ... }`) some endpoints wrap payloads in.
 *
 * @typeParam T - Expected type of the wrapped payload.
 * @param response - Raw API response.
 * @returns `true` when `response` is an object carrying a `data` key.
 */
const isWrappedResponse = <T>(response: unknown): response is { data?: T } =>
    isObjectRecord(response) && 'data' in response;

/**
 * Extracts the access token from both wrapped (`{ data: { token } }`) and direct
 * (`{ token }`) responses.
 *
 * @param response - Raw response of a login/refresh call.
 * @returns The token, or `undefined` when the response carries none.
 */
const getTokenFromResponse = (response?: unknown): string | undefined => {
    if (isObjectRecord(response)) {
        const maybeToken = (response as Record<string, unknown>).token;
        if (typeof maybeToken === 'string') return maybeToken;
    }
    if (isWrappedResponse<{ token?: string }>(response)) return response.data?.token;
    return undefined;
};

/**
 * Extracts the payload from both wrapped (`{ data }`) and direct responses.
 *
 * @typeParam T - Expected payload type.
 * @param response - Raw API response.
 * @returns The unwrapped payload, or `undefined` when absent.
 */
const getPayloadFromResponse = <T>(response?: { data?: T } | T): T | undefined =>
    isWrappedResponse<T>(response) ? response.data : (response as T | undefined);

/**
 * Writes a cookie through the prototype setter rather than `document.cookie`.
 *
 * Going through the original descriptor keeps the write working even when a
 * library (or a test double) has shadowed `document.cookie` on the instance.
 *
 * @param value - Full cookie string, attributes included, e.g.
 *  `isAuth=true; path=/; SameSite=Lax`.
 */
const setCookie = (value: string) => {
    const cookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    cookieDescriptor?.set?.call(document, value);
};

/**
 * While we can't access to inject/provide in guards or any non-components,
 * we can access Pinia, so it is useful to safely store "global" variables (if needed)
 */
export const useProfileStore = defineStore('profile', () => {
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
     * User access token
     */
    const accessToken = ref<string>();

    /**
     * Fast check if current user is admin
     */
    const isAdmin = computed(() => Boolean(accessToken.value && profile.value?.admin));
    const isAuth = computed(() => Boolean(accessToken.value && profile.value));

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
                    accessToken.value = getTokenFromResponse(data);
                    setCookie('isAuth=true; path=/; SameSite=Lax');
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
     * Renews the in-memory access token using the httpOnly refresh cookie.
     *
     * @returns A promise resolving once the new token is stored.
     */
    const refreshToken = () =>
        fetchAny(() =>
            apiRefreshToken().then((data) => {
                accessToken.value = getTokenFromResponse(data);
            })
        );

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
        resetAll();
        accessToken.value = undefined;
        // The httpOnly jwt cookie can only be cleared server-side; isAuth is JS-accessible.
        setCookie('isAuth=; path=/; max-age=0; SameSite=Lax');
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
        return apiLogoutAll().then(() => {
            clearSession();
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
        isAdmin,
        isAuth,

        loading,
        accessToken,
        login,
        signup,
        requestPasswordReset,
        confirmPasswordReset,
        requestAccountDelete,
        confirmAccountDelete,
        refreshToken,
        fetchProfile,
        updateProfile,
        updateProfileLanguage,
        logout
    };
});
