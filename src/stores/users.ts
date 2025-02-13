import { defineStore } from 'pinia'
import { useI18n } from 'vue-i18n'
import { z } from 'zod'
import { useStructureRestApi } from '@/composables/structureRestApi.ts'
import {
    createUserApi as createUserApi,
    deleteUserApi as deleteUserApi,
    fetchUserByIdApi as fetchUserByIdApi,
    fetchUsersApi as getUserListApi,
    updateUserApi as updateUserApi,
    updateUserImageApi as updateUserImageApi
} from '@/api'
import { EUserRoles, type IUser, type IUserForm, type IUserIdentification } from '@/types/users.ts'
import type { AxiosProgressEvent } from 'axios'

export const useUsersStore = defineStore('users', () => {
    /**
     * Inherited
     */
    const { t } = useI18n()

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
    } = useStructureRestApi<IUser, IUserIdentification>('id')

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
            fetchUserByIdApi(userId)
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

    /**
     * Zod schema for a valid email
     */
    const zodSchemaUsersEmail = z
        .string({
            invalid_type_error: t('users-form.email-required'),
            required_error: t('users-form.email-required'),
        })
        .email(t('users-form.email-invalid'))

    /**
     *
     */
    const zodSchemaUsersUsername = z
        .string({
            invalid_type_error: t('users-form.username-required'),
            required_error: t('users-form.username-required'),
        })
        .min(3, t('users-form.username-min'))

    /**
     *
     */
    const zodSchemaUsersPassword = z
        .string({
            invalid_type_error: t('users-form.password-required'),
            required_error: t('users-form.password-required'),
        })
        .min(8, t('users-form.password-min'))
        .refine(password => password && /[a-z]/.test(password), {
            message: t('users-form.password-minus-required'),
        })
        .refine(password => password && /[A-Z]/.test(password), {
            message: t('users-form.password-maius-required'),
        })
        .refine(password => password && /\d/.test(password), {
            message: t('users-form.password-number-required'),
        })
        .refine(password => password && /[^\dA-Za-z]/.test(password), {
            message: t('users-form.password-special-required'),
        });

    /**
     *
     */
    const zodSchemaUsers =
        z.object({
            id: z.number().nullish().optional(),
            email: zodSchemaUsersEmail,
            username: zodSchemaUsersUsername,
            password: zodSchemaUsersPassword,
            phone: z.string().nullish().optional(),
            website: z.string().nullish().optional(),
            language: z.string().nullish().optional(), // .default(process.env.NODE_SETTINGS_DEFAULT_LOCALE ?? "en"),
            // imageUrl: z.string().nullish().optional(), // TODO FILE?
            roles: z.array(z.nativeEnum(EUserRoles)).nullish().optional(), // .default([]),
            active: z.boolean().nullish().optional(),
            createdAt: z.date().nullish().optional(),
            updatedAt: z.date().nullish().optional(),
            deletedAt: z.date().nullish().optional(),
        });
    
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
        deleteUser,

        zodSchemaUsersEmail,
        zodSchemaUsersUsername,
        zodSchemaUsersPassword,
        zodSchemaUsers,
    }
})
