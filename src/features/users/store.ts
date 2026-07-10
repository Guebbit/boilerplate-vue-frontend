import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import {
    listUsers,
    getUserById,
    createUser as apiCreateUser,
    updateUserById,
    deleteUserById
} from '@/utils/api.ts';
import httpClient from '@/utils/http.ts';
import { toMultipartFormData, withOptionalMultipartUpload } from '@/utils/multipart.ts';
import type { AxiosProgressEvent } from 'axios';
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
        fetchAll(() => listUsers().then((response) => response.data.items), {
            forced
        });

    /**
     * @param page
     * @param pageSize
     * @param forced
     */
    const fetchPaginationUsers = (page = 1, pageSize = 10, forced = false) =>
        fetchAny(() => listUsers({ page, pageSize }).then((response) => response.data.items), {
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
                listUsers({
                    page,
                    pageSize: pageSizeValue,
                    text: filters.text,
                    id: filters.id,
                    email: filters.email,
                    username: filters.username,
                    active: filters.active
                }).then((response) => response.data.items),
            filters,
            page,
            pageSizeValue,
            { forced }
        );
    };

    /**
     *
     * @param userId
     * @param forced
     */
    const fetchUser = (userId: string, forced = false) =>
        fetchTarget(() => getUserById(userId).then((response) => response.data), userId, {
            forced
        });

    /**
     *
     * @param userData
     */
    const createUser = (userData: CreateUserRequestMultipart) =>
        createTarget(() =>
            withOptionalMultipartUpload<CreateUserRequestMultipart, User>(userData, {
                sendMultipart: (formData) => httpClient.post<User, User>('/users', formData),
                sendJson: () =>
                    apiCreateUser({
                        email: userData.email,
                        username: userData.username,
                        password: userData.password,
                        admin: userData.admin,
                        active: userData.active
                    }).then((response) => response.data)
            })
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
                httpClient.put<User, User>(
                    `/users/${encodeURIComponent(userId)}`,
                    toMultipartFormData({ imageUpload: files[0] }),
                    { onUploadProgress }
                ),
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
                withOptionalMultipartUpload<UpdateUserByIdRequestMultipart, User>(userData, {
                    sendMultipart: (formData) =>
                        httpClient.put<User, User>(
                            `/users/${encodeURIComponent(userId)}`,
                            formData
                        ),
                    sendJson: () =>
                        updateUserById(userId, {
                            email: userData.email,
                            password: userData.password,
                            username: userData.username
                        }).then((response) => response.data)
                }),
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
    const deleteUser = (userId: string) => deleteTarget(() => deleteUserById(userId), userId);

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
        deleteUser
    };
});
