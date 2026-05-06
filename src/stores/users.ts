import { defineStore } from 'pinia';
import { useI18n } from 'vue-i18n';
import { z } from 'zod';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import { usersApi } from '@/utils/api.ts';
import httpClient from '@/utils/http.ts';
import { toMultipartFormData } from '@/utils/multipart.ts';
import type { AxiosProgressEvent } from 'axios';
import type { IResponseSuccess } from '@/types';
import type {
    User,
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
        selectedIdentifier: selectedUserId,
        selectedRecord: currentUser,

        loading,
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
    } = useStructureRestApi<User, string>({ getLoading, setLoading });

    /**
     *
     * @param forced
     */
    const fetchUsers = (forced = false) =>
        fetchAll(() => usersApi.listUsers().then(({ data }) => data.items), { forced });

    /**
     * @param page
     * @param pageSize
     * @param forced
     */
    const fetchPaginationUsers = (page = 1, pageSize = 10, forced = false) =>
        fetchAny(() => usersApi.listUsers(page, pageSize).then(({ data }) => data.items), {
            forced
        });

    type IUsersFilters = Omit<SearchUsersRequest, 'page' | 'pageSize'>;

    /**
     * @param filters
     * @param page
     * @param pageSize
     * @param forced
     */
    /**
     * Fetches a filtered, paginated user list via GET /users.
     * Filters are passed as query parameters; SearchUsersRequest is still
     * used as the filter shape so callers stay type-safe.
     */
    const fetchSearchUsers = (
        filters: IUsersFilters = {},
        page = 1,
        pageSizeValue = 10,
        forced = false
    ) => {
        pageSize.value = pageSizeValue;
        return fetchSearch(
            () =>
                usersApi
                    .listUsers(
                        page,
                        pageSizeValue,
                        filters.text,
                        filters.id,
                        filters.email,
                        filters.username,
                        filters.active
                    )
                    .then(({ data }) => data.items),
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
            (userData.imageUpload
                ? httpClient.post<IResponseSuccess<User>>('/users', toMultipartFormData(userData))
                : usersApi.createUser({
                      email: userData.email,
                      username: userData.username,
                      password: userData.password,
                      admin: userData.admin,
                      active: userData.active
                  })
            ).then(({ data }) => data as User)
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
                httpClient
                    .put<
                        IResponseSuccess<User>
                    >(`/users/${encodeURIComponent(userId)}`, toMultipartFormData({ imageUpload: files[0] }), { onUploadProgress })
                    .then(({ data }) => data.data as User),
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
                (userData.imageUpload
                    ? httpClient.put<IResponseSuccess<User>>(
                          `/users/${encodeURIComponent(userId)}`,
                          toMultipartFormData(userData)
                      )
                    : usersApi.updateUserById(userId, {
                          email: userData.email,
                          password: userData.password,
                          username: userData.username
                      })
                ).then(({ data }) => ('data' in data ? data.data : data) as User),
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

        loading,
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
