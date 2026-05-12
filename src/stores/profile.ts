import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import { i18n } from '@/utils/i18n.ts';
import type { AuthTokens, RefreshTokenResponse, User } from '@types';
import { AccountService, AuthService, UsersService } from '@/utils/api.ts';

/**
 * Extract token from both wrapped ({ data: { token } }) and direct ({ token }) responses
 */
const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const isWrappedResponse = <T>(response: unknown): response is { data?: T } =>
    isObjectRecord(response) && 'data' in response;

const getTokenFromResponse = (
    response?: { data?: { token?: string } } | AuthTokens | RefreshTokenResponse
): string | undefined => {
    if (isObjectRecord(response)) {
        const maybeToken = (response as Record<string, unknown>).token;
        if (typeof maybeToken === 'string') return maybeToken;
    }
    if (isWrappedResponse<{ token?: string }>(response)) return response.data?.token;
    return undefined;
};

/**
 * Extract payload from both wrapped ({ data }) and direct responses
 */
const getPayloadFromResponse = <T>(response?: { data?: T } | T): T | undefined =>
    isWrappedResponse<T>(response) ? response.data : (response as T | undefined);

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
        itemDictionary,
        selectedIdentifier,
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
     * Authenticate users
     * TODO se l'utente non è ancora loggato non so con quale lingua restituire gli errori
     *
     * @param email
     * @param password
     */
    const login = (email: string, password: string) =>
        fetchAny(() =>
            AuthService.login({ email, password })
                .then((data) => {
                    accessToken.value = getTokenFromResponse(data);
                    setCookie('isAuth=true; path=/; SameSite=Lax');
                })
                .then(() => fetchProfile(true))
        );

    /**
     * Register a new user account
     *
     * @param email
     * @param password
     * @param username
     */
    const signup = (
        email: string,
        password: string,
        username = email,
        passwordConfirm = password
    ) => fetchAny(() => AuthService.signup({ email, username, password, passwordConfirm }));

    /**
     * Starts password reset flow by sending a token to the provided email.
     *
     * @param email
     */
    const requestPasswordReset = (email: string) =>
        fetchAny(() => AuthService.requestPasswordReset({ email }));

    /**
     * Completes password reset using one-time token and the new password.
     *
     * @param token
     * @param password
     * @param passwordConfirm
     */
    const confirmPasswordReset = (token: string, password: string, passwordConfirm: string) =>
        fetchAny(() => AuthService.confirmPasswordReset({ token, password, passwordConfirm }));

    /**
     * Refresh access token
     */
    const refreshToken = () =>
        fetchAny(() =>
            AuthService.refreshToken().then((data) => {
                accessToken.value = getTokenFromResponse(data);
            })
        );

    /**
     * Need to be authenticated, but if access token is expired or missing,
     * A refresh request (that use jwt cookie with refresh token)
     * will try automatically to renew it and redo the request
     *
     * @param forced
     */
    const fetchProfile = (forced = false) => {
        return fetchTarget(
            () =>
                AccountService.getAccount().then((data) => {
                    const payload = getPayloadFromResponse<User>(data);
                    if (!payload) return;
                    // to handle single-target stores we just need to select the correct identifier
                    selectedIdentifier.value = payload.id;
                    return payload;
                }),
            undefined,
            { forced }
        );
    };

    /**
     * Edit profile
     * NOTE: /account PATCH is not defined in the OpenAPI spec; we keep the
     * legacy apiOld call until the spec is extended.
     *
     * @param userData
     */
    const updateProfile = (userData: Partial<User> & { password?: string } = {}) => {
        if (!selectedIdentifier.value) return Promise.reject(new Error('invalid user'));
        return updateTarget(
            () =>
                UsersService.updateUserById(selectedIdentifier.value!, {
                    email: userData.email,
                    password: userData.password,
                    username: userData.username
                }).then((data) => data),
            userData,
            selectedIdentifier.value
        );
    };

    /**
     * Change user language
     *
     * @param language
     */
    const updateProfileLanguage = (language = '') => {
        // TODO check
        profileLanguage.value = language;
        return updateProfile({
            ...profile.value
        });
    };

    /**
     * Logout and remove cached user data
     */
    const logout = () => {
        // The httpOnly jwt cookie can only be cleared server-side; isAuth is JS-accessible.
        return AuthService.logoutAll().then(() => {
            itemDictionary.value = {};
            selectedIdentifier.value = undefined;
            accessToken.value = undefined;
            setCookie('isAuth=; path=/; max-age=0; SameSite=Lax');
        });
    };

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
        refreshToken,
        fetchProfile,
        updateProfile,
        updateProfileLanguage,
        logout
    };
});
