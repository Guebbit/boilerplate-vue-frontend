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
             * No need for a true component, just logout the user and be redirected to Home
             * @param to
             * @param from
             * @param next
             */
            beforeRouteEnter: (to, from, next) => {
                const { logout } = useProfileStore();
                const locale = to.params.locale as string;
                logout()
                    .then(() => next({ name: 'Home', params: { locale } }))
                    .catch(() => next({ name: 'Home', params: { locale } }));
            }
        }
    }
] as RouteRecordRaw[];
