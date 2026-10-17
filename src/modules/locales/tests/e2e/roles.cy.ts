/**
 * @module
 * Who may open the language pages: every persona walks the pages and buttons below, and the browser must agree
 * with what that persona's own rules say. Co-located so deleting the module deletes its sweep.
 * The helper is `tests/support/e2e/role-sweep.ts`; this file is the case list.
 */
import { sweepRoles } from '../../../../../tests/support/e2e/role-sweep';

sweepRoles('locales', [
    {
        name: 'languages',
        route: '/en/locales',
        can: ['update', 'Locale'],
        menuHref: '/en/locales',
        pageRoot: '#locales-list-page'
    },
    {
        name: 'dictionary',
        route: '/en/locales/dictionary',
        can: ['update', 'Locale'],
        pageRoot: '#locales-dictionary-page'
    },
    {
        name: 'entries of a language',
        route: '/en/locales/en',
        can: ['update', 'Locale'],
        pageRoot: '#locale-entries-page'
    },
    {
        name: 'entity translations',
        route: () =>
            cy.subjectId('product.rich').then((id) => `/en/locales/translations/product/${id}`),
        can: ['read', 'Translation'],
        pageRoot: '#entity-translations-page'
    }
]);
