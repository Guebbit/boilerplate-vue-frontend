import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import { i18n } from '@/utils/i18n.ts';
import type { User } from '@/api';
import { accountApi, authApi, usersApi } from '@/utils/api.ts';

/**
 * While we can't access to inject/provide in guards or any non-components,
 * we can access Pinia, so it is useful to safely store "global" variables (if needed)
 */
export const useProfileStore = defineStore('profile', () => {
    const {
        itemDictionary,
        selectedIdentifier,
        selectedRecord: profile,
        loading,
        fetchAny,
        fetchTarget,
        updateTarget
    } = useStructureRestApi<User, string>();

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
     * @param auth
     * @param password
     */
    const login = (auth: string, password: string) =>
        fetchAny(() =>
            authApi
                .login({ email: auth, password })
                .then(({ data: { token } = {} as { token?: string } }) => (accessToken.value = token))
        ).then(() => fetchProfile(true));

    /**
     * Register a new user account
     *
     * @param email
     * @param password
     * @param username
     */
    const signup = (email: string, password: string, username = email) =>
        fetchAny(() =>
            authApi.signup(email, username, password, password)
        );

    /**
     * Refresh access token
     */
    const refreshToken = () =>
        fetchAny(() =>
            authApi.refreshToken().then(({ data: { token } = {} as { token?: string } }) => (accessToken.value = token))
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
                    if (!data) return;
                    // to handle single-target stores we just need to select the correct identifier
                    selectedIdentifier.value = data.id;
                    return data;
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
        itemDictionary.value = {};
        selectedIdentifier.value = undefined;
        accessToken.value = undefined;
        // replace jwt cookie with an expired one (warning: secure httpOnly cookies can't be deleted from the client)
        // document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        return authApi.logoutAll();
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
        refreshToken,
        fetchProfile,
        updateProfile,
        updateProfileLanguage,
        logout
    };
});
