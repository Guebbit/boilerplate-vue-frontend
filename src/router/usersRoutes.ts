import type { RouteRecordRaw } from 'vue-router'
import { isAdmin } from '@/middlewares/authentications.ts'

export default [
    {
        path: 'users',
        name: 'UsersList',
        beforeEnter: [isAdmin],
        component: () => import('@/views/UsersList.vue'),
    },
    {
        path: 'users/:id',
        name: 'UserTarget',
        beforeEnter: [isAdmin],
        component: () => import('@/views/User.vue'),
        props: true,
    },
] as RouteRecordRaw[]
