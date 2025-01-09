import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useStoreStructureRestApi } from '@/composables/storeStructureRestApi.ts'
import { useUsersStore } from '@/stores/users.ts'
import { getProfile, updateUser } from '@/api'
import type { IUser, IUserForm } from '@/types'
import type { AxiosProgressEvent } from 'axios'

/**
 * While we can't access to inject/provide in guards or any non-components,
 * we can access Pinia, so it is useful to safely store "global" variables (if needed)
 */
export const useProfileStore = defineStore('profile', () => {

    /**
     * Inherited
     */
    const {
        locale: profileLanguage
    } = useI18n()

    const {
        itemDictionary,
        selectedIdentifier,
        selectedRecord: profile,

        loading,
        startLoading,
        stopLoading,
        fetchTarget,
        updateTarget
    } = useStoreStructureRestApi<IUser, IUser['id']>()

    const {
        updateUserImage
    } = useUsersStore()

    /**
     * User status
     */
    const isAuth = computed(() => true)
    const isAdmin = computed(() => true)

    /**
     *
     * @param forced
     */
    const fetchProfile = (forced = false) =>
        fetchTarget(
            getProfile()
                .then((test) => {
                    console.log('HELLOOOOOOOOOOOO', test)
                    // to handle single-target stores we just need to select the correct identifier
                    // selectedIdentifier.value = data.id;
                    // return data;
                }),
            '_current',  // dummy identifier
            forced
        )

    /**
     * Edit profile
     *
     * @param userData
     */
    const updateProfile = (userData: Partial<IUserForm> = {}) => {
        if (!selectedIdentifier.value)
            return Promise.reject(new Error('invalid user'))
        return updateTarget(
            updateUser(selectedIdentifier.value, userData),
            selectedIdentifier.value,
            userData
        )
    }

    /**
     * Change user language
     *
     * @param files
     * @param onUploadProgress
     */
    const updateProfileImage = (
        files: File[] | FileList = [],
        onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
    ) => {
        if (!selectedIdentifier.value)
            return Promise.reject(new Error('invalid user'))
        return updateUserImage(
            selectedIdentifier.value,
            files,
            onUploadProgress
        )
    }

    /**
     * Change user language
     *
     * @param language
     */
    const updateProfileLanguage = (language = '') => {
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
    }

    return {
        profileLanguage,
        profile,

        isAuth,
        isAdmin,

        loading,
        startLoading,
        stopLoading,
        fetchProfile,
        updateProfile,
        updateProfileImage,
        updateProfileLanguage,
        logout
    }
})
