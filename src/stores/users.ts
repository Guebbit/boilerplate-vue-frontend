import { ref, computed } from 'vue'
import { defineStore } from 'pinia';
import { getUuid } from '@guebbit/js-toolkit'
import { getUserList, getUserById } from '@/api'
import { useCoreStore } from "@/stores/core";
import type { IUser } from "@/types";

/**
 * While we can't access to inject/provide in guards or any non-components,
 * we can access Pinia, so it is useful to safely store "global" variables (if needed)
 */
export const useUsersStore = defineStore('users', () => {

    /**
     * Inherited stores
     */
    const {
        setLoading,
        getLoading
    } = useCoreStore();

    /**
     * STATE
     * The identification parameter of the user Object
     * READONLY and not exported
     */
    const IDENTIFICATION_KEY: string = "id";

    /**
     * STATE
     * User dictionary and list
     */
    const users = ref({} as Record<string, IUser>);

    /**
     * GETTER
     * Users list
     */
    const usersList = computed(() => Object.values(users.value));

    /**
     * MUTATION
     * Add user
     * If user already present, it will be overwritten
     *
     * @param user
     */
    const addUser = (user: IUser) => {
        const key = user[IDENTIFICATION_KEY as keyof IUser] as keyof IUser;
        users.value[key] = user
    }

    /**
     * MUTATION
     * Edit user,
     * If user not present, it will be ignored
     * If it is present, it will be merged with the new data
     *
     * @param user
     */
    const editUser = (user: IUser) => {
        const key = user[IDENTIFICATION_KEY as keyof IUser] as keyof IUser;
        if (!users.value[key])
            return
        users.value[key] = {
            ...users.value[key],
            ...user
        }
    }

    /**
     * MUTATION
     * Remove user
     *
     * @param id
     */
    const removeUser = (id: typeof IDENTIFICATION_KEY) => {
        delete users.value[id]
    }

    /**
     * GETTER
     * Get target user by ID
     */
    const getUser = computed(() =>
        (id: number) => users.value[id] || null
    )

    /**
     * MUTATIONS
     * Loadings setters
     */
    const LOADING_USERS_KEY = "users-" + getUuid();
    // Mutations
    const startUsersLoading = () => setLoading(LOADING_USERS_KEY, true);
    const stopUsersLoading = () => setLoading(LOADING_USERS_KEY, false);

    /**
     * STATE
     * Time To Live and Last Update
     * Optimize fetch requests by caching data and preventing unnecessary requests
     */
    const TTL = {
        users: 86400000,    // 1 day
        user: 86400000,     // 1 day
    };
    // Reactivity is not needed
    const lastUpdate = {
        users: 0,
        user: {} as Record<string, number>
    };

    /**
     * ACTION
     * Fetch users
     */
    const fetchUsers = async () => {
        // If TTL is not expired, the current stored data is still valid
        if(Date.now() - lastUpdate.users < TTL.users)
            return Promise.resolve();
        // Proceed with the request, but first update the lastUpdate
        lastUpdate.users = Date.now();
        startUsersLoading();
        return getUserList()
            .then((data) => {
                for(let i = 0, len = data.length; i < len; i++){
                    // Update TTL for each user
                    lastUpdate.user[data[i].id] = Date.now();
                    addUser(data[i]);
                }
            })
            .catch((error) => {
                // TODO
                // Reset TTL in case of error
                lastUpdate.users = 0;
                console.error("ERROR - fetchUsers - users store", error);
            })
            .finally(stopUsersLoading)
    }

    /**
     * MUTATIONS
     * Loadings setters
     */
    const LOADING_USER_KEY = "user-" + getUuid();
    // Mutations
    const startUserLoading = () => setLoading(LOADING_USER_KEY, true);
    const stopUserLoading = () => setLoading(LOADING_USER_KEY, false);

    /**
     * ACTION
     * Fetch target users
     */
    const fetchUser = async (id: typeof IDENTIFICATION_KEY) => {
        // If TTL is not expired, the current stored data is still valid
        if(Date.now() - lastUpdate.user[id] < TTL.user)
            return Promise.resolve();
        // Proceed with the request, but first update the lastUpdate
        lastUpdate.user[id] = Date.now();
        startUsersLoading();
        return getUserById(id)
            .then((data) => addUser(data))
            .catch((error) => {
                // TODO
                // Reset TTL in case of error
                lastUpdate.user[id] = 0;
                console.error("ERROR - fetchUser - users store", error);
            })
            .finally(stopUsersLoading)
    }

    /**
     * GETTER
     * Is fetching users
     */
    const loading = computed(() => getLoading(LOADING_USERS_KEY) || getLoading(LOADING_USERS_KEY));

    return {
        users,
        usersList,
        addUser,
        editUser,
        removeUser,
        getUser,
        startUsersLoading,
        stopUsersLoading,
        fetchUsers,
        startUserLoading,
        stopUserLoading,
        fetchUser,
        loading,
    }
})
