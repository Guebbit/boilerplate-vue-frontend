import { ref, computed } from 'vue'
import { defineStore } from 'pinia';
import { getUuid } from '@guebbit/js-toolkit'
import { getProfile, refreshAuthentication } from '@/api'
import { useCoreStore } from "@/stores/core";
import type { IUserProfile } from "@/types";

/**
 * While we can't access to inject/provide in guards or any non-components,
 * we can access Pinia, so it is useful to safely store "global" variables (if needed)
 */
export const useProfileStore = defineStore('profile', () => {

    /**
     * Inherited stores
     */
    const {
        setLoading,
        getLoading
    } = useCoreStore();

    /**
     * STATE
     * Current user profile data
     */
    const profile = ref<IUserProfile | null>(null);

    /**
     * STATE
     * Current user authentication token
     */
    const token = ref<string | null>(null);

    /**
     * STATE
     * Time To Live and Last Update
     * Optimize fetch requests by caching data and preventing unnecessary requests
     */
    const TTL = {
        auth: 3600000,      // 1 hour
        login: 86400000,    // 1 day
        profile: 86400000,  // 1 day
    };
    // Reactivity is not needed
    const lastUpdate = {
        auth: 0,
        login: 0,
        profile: 0,
    };

    /**
     * MUTATIONS
     * Loadings setters
     */
    const LOADING_AUTH_KEY = "auth-" + getUuid();
    // Mutations
    // TODO remove personalized loading mutations
    const startAuthLoading = () => setLoading(LOADING_AUTH_KEY, true);
    const stopAuthLoading = () => setLoading(LOADING_AUTH_KEY, false);

    /**
     * ACTION
     * Fetch users
     */
    const fetchAuthentication = async () => {
        // If TTL is not expired, the current stored data is still valid
        if(Date.now() - lastUpdate.auth < TTL.auth)
            return Promise.resolve();
        // Proceed with the request, but first update the lastUpdate
        lastUpdate.auth = Date.now();
        startAuthLoading();
        return refreshAuthentication()
            .then((secret) => token.value = secret)
            .catch((error: unknown) => {
                // TODO
                // Reset TTL in case of error
                lastUpdate.auth = 0;
                console.error("ERROR - fetchUsers - users store", error);
            })
            .finally(stopAuthLoading)
    }

    /**
     * MUTATIONS
     * Loadings setters
     */
    const LOADING_PROFILE_KEY = "profile-" + getUuid();
    // Mutations
    const startProfileLoading = () => setLoading(LOADING_PROFILE_KEY, true);
    const stopProfileLoading = () => setLoading(LOADING_PROFILE_KEY, false);

    /**
     * ACTION
     * Fetch target users
     */
    const fetchProfile = async () => {
        // TODO CHECK AUTHENTICATION
        // If TTL is not expired, the current stored data is still valid
        if(Date.now() - lastUpdate.profile < TTL.profile)
            return Promise.resolve();
        // Proceed with the request, but first update the lastUpdate
        lastUpdate.profile = Date.now();
        startProfileLoading();
        return getProfile()
            .then((data) => profile.value = data)
            .catch((error: unknown) => {
                // TODO
                // Reset TTL in case of error
                lastUpdate.profile = 0;
                console.error("ERROR - fetchUser - users store", error);
            })
            .finally(stopProfileLoading)
    }

    /**
     * GETTER
     * Is authenticating or getting profile data
     */
    const loading = computed(() => getLoading(LOADING_PROFILE_KEY) || getLoading(LOADING_AUTH_KEY));

    return {
        profile,
        token,
        TTL,
        lastUpdate,
        LOADING_AUTH_KEY,
        startAuthLoading,
        stopAuthLoading,
        fetchAuthentication,
        LOADING_PROFILE_KEY,
        startProfileLoading,
        stopProfileLoading,
        fetchProfile,
        loading,
    }
})
