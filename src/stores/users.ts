import { defineStore } from 'pinia'
import { useStoreStructureRestApi } from '@/composables/structureRestAPI.ts'
import {
    createUser as createUserApi,
    deleteUser as deleteUserApi,
    getUserById as getUserByIdApi,
    getUserList as getUserListApi,
    updateUser as updateUserApi,
    updateUserImage as updateUserImageApi
} from '@/api'
import type { IUser, IUserForm, IUserIdentification } from '@/types/users.ts'
import type { AxiosProgressEvent } from 'axios'

export const useUsersStore = defineStore('users', () => {
    /**
     * Inherited
     */
    const {
        itemDictionary: users,
        itemList: usersList,
        getRecord: getUser,
        addRecord: addUser,
        selectedIdentifier: selectedUserId,
        selectedRecord: currentUser,

        loading,
        fetchAll,
        fetchTarget,
        createTarget,
        updateTarget,
        deleteTarget
    } = useStoreStructureRestApi<IUser, IUserIdentification>('id')

    /**
     *
     * @param forced
     */
    const fetchUsers = (forced = false) =>
        fetchAll(
            getUserListApi()
                .then(({ data }) => data),
            forced,
            true
        )

    /**
     *
     * @param userId
     * @param forced
     */
    const fetchUser = (userId: IUserIdentification, forced = false) =>
        fetchTarget(
            getUserByIdApi(userId)
                .then(({ data }) => data),
            userId,
            forced
        )

    /**
     *
     * @param userData
     */
    const createUser = (userData: IUserForm) =>
        createTarget(
            createUserApi(userData)
                .then(({ data }) => data)
        )

    /**
     * Change user email
     *
     * @param userId
     * @param files
     * @param onUploadProgress
     */
    const updateUserImage = (
        userId: IUserIdentification,
        files: File[] | FileList = [],
        onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
    ) => {
        // TODO generic wrapper with loading and error handling
        if (files.length === 0)
            return Promise.reject(new Error('no file selected'))
        const formData = new FormData()
        formData.append('file', files[0])
        return updateUserImageApi(userId, formData, onUploadProgress)
    }

    /**
     *
     * @param userId
     * @param userData
     */
    const updateUser = (userId: IUserIdentification, userData: Partial<IUserForm> = {}) =>
        updateTarget(
            updateUserApi(userId, userData),
            userId,
            userData
        )

    /**
     *
     * @param userId
     */
    const deleteUser = (userId: IUserIdentification) =>
        deleteTarget(
            deleteUserApi(userId),
            userId
        )

    return {
        users,
        usersList,
        getUser,
        addUser,
        selectedUserId,
        currentUser,

        loading,
        fetchUsers,
        fetchUser,
        createUser,
        updateUser,
        updateUserImage,
        deleteUser
    }
})
