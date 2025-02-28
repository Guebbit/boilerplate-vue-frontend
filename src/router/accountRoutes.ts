import { useProfileStore } from '@/stores/profile.ts'
import type { RouteRecordRaw } from 'vue-router'
import { isAuth, isGuest } from '@/middlewares/authentications.ts'

export default [
    {
        path: 'login',
        name: 'Login',
        beforeEnter: [isGuest],
        component: () => import('@/views/Login.vue'),
    },
    {
        path: 'signup',
        name: 'Signup',
        component: () => import('@/views/Signup.vue')
    },
    {
        path: 'profile',
        name: 'Profile',
        beforeEnter: [isAuth],
        component: () => import('@/views/Profile.vue')
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
            beforeRouteEnter: async (to, from, next) => {
                const { logout } = useProfileStore()
                await logout()
                next({
                    name: 'Home'
                });
            }
        }
    }
] as RouteRecordRaw[]
