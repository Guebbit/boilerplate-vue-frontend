import type { RouteRecordRaw } from 'vue-router'

export default [
    {
        path: 'users',
        name: 'UserList',
        component: () => import('@/views/UserList.vue'),
    },
    {
        path: 'users/:id',
        name: 'UserTarget',
        component: () => import('@/views/User.vue'),
        props: true,
    },
] as RouteRecordRaw[]
