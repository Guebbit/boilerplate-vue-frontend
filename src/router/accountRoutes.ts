import { useProfileStore } from '@/stores/profile.ts'
import type { RouteRecordRaw, NavigationGuardWithThis } from 'vue-router'

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
        component: () => import('@/views/Profile.vue')
    },
    {
        path: 'logout',
        name: 'Logout',
        beforeEnter: logoutTrigger
    }
] as RouteRecordRaw[]
