/**
 * @module
 * Route table for the api-keys module: two screens, list and mint — there is no `PATCH` for a
 * credential (name, permissions and expiry are fixed at mint time), so there is nothing to edit
 * and no detail page either, since every field fits a list row.
 */
import type { RouteRecordRaw } from 'vue-router';

/**
 * Route records for the api-keys module, mounted under the app's module registry.
 */
export default [
    {
        path: 'api-keys',
        name: 'ApiKeysList',
        meta: {
            access: 'auth',
            can: ['read', 'ApiKey'],
            title: 'api-keys-list-page.page-title'
        },
        component: () => import('@/modules/api-keys/views/ApiKeysList.vue')
    },
    {
        path: 'api-keys/create',
        name: 'ApiKeyCreate',
        meta: {
            access: 'auth',
            can: ['create', 'ApiKey'],
            title: 'api-key-create-page.page-title'
        },
        component: () => import('@/modules/api-keys/views/ApiKeyCreate.vue')
    }
] satisfies RouteRecordRaw[];
