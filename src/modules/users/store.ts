import { defineStore } from 'pinia';
import { useCoreStore, useStructureCrudApi } from '@guebbit/vue-toolkit';
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
type UsersFilters = Omit<SearchUsersRequest, 'page' | 'pageSize'>;

/**
 * Users CRUD, paginated search and avatar upload.
 *
 * See the products store for the shape — the two are deliberately identical apart
 * from their endpoints and filters, which is the point of declaring a resource rather than
 * wiring one.
 */
export const useUsersStore = defineStore('users', () => {
    const { getLoading, setLoading } = useCoreStore();

    const {
        itemDictionary: users,
        itemList: usersList,
        addRecord: addUser,
        selectedIdentifier: selectedUserId,
        selectedRecord: currentUser,

        filters,
        loading,
        pageCurrent,
        pageSize,
        pageTotal,
        pageItemList,

        fetchList: fetchUsers,
        fetchPage: fetchPaginationUsers,
        watchList: watchSearchUsers,
        fetchOne: fetchUser,
        watchOne: watchUser,
        createOne: createUser,
        updateOne: updateUser,
        deleteOne: deleteUser,
        deleteTarget
    } = useStructureCrudApi<
        User,
        string,
        UsersFilters,
        CreateUserRequestMultipart,
        UpdateUserByIdRequestMultipart,
        AxiosRequestConfig
    >(
        {
            list: () => listUsers().then((response) => response.data.items),

            search: (filters, page, pageSize) =>
                listUsers({
                    page,
                    pageSize,
                    text: filters.text,
                    id: filters.id,
                    email: filters.email,
                    username: filters.username,
                    active: filters.active
                }).then((response) => response.data.items),

            get: (userId) => getUserById(userId).then((response) => response.data),

            create: ({ imageUpload, ...userData }, options) =>
                (imageUpload
                    ? createUserWithMultipart({ ...userData, imageUpload }, options)
                    : apiCreateUser(userData, options)
                ).then((response) => response.data),

            update: (userId, { imageUpload, ...userData } = {}, options) =>
                (imageUpload
                    ? updateUserByIdWithMultipart(userId, { ...userData, imageUpload }, options)
                    : updateUserById(userId, userData, options)
                ).then((response) => response.data),

            remove: (userId) => deleteUserById(userId),

            // The new imageUrl comes back from the API; a Blob has no business in store state.
            optimisticPatch: ({ imageUpload: _uploaded, ...userData } = {}) =>
                userData as Partial<User>
        },
        { getLoading, setLoading }
    );

    /**
     * Permanently deletes a user, bypassing the soft delete.
     *
     * `deleteOne` leaves the record in place with `deletedAt` set, which an admin can still see
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
