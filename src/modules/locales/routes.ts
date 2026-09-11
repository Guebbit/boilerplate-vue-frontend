/**
 * @module
 * Route table: a plain array of `RouteRecordRaw`, each entry lazy-loading its view, spliced into
 * the app router by the module registry.
 */
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
        meta: { access: 'auth', can: ['update', 'Locale'], title: 'locales-list-page.page-title' },
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
        meta: {
            access: 'auth',
            can: ['update', 'Locale'],
            title: 'locales-dictionary-page.page-title'
        },
        component: () => import('./views/LocalesDictionary.vue')
    },
    {
        path: 'locales/:tag',
        name: 'LocaleEntries',
        meta: {
            access: 'auth',
            can: ['update', 'Locale'],
            title: 'locale-entries-page.page-title'
        },
        component: () => import('./views/LocaleEntries.vue')
    },
    /*
     * The generic translation door's own screen — gated on `translations.read`, not
     * `products.manage`: an unrestricted admin still reaches it, but the narrower key is what
     * would let a translations-only role in without `products.manage`. No shipped role holds
     * exactly that shape (`editor` carries both), but the key stays separable for one that would.
     */
    {
        path: 'locales/translations/:entityType/:id',
        name: 'EntityTranslations',
        meta: {
            access: 'auth',
            can: ['read', 'Translation'],
            title: 'entity-translations-page.page-title'
        },
        component: () => import('./views/EntityTranslations.vue')
    }
] satisfies RouteRecordRaw[];
