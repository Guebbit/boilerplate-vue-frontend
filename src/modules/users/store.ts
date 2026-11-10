/**
 * @module
 * Pinia store built on `useStructureCrudApi` for users CRUD and paginated
 * search, with a multipart branch for create/update when an avatar is
 * attached, plus two hand-written actions: `hardDeleteUser` for the
 * irreversible delete and `restoreUser` for undoing a soft one, and the two purchase-hold
 * writes (`setPurchaseHold`, `liftPurchaseHold`), `activateUser` / `deactivateUser`, the role door
 * (`assignRole`, `revokeRole`), and `applyAccessChange`, which turns a confirmed role/status choice
 * into the right calls.
 */
import { toValue } from 'vue';
import { defineStore } from 'pinia';
import { useStructureCrudApi } from '@guebbit/vue-toolkit';
import { omitNulls, uploadThenClear } from '@/infrastructure/utils/forms.ts';
import { queryClient } from '@/infrastructure/query-client.ts';
import { sortTokensOf } from '@/infrastructure/utils/sort.ts';
import { createListStaleTracker, unsetOmitted } from '@/infrastructure/utils/list-row.ts';
import {
    listUsers,
    searchUsers,
    getUserById,
    createUser as apiCreateUser,
    createUserWithMultipart,
    updateUserById,
    updateUserByIdWithMultipart,
    deleteUserById,
    hardDeleteUserById,
    restoreUserById,
    activateUserById,
    deactivateUserById,
    assignUserRole,
    revokeUserRole,
    placeUserPurchaseHold,
    liftUserPurchaseHold,
    UserSortItem
} from '@api';
import type { AxiosRequestConfig } from 'axios';
import type {
    User,
    UserListItem,
    CreateUserRequestMultipart,
    UpdateUserByIdRequest,
    SearchUsersRequest,
    PlacePurchaseHoldRequest
} from '@types';

/**
 * Search criteria for the users list, i.e. everything but pagination (which is
 * owned by the toolkit's search state).
 *
 * `id` stays a single string here — the filter box searches for one id — and is wrapped into the
 * one-element array `SearchUsersRequest.id` now requires, in `search:` below.
 */
type UsersFilters = Omit<SearchUsersRequest, 'page' | 'pageSize' | 'id' | 'sort'> & {
    id?: string;
    /** The API's `sort` as one CSV (`email`): the form a URL holds. */
    sort?: string;
};

/**
 * `updateUser`'s payload — the merging `PATCH` body plus the optional replacement image. The
 * JSON write body, not the generated multipart request type: that one has no `imageUrl` field at
 * all (a multipart write cannot clear the image today), and this store needs the field to strip a
 * `null` from the optimistic patch below. See `products/store.ts`'s `UpdateProductData` for the
 * same shape.
 */
type UpdateUserData = UpdateUserByIdRequest & { imageUpload?: Blob };

/**
 * An account as the store caches it: a full `User`, or a list row (every field a `User` requires is
 * on one), with the list's `purchaseHeld` flag. The hold's own details are `User.purchaseHold`, from
 * the detail read. List reads are stored with `partial: true` (see `UsersList.vue`), which merges a
 * row over a full record already cached instead of replacing it.
 */
export type UserRecord = User & Pick<UserListItem, 'purchaseHeld'>;

/**
 * Every field a `UserListItem` declares: what a list row may carry, so what a row that omits one
 * has unset.
 */
const USER_LIST_KEYS: Record<keyof UserListItem, true> = {
    id: true,
    email: true,
    username: true,
    role: true,
    active: true,
    imageUrl: true,
    thumbnailUrl: true,
    purchaseHeld: true,
    purchaseHoldFlaggedAt: true,
    purgeAt: true,
    createdAt: true,
    deletedAt: true,
    actions: true
};

/**
 * User list rows as the records the store caches, each naming the list fields it omits (as
 * `undefined`) so the `partial` merge clears a field someone else unset since the record was
 * cached. A row without `purchaseHeld` also clears the detail's `purchaseHold`: the flag is that
 * object's summary, so no flag means no hold.
 *
 * @param items - the rows a list answered
 * @returns the rows, typed as the records the dictionary holds
 */
const asRecords = (items: UserListItem[]): UserRecord[] =>
    items.map((row) => ({
        ...unsetOmitted(USER_LIST_KEYS, row),
        ...(row.purchaseHeld ? {} : { purchaseHold: undefined })
    }));

/**
 * A detail read as the record the store caches: the list's `purchaseHeld` flag derived from the
 * hold object, so the two representations agree on the same record.
 *
 * @param user - the account the detail read answered
 * @returns the account with its `purchaseHeld` flag
 */
const asRecord = (user: User): UserRecord => ({
    ...user,
    purchaseHeld: user.purchaseHold ? true : undefined
});

/**
 * Users CRUD, paginated search and avatar upload.
 *
 * See the products store for the shape — the two are deliberately identical apart
 * from their endpoints and filters, which is the point of declaring a resource rather than
 * wiring one.
 */
export const useUsersStore = defineStore('users', () => {
    /**
     * Which cached accounts a list row has disagreed with since their last detail read.
     */
    const listStale = createListStaleTracker<UserListItem>(USER_LIST_KEYS);

    /**
     * Record cache, list/pagination state and CRUD actions, generated by the
     * toolkit's structured-CRUD primitive from the three type params (entity,
     * id, filters) plus the create/update request shapes.
     */
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
        fetchOne: fetchOneUser,
        watchOne: watchOneUser,
        invalidateTarget,
        createOne: createUser,
        updateOne: updateUser,
        deleteOne: deleteUser,
        deleteTarget,
        fetchAny
    } = useStructureCrudApi<
        UserRecord,
        string,
        UsersFilters,
        CreateUserRequestMultipart,
        UpdateUserData,
        AxiosRequestConfig
    >(
        {
            list: () =>
                listUsers().then((response) => {
                    listStale.note(response.items, (id) => users.value[id]);
                    return asRecords(response.items);
                }),

            search: (filters, page, pageSize) =>
                searchUsers({
                    page,
                    pageSize,
                    text: filters.text,
                    // The API reads a batch of ids; the filter box searches for one.
                    id: filters.id ? [filters.id] : undefined,
                    sort: sortTokensOf(filters.sort, UserSortItem),
                    email: filters.email,
                    username: filters.username,
                    active: filters.active,
                    deleted: filters.deleted,
                    purchaseHold: filters.purchaseHold,
                    purchaseHoldReview: filters.purchaseHoldReview
                }).then((response) => {
                    listStale.note(response.items, (id) => users.value[id]);
                    return {
                        items: asRecords(response.items),
                        totalItems: response.meta.totalItems
                    };
                }),

            get: (userId) => getUserById(userId).then(asRecord),

            create: ({ imageUpload, ...userData }, options) =>
                imageUpload
                    ? createUserWithMultipart({ ...userData, imageUpload }, options)
                    : apiCreateUser(userData, options),

            // PATCH, not PUT: `UserEdit.vue` sends only the fields its form actually holds
            // (the profile fields, an upload) — a PUT's every omitted field would be cleared
            // instead (RFC 9110 §9.3.4), wiping `locale`/`phone`/etc. on every save.
            //
            // A save that uploads AND clears goes as two requests (`uploadThenClear`): a multipart
            // part cannot carry `null`, so the clears follow as a JSON PATCH.
            update: (userId, { imageUpload, ...userData } = {}, options) =>
                imageUpload
                    ? uploadThenClear(
                          userData,
                          (rest) =>
                              updateUserByIdWithMultipart(
                                  userId,
                                  { ...rest, imageUpload },
                                  options
                              ),
                          (clears) => updateUserById(userId, clears, { signal: options?.signal })
                      )
                    : updateUserById(userId, userData, options),

            remove: (userId) => deleteUserById(userId),

            // The new imageUrl comes back from the API; a Blob has no business in store state —
            // this is the MULTIPART request shape, which never carries `imageUrl` itself, only
            // the upload.
            //
            // `locale`/`phone`/`website`/`imageUrl` accept `null` on the wire (clears the field)
            // but the LOCAL `User` never does; `null` reads as "leave the optimistic guess alone"
            // here, since the real clear only takes visible effect once the response `update:`
            // above already waits for lands.
            optimisticPatch: ({
                imageUpload: _uploaded,
                locale,
                phone,
                website,
                imageUrl,
                ...userData
            } = {}) => ({
                ...userData,
                ...omitNulls({ locale, phone, website, imageUrl }, [
                    'locale',
                    'phone',
                    'website',
                    'imageUrl'
                ])
            })
        },
        { resourceKey: 'users', queryClient }
    );

    /**
     * Permanently deletes a user, bypassing the soft delete.
     *
     * `deleteOne` leaves the record in place with `deletedAt` set, which an admin can still see
     * and restore; this removes it outright and cannot be undone. Distinct methods rather than a
     * flag, so the irreversible one is never reached by passing the wrong boolean.
     *
     * @param userId - Identifier of the user to destroy.
     * @returns A promise resolving once the user is gone.
     */
    const hardDeleteUser = (userId: string) =>
        deleteTarget(() => hardDeleteUserById(userId), userId);

    /**
     * Undoes a soft delete — `POST /users/{id}/restore`. A second `deleteUser` never does:
     * DELETE is one-way on the API, and safe to retry. The restored record replaces the cached one.
     *
     * @param userId - Identifier of the user to restore.
     * @returns A promise resolving with the restored user.
     */
    const restoreUser = (userId: string) =>
        fetchAny(() =>
            restoreUserById(userId).then((response) => {
                addUser(response);
                return response;
            })
        );

    /**
     * Lets a deactivated account sign in again — `POST /users/{id}/activate`. The answered user
     * replaces the cached one.
     *
     * @param userId - Identifier of the account.
     * @returns A promise resolving with the user.
     */
    const activateUser = (userId: string) =>
        fetchAny(() =>
            activateUserById(userId).then((response) => {
                addUser(response);
                return response;
            })
        );

    /**
     * Locks an account out and ends its sessions — `POST /users/{id}/deactivate`. The answered
     * user replaces the cached one.
     *
     * @param userId - Identifier of the account.
     * @returns A promise resolving with the user.
     */
    const deactivateUser = (userId: string) =>
        fetchAny(() =>
            deactivateUserById(userId).then((response) => {
                addUser(response);
                return response;
            })
        );

    /**
     * Gives an account a staff role — `POST /users/{id}/assign-role`. It replaces the role held;
     * naming the one already held is a 409 `USER_ROLE_ALREADY_ASSIGNED`. The answered user replaces
     * the cached one.
     *
     * @param userId - Identifier of the account.
     * @param role - The role to give, a name from the session's `grantableRoles`.
     * @returns A promise resolving with the user.
     */
    const assignRole = (userId: string, role: string) =>
        fetchAny(() =>
            assignUserRole(userId, { role }).then((response) => {
                addUser(response);
                return response;
            })
        );

    /**
     * Takes an account's staff role away — `POST /users/{id}/revoke-role`. A 409
     * `USER_ROLE_NOT_ASSIGNED` when it holds none. The answered user replaces the cached one.
     *
     * @param userId - Identifier of the account.
     * @returns A promise resolving with the user.
     */
    const revokeRole = (userId: string) =>
        fetchAny(() =>
            revokeUserRole(userId).then((response) => {
                addUser(response);
                return response;
            })
        );

    /**
     * Applies what `UserAccessDialog` confirmed: a role change is the `assign-role` / `revoke-role`
     * door (`null` takes the role away), a status change is the `activate` / `deactivate` action.
     * Each goes only when it is in `change`, so an unchanged role never reaches the door.
     *
     * @param userId - Identifier of the account.
     * @param change - The confirmed fields: a new `role`, a new `active` state, or both.
     * @returns A promise resolving once every requested write has landed.
     */
    const applyAccessChange = (
        userId: string,
        change: { role?: string | null; active?: boolean }
    ) =>
        (change.role === undefined
            ? Promise.resolve()
            : change.role === null
              ? revokeRole(userId)
              : assignRole(userId, change.role)
        ).then(() => {
            if (change.active === undefined) return;
            return change.active ? activateUser(userId) : deactivateUser(userId);
        });

    /**
     * Pauses checkout for one account — `POST /users/{id}/place-purchase-hold`. The answered user
     * (hold included) replaces the cached one.
     *
     * @param userId - Identifier of the account.
     * @param hold - When checkout opens again, and an optional note the buyer reads.
     * @returns A promise resolving with the user.
     */
    const setPurchaseHold = (userId: string, hold: PlacePurchaseHoldRequest) =>
        fetchAny(() =>
            placeUserPurchaseHold(userId, hold).then((response) => {
                addUser(response);
                return response;
            })
        );

    /**
     * Ends a purchase hold now — `POST /users/{id}/lift-purchase-hold`. This is the staff review: it
     * also restarts the count of cancellations. A 409 `USER_PURCHASE_HOLD_NOT_SET` when there is nothing to lift;
     * placing the staff hold already in force (same end date and note) is a 409
     * `USER_PURCHASE_HOLD_ALREADY_SET`.
     *
     * @param userId - Identifier of the account.
     * @returns A promise resolving with the user.
     */
    const liftPurchaseHold = (userId: string) =>
        fetchAny(() =>
            liftUserPurchaseHold(userId).then((response) => {
                addUser(response);
                return response;
            })
        );

    /**
     * `fetchOne`, first marking the account stale when a list row disagreed with it, so a record
     * the list moved under is read again instead of served from its fresh cache.
     *
     * @param userId - Identifier of the account.
     * @param settings - The toolkit's fetch settings.
     * @returns A promise resolving with the account.
     */
    const fetchUser: typeof fetchOneUser = (userId, settings) =>
        (listStale.take(userId) ? invalidateTarget(userId) : Promise.resolve()).then(() =>
            fetchOneUser(userId, settings)
        );

    /**
     * `watchOne`, with the same stale mark as {@link fetchUser}, taken as the id is read.
     *
     * @param idSource - The id to show, as the toolkit takes it.
     * @param settings - The toolkit's watch settings.
     * @returns The toolkit's watch handle.
     */
    const watchUser: typeof watchOneUser = (idSource, settings) =>
        watchOneUser(() => {
            const userId = toValue(idSource);
            // Marks the cached copy stale synchronously, ahead of the watcher's own read; a failed
            // refetch of a watched copy is the watcher's own error to report.
            if (userId && listStale.take(userId)) invalidateTarget(userId).catch(() => undefined);
            return userId;
        }, settings);

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
        hardDeleteUser,
        restoreUser,
        activateUser,
        deactivateUser,
        assignRole,
        revokeRole,
        applyAccessChange,
        setPurchaseHold,
        liftPurchaseHold
    };
});
