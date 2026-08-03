import { defineStore } from 'pinia';
import { useCoreStore, useStructureSearchApi } from '@guebbit/vue-toolkit';
import { ref, type WatchSource } from 'vue';
import {
    listUsers,
    getUserById,
    createUser as apiCreateUser,
    updateUserById,
    deleteUserById
} from '@api';
import { orvalMutator } from '@/plugins/http';
import { toFormData } from '@guebbit/js-toolkit';
import type { AxiosProgressEvent } from 'axios';
import type {
    User,
    UserEnvelope,
    CreateUserRequestMultipart,
    UpdateUserByIdRequestMultipart,
    SearchUsersRequest
} from '@types';

/**
 * Search criteria for the users list, i.e. everything but pagination (which is
 * owned by the toolkit's search state).
 */
type IUsersFilters = Omit<SearchUsersRequest, 'page' | 'pageSize'>;

/**
 * Drops null/undefined entries from an object.
 *
 * `toFormData` appends `undefined` as the literal string `"undefined"` instead
 * of omitting the field, so optional fields left unset must be stripped first.
 *
 * @typeParam T - Shape of the source object.
 * @param data - Object to filter.
 * @returns A shallow copy holding only the defined, non-null entries.
 */
const definedEntries = <T extends object>(data: T): Partial<T> =>
    Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined && value !== null)
    ) as Partial<T>;

/**
 * Users CRUD, paginated search and avatar upload, on top of the toolkit's
 * search-API structure.
 */
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
     * Fetches every user into the store dictionary.
     *
     * @param forced - Bypass the cache and always hit the API.
     * @returns A promise resolving with the fetched users.
     */
    const fetchUsers = (forced = false) =>
        fetchAll(() => listUsers().then((response) => response.data.items), {
            forced
        });

    /**
     * Fetches a single page of users, without touching the shared search state.
     *
     * @param page - 1-based page number. Defaults to `1`.
     * @param pageSize - Items per page. Defaults to `10`.
     * @param forced - Bypass the cache and always hit the API.
     * @returns A promise resolving with that page's users.
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
     * @param onError - Notified on a failed search (immediate load, page
     *  change, or an explicit `search()` call).
     * @returns The toolkit search handle, whose `search()` re-runs the query
     *  with the current {@link filters}.
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
     * Fetches a single user and selects them as the current one.
     *
     * @param userId - Identifier of the user to load.
     * @param forced - Bypass the cache and always hit the API.
     * @returns A promise resolving with the user.
     */
    const fetchUser = (userId: string, forced = false) =>
        fetchTarget(() => getUserById(userId).then((response) => response.data), userId, {
            forced
        });

    /**
     * Reactive counterpart of `fetchUser`: selects and (re)fetches the user
     * whenever the id changes, including once immediately on setup.
     *
     * @param idSource - Watch source yielding the user id; nullish values clear
     *  the selection.
     * @returns The toolkit watch handle (stop function + state).
     */
    const watchUser = (idSource: WatchSource<string | undefined | null>) =>
        watchTarget(idSource, (userId) => getUserById(userId).then((response) => response.data));

    /**
     * Creates a user, as multipart when an avatar is attached and as plain JSON
     * otherwise.
     *
     * @param userData - User fields, optionally including `imageUpload`.
     * @returns A promise resolving with the created user.
     */
    const createUser = (userData: CreateUserRequestMultipart) =>
        createTarget(() =>
            userData.imageUpload
                ? orvalMutator<UserEnvelope>({
                      url: '/users',
                      method: 'POST',
                      data: toFormData(definedEntries(userData))
                  }).then((response) => response.data)
                : apiCreateUser({
                      email: userData.email,
                      username: userData.username,
                      password: userData.password,
                      admin: userData.admin,
                      active: userData.active
                  }).then((response) => response.data)
        );

    /**
     * Replaces a user's avatar through the multipart `imageUpload` endpoint.
     *
     * @param userId - Identifier of the user to update.
     * @param files - Selected files; only the first is uploaded.
     * @param onUploadProgress - Axios progress callback, for a progress bar.
     * @returns A promise resolving with the updated user (the new `imageUrl`
     *  comes from the API, so nothing is merged optimistically), rejected with a
     *  `no file selected` error when `files` is empty.
     */
    const updateUserImage = (
        userId: string,
        files: File[] | FileList = [],
        onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
    ) => {
        if (files.length === 0 || !files[0]) return Promise.reject(new Error('no file selected'));
        return updateTarget(
            () =>
                orvalMutator<UserEnvelope>({
                    url: `/users/${encodeURIComponent(userId)}`,
                    method: 'PUT',
                    data: toFormData({ imageUpload: files[0] }),
                    onUploadProgress
                }).then((response) => response.data),
            // No fields to optimistically merge — the updated imageUrl is returned by the API
            {} as Partial<User>,
            userId
        );
    };

    /**
     * Updates a user, as multipart when a new avatar is attached and as plain
     * JSON otherwise.
     *
     * @param userId - Identifier of the user to update.
     * @param userData - Fields to change, optionally including `imageUpload`.
     *  Defaults to an empty object.
     * @returns A promise resolving with the updated user.
     */
    const updateUser = (userId: string, userData: UpdateUserByIdRequestMultipart = {}) =>
        updateTarget(
            () =>
                userData.imageUpload
                    ? orvalMutator<UserEnvelope>({
                          url: `/users/${encodeURIComponent(userId)}`,
                          method: 'PUT',
                          data: toFormData(definedEntries(userData))
                      }).then((response) => response.data)
                    : updateUserById(userId, {
                          email: userData.email,
                          password: userData.password,
                          username: userData.username
                      }).then((response) => response.data),
            {
                email: userData.email,
                password: userData.password,
                username: userData.username
            } as Partial<User>,
            userId
        );

    /**
     * Deletes a user and drops them from the store.
     *
     * @param userId - Identifier of the user to delete.
     * @returns A promise resolving once the user is deleted.
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
