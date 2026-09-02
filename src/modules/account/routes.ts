/**
 * @module
 * The account module's route table — one array of `RouteRecordRaw`, spliced into the app router
 * by the kernel. Each entry pairs a path with an access requirement the route guard reads;
 * `Logout` is a routeless component whose `beforeRouteEnter` does the work instead of rendering.
 */
import { useAuthStore } from '@/modules/account/stores/auth.ts';
import type { RouteRecordRaw } from 'vue-router';

/**
 * Every route this module contributes: the login/signup/reset/verify/delete flows, the
 * authenticated profile page, and the routeless `Logout` entry.
 */
export default [
    {
        path: 'login',
        name: 'Login',
        meta: { access: 'guest', title: 'login-page.page-title' },
        component: () => import('@/modules/account/views/Login.vue')
    },
    {
        path: 'signup',
        name: 'Signup',
        meta: { access: 'guest', title: 'signup-page.page-title' },
        component: () => import('@/modules/account/views/Signup.vue')
    },
    {
        path: 'password-reset',
        name: 'PasswordResetRequest',
        meta: { access: 'guest', title: 'password-reset-request-page.page-title' },
        component: () => import('@/modules/account/views/PasswordResetRequest.vue')
    },
    {
        path: 'password-reset/confirm',
        name: 'PasswordResetConfirm',
        meta: { access: 'guest', title: 'password-reset-confirm-page.page-title' },
        component: () => import('@/modules/account/views/PasswordResetConfirm.vue')
    },
    {
        // Public deliberately: the confirmation link arrives by email, and the visitor following
        // it is by definition not logged in — the token in the URL is the credential.
        path: 'account-delete/confirm',
        name: 'AccountDeleteConfirm',
        meta: { title: 'account-delete-confirm-page.page-title' },
        component: () => import('@/modules/account/views/AccountDeleteConfirm.vue')
    },
    {
        // Public for the same reason as the two confirms above: the token is the credential.
        path: 'verify-email/confirm',
        name: 'VerifyEmailConfirm',
        meta: { title: 'verify-email-confirm-page.page-title' },
        component: () => import('@/modules/account/views/VerifyEmailConfirm.vue')
    },
    {
        // Public: the backend's own redirect (`router/index.ts`'s locale-less `/oauth/callback`
        // shell) lands an ANONYMOUS browser here mid-flow, before any session is confirmed.
        path: 'oauth/callback',
        name: 'OAuthCallback',
        meta: { title: 'oauth.callback-page.page-title' },
        component: () => import('@/modules/account/views/OAuthCallback.vue')
    },
    {
        path: 'profile',
        name: 'Profile',
        meta: { access: 'auth', title: 'profile-page.page-title' },
        component: () => import('@/modules/account/views/Profile.vue')
    },
    {
        path: 'logout',
        name: 'Logout',
        meta: { title: 'navigation.label-logout' },
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
                const { logout } = useAuthStore();
                const locale = to.params.locale as string;
                return logout()
                    .then(() => ({ name: 'Home', params: { locale } }))
                    .catch(() => ({ name: 'Home', params: { locale } }));
            }
        }
    }
] as RouteRecordRaw[];
