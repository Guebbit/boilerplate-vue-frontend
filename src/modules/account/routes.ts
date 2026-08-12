import { useAccountStore } from '@/modules/account/store.ts';
import type { RouteRecordRaw } from 'vue-router';

export default [
    {
        path: 'login',
        name: 'Login',
        meta: { access: 'guest' },
        component: () => import('@/modules/account/views/Login.vue')
    },
    {
        path: 'signup',
        name: 'Signup',
        meta: { access: 'guest' },
        component: () => import('@/modules/account/views/Signup.vue')
    },
    {
        path: 'password-reset',
        name: 'PasswordResetRequest',
        meta: { access: 'guest' },
        component: () => import('@/modules/account/views/PasswordResetRequest.vue')
    },
    {
        path: 'password-reset/confirm',
        name: 'PasswordResetConfirm',
        meta: { access: 'guest' },
        component: () => import('@/modules/account/views/PasswordResetConfirm.vue')
    },
    {
        // Public deliberately: the confirmation link arrives by email, and the visitor following
        // it is by definition not logged in — the token in the URL is the credential.
        path: 'account-delete/confirm',
        name: 'AccountDeleteConfirm',
        component: () => import('@/modules/account/views/AccountDeleteConfirm.vue')
    },
    {
        path: 'profile',
        name: 'Profile',
        meta: { access: 'auth' },
        component: () => import('@/modules/account/views/Profile.vue')
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
                const { logout } = useAccountStore();
                const locale = to.params.locale as string;
                return logout()
                    .then(() => ({ name: 'Home', params: { locale } }))
                    .catch(() => ({ name: 'Home', params: { locale } }));
            }
        }
    }
] as RouteRecordRaw[];
