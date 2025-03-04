import type { RouteRecordRaw } from 'vue-router'
import { isAdmin } from '@/middlewares/authentications.ts'

export default [
    {
        path: 'users',
        name: 'UserList',
        beforeEnter: [isAdmin],
        component: () => import('@/views/UserList.vue'),
    },
    {
        path: 'users/:id',
        name: 'UserTarget',
        beforeEnter: [isAdmin],
        component: () => import('@/views/User.vue'),
        props: true,
    },
] as RouteRecordRaw[]
