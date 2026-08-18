import type { RouteRecordRaw } from 'vue-router';

/**
 * Locale-management routes: the languages board, and one language's entries behind it.
 *
 * The param is `:tag` rather than `:locale` because the parent route already owns `:locale` for
 * the interface language — a nested duplicate would silently shadow it in every guard.
 */
export default [
    {
        path: 'locales',
        name: 'LocalesList',
        meta: { access: 'admin' },
        component: () => import('./views/LocalesList.vue')
    },
    {
        path: 'locales/:tag',
        name: 'LocaleEntries',
        meta: { access: 'admin' },
        component: () => import('./views/LocaleEntries.vue')
    }
] satisfies RouteRecordRaw[];
