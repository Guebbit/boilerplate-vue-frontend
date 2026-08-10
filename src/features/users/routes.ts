import type { RouteRecordRaw } from 'vue-router';

export default [
    {
        path: 'users',
        name: 'UsersList',
        meta: { access: 'admin' },
        component: () => import('@/features/users/views/UsersList.vue')
    },
    {
        path: 'users/create',
        name: 'UserCreate',
        meta: { access: 'admin' },
        component: () => import('@/features/users/views/UserCreate.vue')
    },
    {
        path: 'users/:id',
        name: 'UserTarget',
        meta: { access: 'admin' },
        component: () => import('@/features/users/views/User.vue'),
        props: true
    },
    {
        path: 'users/:id/edit',
        name: 'UserEdit',
        meta: { access: 'admin' },
        component: () => import('@/features/users/views/UserEdit.vue'),
        props: true
    }
] as RouteRecordRaw[];
