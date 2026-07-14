import { defineStore } from 'pinia';
import { useCoreStore, useStructureSearchApi } from '@guebbit/vue-toolkit';
import { ref, type WatchSource } from 'vue';
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

type IUsersFilters = Omit<SearchUsersRequest, 'page' | 'pageSize'>;

export const useUsersStore = defineStore('users', () => {
    /**
     * Inherited
     */
    const { getLoading, setLoading } = useCoreStore();

    /**
     * Current search filters. Owned by the store so `useStructureSearchApi`'s
     * search-scoped `pageItemList` and `watchSearch` stay bound to the same
     * source the list view mutates.
     */
    const filters = ref<IUsersFilters>({});

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
        watchSearch,
        fetchAny,
        fetchAll,
        fetchTarget,
        watchTarget,
        createTarget,
        updateTarget,
        deleteTarget
    } = useStructureSearchApi<User, string, string | number, IUsersFilters>(() => filters.value, {
        getLoading,
        setLoading
    });

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

    /**
     * Reactive filtered user search via GET /users, built on the toolkit's
     * `watchSearch`: fetches the current page immediately and re-fetches whenever
     * `pageCurrent`/`pageSize` change. Filters are read from the store's `filters`
     * on each run — mutate `filters` then call the returned `search()` to apply them.
     *
     * @param onError - notified on a failed search (immediate load, page change, or search())
     */
    const watchSearchUsers = (onError?: (error: unknown) => void) =>
        watchSearch(
            (currentFilters, page, pageSizeValue) =>
                listUsers({
                    page,
                    pageSize: pageSizeValue,
                    text: currentFilters.text,
                    id: currentFilters.id,
                    email: currentFilters.email,
                    username: currentFilters.username,
                    active: currentFilters.active
                }).then((response) => response.data.items),
            { onError: (error) => onError?.(error) }
        );

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
     * Reactive counterpart of fetchUser: selects and (re)fetches the user
     * whenever idSource changes, including once immediately on setup.
     *
     * @param idSource
     */
    const watchUser = (idSource: WatchSource<string | undefined | null>) =>
        watchTarget(idSource, (userId) => getUserById(userId).then((response) => response.data));

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

        filters,
        loading,
        pageCurrent,
        pageSize,
        pageTotal,
        pageItemList,
        fetchUsers,
        fetchPaginationUsers,
        watchSearchUsers,
        fetchUser,
        watchUser,
        createUser,
        updateUser,
        updateUserImage,
        deleteUser
    };
});
