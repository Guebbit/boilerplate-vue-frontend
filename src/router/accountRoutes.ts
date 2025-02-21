import { useProfileStore } from '@/stores/profile.ts'
import type { RouteRecordRaw, NavigationGuardWithThis } from 'vue-router'
import { isAdmin, isAuth, isGuest, refreshAuth } from '@/middlewares/authentications.ts'

/**
 * No need for a component, just logout the user and redirect to the home page
 *
 * @param to
 * @param from
 * @param next
 */
const logoutTrigger: NavigationGuardWithThis<undefined> = (to, from, next) => {
    const {
        logout
    } = useProfileStore()
    logout()
    next({
        name: 'Home'
    });
}

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
        beforeEnter: logoutTrigger
    }
] as RouteRecordRaw[]
