import { storeToRefs } from 'pinia';
import { useProfileStore } from '@/stores/profile';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { getCookie } from '@guebbit/js-toolkit';
import { loginContinueTo } from '@/router/navigation';
import { i18n } from '@/utils/i18n.ts';
import type { RouteLocationNormalized } from 'vue-router';

/**
 * Silently restores the in-memory access token via the refresh endpoint.
 *
 * Only attempted when the `isAuth` cookie is present — avoids a pointless
 * network round-trip for every guest page view. In mock mode the cookie is
 * pre-set by the mock initializer when a default session exists, so the guard
 * still refreshes correctly there.
 *
 * @returns A promise that always resolves: already-authenticated and guest
 *  cases resolve immediately, and a failed refresh is swallowed.
 */
const restoreTokenIfNeeded = () => {
    const store = useProfileStore();
    if (store.accessToken || !getCookie('isAuth')) return Promise.resolve();
    return store.refreshToken().catch(() => {});
};

/**
 * Silently restores auth state (token + profile) without redirecting.
 *
 * Safe to use as a global guard or on public routes that show different content
 * depending on whether the visitor is an authenticated user or admin.
 *
 * @returns A promise resolving to `void` (a "proceed" verdict for the router)
 *  once the restore attempt has settled, successfully or not.
 */
export const tryRestoreAuth = (): Promise<void> => {
    const store = useProfileStore();
    return (
        restoreTokenIfNeeded()
            .then(() => {
                if (store.accessToken) return store.fetchProfile();
            })
            // Discard the User return value so the guard resolves to void (NavigationGuardReturn)
            .then(() => {})
            .catch(() => {})
    );
};

/**
 * Route guard allowing guests only: authenticated visitors are bounced home.
 *
 * @param to - Route being entered; its `locale` param is reused for the
 *  redirect.
 * @param from - Route being left (unused, kept for the guard signature).
 * @returns A promise resolving to `undefined` to let guests through, or to a
 *  `Home` location — plus a notification — for authenticated users.
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
 * Route guard requiring an authenticated user.
 *
 * @param to - Route being entered; its `fullPath` is remembered as the login
 *  `continue` target and its `locale` param is reused.
 * @param from - Route being left (unused, kept for the guard signature).
 * @returns A promise resolving to `undefined` when authenticated, or to a
 *  `Login` location — plus a notification — otherwise.
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
 * Route guard requiring an authenticated user with admin privileges.
 *
 * @param to - Route being entered; used for the login `continue` target and
 *  the locale of any redirect.
 * @param from - Route being left (unused, kept for the guard signature).
 * @returns A promise resolving to `undefined` for admins, to a `Login` location
 *  for anonymous visitors, or to `Home` for authenticated non-admins; both
 *  redirects come with a notification.
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
