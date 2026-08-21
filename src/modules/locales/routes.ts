import type { RouteRecordRaw } from 'vue-router';

/**
 * Locale-management routes: the languages board, the all-languages dictionary, and one
 * language's entries behind the board.
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
    /*
     * Static segment BEFORE the `:tag` param: vue-router ranks statics higher anyway, but the order
     * here says so to the reader, and nobody may register a language literally tagged
     * "dictionary".
     */
    {
        path: 'locales/dictionary',
        name: 'LocalesDictionary',
        meta: { access: 'admin' },
        component: () => import('./views/LocalesDictionary.vue')
    },
    {
        path: 'locales/:tag',
        name: 'LocaleEntries',
        meta: { access: 'admin' },
        component: () => import('./views/LocaleEntries.vue')
    }
] satisfies RouteRecordRaw[];
