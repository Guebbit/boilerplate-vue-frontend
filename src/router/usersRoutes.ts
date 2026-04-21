import type { RouteRecordRaw } from 'vue-router';
import { isAdmin } from '@/middlewares/authentications.ts';

export default [
    {
        path: 'users',
        name: 'UsersList',
        beforeEnter: [isAdmin],
        component: () => import('@/views/users/UsersList.vue')
    },
    {
        path: 'users/create',
        name: 'UserCreate',
        beforeEnter: [isAdmin],
        component: () => import('@/views/users/UserCreate.vue')
    },
    {
        path: 'users/:id',
        name: 'UserTarget',
        beforeEnter: [isAdmin],
        component: () => import('@/views/users/User.vue'),
        props: true
    },
    {
        path: 'users/:id/edit',
        name: 'UserEdit',
        beforeEnter: [isAdmin],
        component: () => import('@/views/users/UserEdit.vue'),
        props: true
    }
] as RouteRecordRaw[];
