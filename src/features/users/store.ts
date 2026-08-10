import { defineStore } from 'pinia';
import { useCoreStore, useStructureSearchApi } from '@guebbit/vue-toolkit';
import { ref, type WatchSource } from 'vue';
import {
    listUsers,
    getUserById,
    createUser as apiCreateUser,
    createUserWithMultipart,
    updateUserById,
    updateUserByIdWithMultipart,
    deleteUserById,
    hardDeleteUserById
} from '@api';
import type { AxiosRequestConfig } from 'axios';
import type {
    User,
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
     * @param options - Per-call axios overrides, forwarded to `orvalMutator`.
     *  `UserCreate.vue` passes `onUploadProgress` through it to drive its progress
     *  bar.
     * @returns A promise resolving with the created user.
     */
    const createUser = (
        { imageUpload, ...userData }: CreateUserRequestMultipart,
        options?: AxiosRequestConfig
    ) =>
        createTarget(() =>
            (imageUpload
                ? createUserWithMultipart({ ...userData, imageUpload }, options)
                : apiCreateUser(userData, options)
            ).then((response) => response.data)
        );

    /**
     * Updates a user, as multipart when a new avatar is attached and as plain
     * JSON otherwise.
     *
     * @param userId - Identifier of the user to update.
     * @param userData - Fields to change, optionally including `imageUpload`.
     *  Defaults to an empty object.
     * @param options - Per-call axios overrides, forwarded to `orvalMutator`.
     * @returns A promise resolving with the updated user.
     */
    const updateUser = (
        userId: string,
        { imageUpload, ...userData }: UpdateUserByIdRequestMultipart = {},
        options?: AxiosRequestConfig
    ) =>
        updateTarget(
            () =>
                (imageUpload
                    ? updateUserByIdWithMultipart(userId, { ...userData, imageUpload }, options)
                    : updateUserById(userId, userData, options)
                ).then((response) => response.data),
            // `imageUpload` is deliberately excluded: the new imageUrl comes back
            // from the API, and parking a Blob in store state would be nonsense.
            userData as Partial<User>,
            userId
        );

    /**
     * Deletes a user and drops them from the store.
     *
     * @param userId - Identifier of the user to delete.
     * @returns A promise resolving once the user is deleted.
     */
    const deleteUser = (userId: string) => deleteTarget(() => deleteUserById(userId), userId);
    /**
     * Permanently deletes an user, bypassing the soft delete.
     *
     * `deleteUser` leaves the record in place with `deletedAt` set, which an admin can still see
     * and toggle back; this removes it outright and cannot be undone. Distinct methods rather than a
     * flag, so the irreversible one is never reached by passing the wrong boolean.
     *
     * @param userId - Identifier of the user to destroy.
     * @returns A promise resolving once the user is gone.
     */
    const hardDeleteUser = (userId: string) =>
        deleteTarget(() => hardDeleteUserById(userId), userId);

    return {
        users,
        usersList,
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
        deleteUser,
        hardDeleteUser
    };
});
