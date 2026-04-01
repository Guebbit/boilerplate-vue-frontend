import type { RouteRecordRaw } from 'vue-router';
import { isAdmin } from '@/middlewares/authentications.ts';

export default [
    {
        path: 'users',
        name: 'UsersList',
        beforeEnter: [isAdmin],
        component: () => import('@/views/UsersList.vue')
    },
    {
        path: 'users/create',
        name: 'UserCreate',
        beforeEnter: [isAdmin],
        component: () => import('@/views/UserCreate.vue')
    },
    {
        path: 'users/:id',
        name: 'UserTarget',
        beforeEnter: [isAdmin],
        component: () => import('@/views/User.vue'),
        props: true
    },
    {
        path: 'users/:id/edit',
        name: 'UserEdit',
        beforeEnter: [isAdmin],
        component: () => import('@/views/UserEdit.vue'),
        props: true
    }
] as RouteRecordRaw[];
