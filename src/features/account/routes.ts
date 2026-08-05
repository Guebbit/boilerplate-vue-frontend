import { useProfileStore } from '@/stores/profile.ts';
import type { RouteRecordRaw } from 'vue-router';
import { isAuth, isGuest } from '@/middlewares/authentications.ts';

export default [
    {
        path: 'login',
        name: 'Login',
        beforeEnter: [isGuest],
        component: () => import('@/features/account/views/Login.vue')
    },
    {
        path: 'signup',
        name: 'Signup',
        beforeEnter: [isGuest],
        component: () => import('@/features/account/views/Signup.vue')
    },
    {
        path: 'password-reset',
        name: 'PasswordResetRequest',
        beforeEnter: [isGuest],
        component: () => import('@/features/account/views/PasswordResetRequest.vue')
    },
    {
        path: 'password-reset/confirm',
        name: 'PasswordResetConfirm',
        beforeEnter: [isGuest],
        component: () => import('@/features/account/views/PasswordResetConfirm.vue')
    },
    {
        path: 'account-delete/confirm',
        name: 'AccountDeleteConfirm',
        component: () => import('@/features/account/views/AccountDeleteConfirm.vue')
    },
    {
        path: 'profile',
        name: 'Profile',
        beforeEnter: [isAuth],
        component: () => import('@/features/account/views/Profile.vue')
    },
    {
        path: 'logout',
        name: 'Logout',
        component: {
            /**
             * No need for a true component: log the user out, then leave.
             *
             * Returns the destination instead of calling the `next(...)` callback — the
             * callback style is deprecated in Vue Router 4 and logs a warning on every hit.
             *
             * @param to - Route being entered; only its `locale` param is used.
             * @returns A promise resolving to `Home`, whether the logout call succeeds or fails.
             */
            beforeRouteEnter: (to) => {
                const { logout } = useProfileStore();
                const locale = to.params.locale as string;
                return logout()
                    .then(() => ({ name: 'Home', params: { locale } }))
                    .catch(() => ({ name: 'Home', params: { locale } }));
            }
        }
    }
] as RouteRecordRaw[];
