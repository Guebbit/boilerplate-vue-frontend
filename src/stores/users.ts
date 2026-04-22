import { defineStore } from 'pinia';
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';
import { z } from 'zod';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import { usersApi } from '@/utils/api.ts';
import type { AxiosProgressEvent } from 'axios';
import type {
    User,
    UsersResponse,
    CreateUserRequestMultipart,
    UpdateUserByIdRequestMultipart,
    SearchUsersRequest
} from '@types';

export const useUsersStore = defineStore('users', () => {
    /**
     * Inherited
     */
    const { t } = useI18n();
    const { getLoading, setLoading } = useCoreStore();
    const {
        itemDictionary: users,
        itemList: usersList,
        getRecord: getUser,
        addRecord: addUser,
        addRecords,
        selectedIdentifier: selectedUserId,
        selectedRecord: currentUser,

        loading: restLoading,
        pageCurrent,
        pageSize,
        pageTotal,
        pageItemList,
        fetchSearch,
        fetchAny,
        fetchAll,
        fetchTarget,
        createTarget,
        updateTarget,
        deleteTarget
    } = useStructureRestApi<User, string>({
        getLoading: (key?: string) => {
            if (key) return getLoading(key);
        },
        setLoading: (key?: string, value?: boolean) => {
            if (key && value !== undefined) setLoading(key, value);
        }
    });

    /**
     *
     * @param forced
     */
    const fetchUsers = (forced = false) =>
        fetchAll(
            () =>
                usersApi.listUsers().then(({ data }) => (data as { items?: User[] })?.items ?? []),
            { forced }
        );

    /**
     * @param page
     * @param pageSize
     * @param forced
     */
    const fetchPaginationUsers = (page = 1, pageSize = 10, forced = false) =>
        fetchAny(
            () =>
                usersApi.listUsers(page, pageSize).then(({ data }) => {
                    const response = data as UsersResponse;
                    addRecords(response.items ?? []);
                    return response;
                }),
            { forced, lastUpdateKey: `users_page_${page}_${pageSize}` }
        );

    type IUsersFilters = Omit<SearchUsersRequest, 'page' | 'pageSize'>;

    /**
     * @param filters
     * @param page
     * @param pageSize
     * @param forced
     */
    const fetchSearchUsers = (
        filters: IUsersFilters = {},
        page = 1,
        pageSizeValue = 10,
        forced = false
    ) => {
        pageCurrent.value = page;
        pageSize.value = pageSizeValue;
        return fetchSearch(
            () =>
                usersApi
                    .searchUsers({ ...filters, page, pageSize: pageSizeValue })
                    .then(({ data: { items = [] } }) => items),
            filters,
            page,
            { forced }
        );
    };

    /**
     *
     * @param userId
     * @param forced
     */
    const fetchUser = (userId: string, forced = false) =>
        fetchTarget(() => usersApi.getUserById(userId).then(({ data }) => data as User), userId, {
            forced
        });

    /**
     *
     * @param userData
     */
    const createUser = (userData: CreateUserRequestMultipart) =>
        createTarget(() =>
            usersApi
                .createUser(
                    userData.email,
                    userData.username,
                    userData.password,
                    userData.admin,
                    userData.active,
                    userData.imageUpload
                )
                .then(({ data }) => data as User)
        );

    /**
     * Change user image via the generated API (imageUpload multipart endpoint)
     *
     * @param userId
     * @param files
     * @param onUploadProgress
     */
    const updateUserImage = (
        userId: string,
        files: File[] | FileList = [],
        onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
    ) => {
        if (files.length === 0 || !files[0]) return Promise.reject(new Error('no file selected'));
        return updateTarget(
            () =>
                usersApi
                    .updateUserById(userId, undefined, undefined, undefined, files[0], {
                        onUploadProgress
                    })
                    .then(({ data }) => data as User),
            // No fields to optimistically merge — the updated imageUrl is returned by the API
            {} as Partial<User>,
            userId
        );
    };

    /**
     *
     * @param userId
     * @param userData
     */
    const updateUser = (userId: string, userData: UpdateUserByIdRequestMultipart = {}) =>
        updateTarget(
            () =>
                usersApi
                    .updateUserById(
                        userId,
                        userData.email,
                        userData.password,
                        userData.username,
                        userData.imageUpload
                    )
                    .then(({ data }) => data as User),
            {
                email: userData.email,
                password: userData.password,
                username: userData.username
            } as Partial<User>,
            userId
        );

    /**
     *
     * @param userId
     */
    const deleteUser = (userId: string) =>
        deleteTarget(() => usersApi.deleteUserById(userId), userId);

    /**
     * Zod schema for a valid email
     */
    const zodSchemaUsersEmail = z.email(t('users-form.email-invalid'));

    /**
     *
     */
    const zodSchemaUsersUsername = z.string().min(3, t('users-form.username-min'));

    /**
     *
     */
    const zodSchemaUsersPassword = z
        .string()
        .min(8, t('users-form.password-min'))
        .refine((password) => password && /[a-z]/.test(password), {
            message: t('users-form.password-minus-required')
        })
        .refine((password) => password && /[A-Z]/.test(password), {
            message: t('users-form.password-maius-required')
        })
        .refine((password) => password && /\d/.test(password), {
            message: t('users-form.password-number-required')
        })
        .refine((password) => password && /[^\dA-Za-z]/.test(password), {
            message: t('users-form.password-special-required')
        });

    /**
     *
     */
    const zodSchemaUsers = z.object({
        id: z.string().nullish().optional(),
        email: zodSchemaUsersEmail,
        username: zodSchemaUsersUsername,
        imageUrl: z.string().nullish().optional(),
        admin: z.boolean().nullish().optional(),
        active: z.boolean().nullish().optional(),
        createdAt: z.string().nullish().optional(),
        updatedAt: z.string().nullish().optional()
    });

    return {
        users,
        usersList,
        getUser,
        addUser,
        selectedUserId,
        currentUser,

        loading: computed(() => Boolean(restLoading.value)),
        pageCurrent,
        pageSize,
        pageTotal,
        pageItemList,
        fetchUsers,
        fetchPaginationUsers,
        fetchSearchUsers,
        fetchUser,
        createUser,
        updateUser,
        updateUserImage,
        deleteUser,

        zodSchemaUsersEmail,
        zodSchemaUsersUsername,
        zodSchemaUsersPassword,
        zodSchemaUsers
    };
});
