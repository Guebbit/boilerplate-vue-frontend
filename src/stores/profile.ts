import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useStructureRestApi } from '@/composables/structureRestApi.ts'
import { i18n } from '@/utils/i18n.ts'
import { ERefreshTokenExpiryTime, EUserRoles, type IUser, type IUserIdentification } from '@/types'
import {
    fetchProfileApi,
    patchProfileApi,
    refreshTokenApi,
    loginApi,
    logoutApi
} from '@/api'


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
    } = useStructureRestApi<IUser, IUserIdentification>()

    /**
     * Warning: can't use useI18n because it wouldn't work in global guards
     * (It works correctly on changes and so on)
     */
    const profileLanguage = i18n.global.locale;

    /**
     * Fast check if current user is admin
     */
    const isAdmin = computed(() => Boolean(accessToken.value && profile.value?.roles.includes(EUserRoles.ADMIN)))
    const isAuth = computed(() => Boolean(accessToken.value && profile.value))

    /**
     * User access token
     */
    const accessToken = ref<string | undefined>()

    /**
     * Authenticate users
     * TODO se l'utente non è ancora loggato non so con quale lingua restituire gli errori
     *
     * @param auth
     * @param password
     * @param remember
     */
    const login = (auth: string, password: string, remember = false) =>
        fetchAny(
            loginApi(auth, password, remember ? ERefreshTokenExpiryTime.MEDIUM : ERefreshTokenExpiryTime.SHORT)
                .then(({ data: { token } = {} }) =>
                    accessToken.value = token
                )
        )
            .then(() => fetchProfile(true))

    /**
     * Refresh access token
     */
    const refreshToken = () =>
        fetchAny(
            refreshTokenApi()
                .then(({ data: { token } = {} }) =>
                    accessToken.value = token
                )
        )


    /**
     * Need to be authenticated, but if access token is expired or missing,
     * A refresh request (that use jwt cookie with refresh token)
     * will try automatically to renew it and redo the request
     *
     * @param forced
     */
    const fetchProfile = (forced = false) => {
        return fetchTarget(
            fetchProfileApi()
                .then(({ data }) => {
                    if (!data)
                        return
                    // to handle single-target stores we just need to select the correct identifier
                    selectedIdentifier.value = data.id
                    return data
                }),
            undefined,
            forced
        )
    }

    /**
     * Edit profile
     *
     * @param userData
     */
    const updateProfile = (userData: Partial<IUser> = {}) => {
        if (!selectedIdentifier.value)
            return Promise.reject(new Error('invalid user'))
        return updateTarget(
            patchProfileApi(userData),
            selectedIdentifier.value,
            userData
        )
    }

    /**
     * Change user language
     *
     * @param language
     */
    const updateProfileLanguage = (language = '') => {
        // TODO check
        profileLanguage.value = language
        return updateProfile({
            ...profile.value,
            language
        })
    }

    /**
     * Logout and remove cached user data
     */
    const logout = () => {
        itemDictionary.value = {}
        selectedIdentifier.value = undefined
        accessToken.value = undefined;
        // replace jwt cookie with an expired one (warning: secure httpOnly cookies can't be deleted from the client)
        // document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        return logoutApi()
    }


    return {
        profileLanguage,
        profile,
        isAdmin,
        isAuth,

        loading,
        accessToken,
        login,
        refreshToken,
        fetchProfile,
        updateProfile,
        updateProfileLanguage,
        logout
    }
})
