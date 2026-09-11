/**
 * @module
 * Route table for the users module: each record pairs a path with the lazy-loaded
 * view and the `meta.access` level the router guard enforces.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * Route records for the users module, mounted under the app's module registry.
 */
export default [
    {
        path: 'users',
        name: 'UsersList',
        meta: { access: 'auth', can: ['read', 'User'], title: 'users-list-page.page-title' },
        component: () => import('@/modules/users/views/UsersList.vue')
    },
    {
        path: 'users/create',
        name: 'UserCreate',
        meta: { access: 'auth', can: ['create', 'User'], title: 'user-create-page.page-title' },
        component: () => import('@/modules/users/views/UserCreate.vue')
    },
    {
        path: 'users/:id',
        name: 'UserTarget',
        meta: { access: 'auth', can: ['read', 'User'], title: 'user-target-page.page-title' },
        component: () => import('@/modules/users/views/User.vue'),
        props: true
    },
    {
        path: 'users/:id/edit',
        name: 'UserEdit',
        meta: { access: 'auth', can: ['update', 'User'], title: 'user-edit-page.page-title' },
        component: () => import('@/modules/users/views/UserEdit.vue'),
        props: true
    }
] satisfies RouteRecordRaw[];
