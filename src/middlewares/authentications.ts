import { storeToRefs } from 'pinia';
import { useProfileStore } from '@/stores/profile';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { loginContinueTo } from '@/utils/helperNavigation';
import { i18n } from '@/utils/i18n.ts';
import type { RouteLocationNormalized } from 'vue-router';

/**
 * Restore the in-memory access token by attempting a silent token refresh.
 * Succeeds when there is an active server-side session (real API: valid
 * refresh-token cookie; mock: currentAuthenticatedUserId is set).
 * Errors are swallowed so callers always continue to the profile fetch.
 */
const restoreTokenIfNeeded = () => {
    const store = useProfileStore();
    if (store.accessToken) return Promise.resolve();
    return store.refreshToken().catch(() => {});
};

/**
 * Check if user is a guest
 *
 * @param to
 * @param from
 */
export const isGuest = (to: RouteLocationNormalized, from: RouteLocationNormalized) =>
    restoreTokenIfNeeded()
        .then(() => useProfileStore().fetchProfile())
        .catch(() => {})
        .then(() => {
            const { isAuth } = storeToRefs(useProfileStore());
            if (isAuth.value) {
                useNotificationsStore().addMessage(
                    i18n.global.t('navigation.error-already-logged')
                );
                return { name: 'Home', params: { locale: to.params.locale as string } };
            }
        });

/**
 * Check if user is authenticated
 *
 * @param to
 * @param from
 */
export const isAuth = (to: RouteLocationNormalized, from: RouteLocationNormalized) =>
    restoreTokenIfNeeded()
        .then(() => useProfileStore().fetchProfile())
        .catch(() => {})
        .then(() => {
            const { isAuth } = storeToRefs(useProfileStore());
            if (!isAuth.value) {
                useNotificationsStore().addMessage(i18n.global.t('navigation.error-not-logged'));
                return loginContinueTo(to.fullPath, to.params.locale as string);
            }
        });

/**
 * Check that user is authenticated AND admin
 *
 * @param to
 * @param from
 */
export const isAdmin = (to: RouteLocationNormalized, from: RouteLocationNormalized) =>
    restoreTokenIfNeeded()
        .then(() => useProfileStore().fetchProfile())
        .catch(() => {})
        .then(() => {
            const { isAuth, isAdmin } = storeToRefs(useProfileStore());
            if (!isAuth.value) {
                useNotificationsStore().addMessage(i18n.global.t('navigation.error-not-logged'));
                return loginContinueTo(to.fullPath, to.params.locale as string);
            }
            if (!isAdmin.value) {
                useNotificationsStore().addMessage(i18n.global.t('navigation.error-forbidden'));
                return { name: 'Home', params: { locale: to.params.locale as string } };
            }
        });
