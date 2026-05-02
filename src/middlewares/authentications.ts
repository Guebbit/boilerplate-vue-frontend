import { storeToRefs } from 'pinia';
import { useProfileStore } from '@/stores/profile';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { loginContinueTo } from '@/utils/helperNavigation';
import { getCookie } from '@/utils/helperGenerics.ts';
import { i18n } from '@/utils/i18n.ts';
import type { RouteLocationNormalized } from 'vue-router';

/**
 * Check if user is a guest
 *
 * @param to
 * @param from
 */
export const isGuest = async (to: RouteLocationNormalized, from: RouteLocationNormalized) => {
    const { fetchProfile } = useProfileStore();
    const { isAuth } = storeToRefs(useProfileStore());
    await fetchProfile();
    const { addMessage } = useNotificationsStore();

    if (isAuth.value) {
        addMessage(i18n.global.t('navigation.error-already-logged'));
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
    const { fetchProfile } = useProfileStore();
    await fetchProfile();
    const { isAuth } = storeToRefs(useProfileStore());
    const { addMessage } = useNotificationsStore();

    if (!isAuth.value) {
        addMessage(i18n.global.t('navigation.error-not-logged'));
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
    const { fetchProfile } = useProfileStore();
    const { isAuth, isAdmin } = storeToRefs(useProfileStore());
    await fetchProfile();
    const { addMessage } = useNotificationsStore();

    if (!isAuth.value) {
        addMessage(i18n.global.t('navigation.error-not-logged'));
        return loginContinueTo(to.fullPath, to.params.locale as string);
    }
    if (!isAdmin.value) {
        addMessage(i18n.global.t('navigation.error-forbidden'));
        return { name: 'Home', params: { locale: to.params.locale as string } };
    }
};
