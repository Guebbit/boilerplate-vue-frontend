import type { RouteRecordRaw } from 'vue-router';

export default [
    {
        path: 'users',
        name: 'UsersList',
        meta: { access: 'admin', title: 'users-list-page.page-title' },
        component: () => import('@/modules/users/views/UsersList.vue')
    },
    {
        path: 'users/create',
        name: 'UserCreate',
        meta: { access: 'admin', title: 'user-create-page.page-title' },
        component: () => import('@/modules/users/views/UserCreate.vue')
    },
    {
        path: 'users/:id',
        name: 'UserTarget',
        meta: { access: 'admin', title: 'user-target-page.page-title' },
        component: () => import('@/modules/users/views/User.vue'),
        props: true
    },
    {
        path: 'users/:id/edit',
        name: 'UserEdit',
        meta: { access: 'admin', title: 'user-edit-page.page-title' },
        component: () => import('@/modules/users/views/UserEdit.vue'),
        props: true
    }
] as RouteRecordRaw[];
