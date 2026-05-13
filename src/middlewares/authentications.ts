import { storeToRefs } from 'pinia';
import { useProfileStore } from '@/stores/profile';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { loginContinueTo } from '@/utils/helperNavigation';
import { getCookie } from '@/utils/helperGenerics.ts';
import { i18n } from '@/utils/i18n.ts';
import type { RouteLocationNormalized } from 'vue-router';

/**
 * Silently restore the in-memory access token via the refresh endpoint.
 * Only attempted when the `isAuth` cookie is present — avoids a pointless
 * network round-trip for every guest page view.
 * In mock mode the cookie is pre-set by the mock initializer when a default
 * session exists, so the guard still refreshes correctly there.
 */
const restoreTokenIfNeeded = () => {
    const store = useProfileStore();
    if (store.accessToken || !getCookie('isAuth')) return Promise.resolve();
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
