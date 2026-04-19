import { storeToRefs } from 'pinia';
import { useProfileStore } from '@/stores/profile';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { loginContinueTo } from '@/utils/helperNavigation';
import { getCookie } from '@/utils/helperGenerics.ts';
import type { RouteLocationNormalized } from 'vue-router';

/**
 * Refresh the authentication if needed
 * isAuth cookie is an helper cookie to check if the user is or should be authenticated,
 * since we can't check for the jwt token itself.
 */
export const refreshAuth = async () => {
    const { isAuth } = storeToRefs(useProfileStore());
    const { refreshToken, fetchProfile } = useProfileStore();

    /**
     * Already logged or there is no token for refresh,
     * no need to bother the server
     */
    if (isAuth.value || !getCookie('isAuth')) return;

    /**
     * Not authenticated but there could be a token.
     * Try to refresh authentication before continuing
     */
    return (
        refreshToken()
            .then(() => fetchProfile())
            // no need to handle errors, but must not block the execution

            .catch(() => {})
    );
};

/**
 * Check if user is a guest
 *
 * @param to
 * @param from
 */
export const isGuest = async (to: RouteLocationNormalized, from: RouteLocationNormalized) => {
    await refreshAuth();
    const { isAuth } = storeToRefs(useProfileStore());
    const { addMessage } = useNotificationsStore();

    if (isAuth.value) {
        addMessage('navigation.error-already-logged');
        return { name: 'Home', params: { locale: to.params.locale as string } };
    }
};

/**
 * Check if user is authenticated
 *
 * @param to
 * @param from
 */
export const isAuth = async (to: RouteLocationNormalized, from: RouteLocationNormalized) => {
    await refreshAuth();
    const { isAuth } = storeToRefs(useProfileStore());
    const { addMessage } = useNotificationsStore();

    if (!isAuth.value) {
        addMessage('navigation.error-not-logged');
        return loginContinueTo(to.fullPath, to.params.locale as string);
    }
};

/**
 * Check that user is authenticated AND admin
 *
 * @param to
 * @param from
 */
export const isAdmin = async (to: RouteLocationNormalized, from: RouteLocationNormalized) => {
    await refreshAuth();
    const { isAuth, isAdmin } = storeToRefs(useProfileStore());
    const { addMessage } = useNotificationsStore();

    if (!isAuth.value) {
        addMessage('navigation.error-not-logged');
        return loginContinueTo(to.fullPath, to.params.locale as string);
    }
    if (!isAdmin.value) {
        addMessage('navigation.error-forbidden');
        return { name: 'Home', params: { locale: to.params.locale as string } };
    }
};
