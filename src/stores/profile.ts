import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import { i18n } from '@/utils/i18n.ts';
import type { AuthTokens, RefreshTokenResponse, User } from '@types';
import { accountApi, authApi, usersApi } from '@/utils/api.ts';

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
        loading: restLoading,
        fetchAny,
        fetchTarget,
        updateTarget
    } = useStructureRestApi<User, string>({
        getLoading: (key?: string) => {
            if (key) return getLoading(key);
            return undefined;
        },
        setLoading: (key?: string, value?: boolean) => {
            if (key && value !== undefined) setLoading(key, value);
        }
    });

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
            authApi
                .login({ email, password })
                .then((data) => {
                    accessToken.value = getTokenFromResponse(data);
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
    ) => fetchAny(() => authApi.signup(email, username, password, passwordConfirm));

    /**
     * Refresh access token
     */
    const refreshToken = () =>
        fetchAny(() =>
            authApi.refreshToken().then(({ data }) => {
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
                accountApi.getAccount().then(({ data }) => {
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
    const updateProfile = (userData: Partial<User> = {}) => {
        if (!selectedIdentifier.value) return Promise.reject(new Error('invalid user'));
        return updateTarget(
            () =>
                usersApi
                    .updateUserById(selectedIdentifier.value!, userData.email)
                    .then(({ data }) => data as User),
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
        // replace jwt cookie with an expired one (warning: secure httpOnly cookies can't be deleted from the client)
        // document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        return authApi.logoutAll().then(() => {
            itemDictionary.value = {};
            selectedIdentifier.value = undefined;
            accessToken.value = undefined;
        });
    };

    return {
        profileLanguage,
        profile,
        isAdmin,
        isAuth,

        loading: computed(() => Boolean(restLoading.value)),
        accessToken,
        login,
        signup,
        refreshToken,
        fetchProfile,
        updateProfile,
        updateProfileLanguage,
        logout
    };
});
