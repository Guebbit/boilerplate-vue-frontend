/**
 * @module
 * Who may open the API key pages: every persona walks the pages and buttons below, and the browser must agree
 * with what that persona's own rules say. Co-located so deleting the module deletes its sweep.
 * The helper is `tests/support/e2e/role-sweep.ts`; this file is the case list.
 */
import { sweepRoles } from '../../../../../tests/support/e2e/role-sweep';

sweepRoles('api-keys', [
    {
        name: 'keys',
        route: '/en/api-keys',
        can: ['read', 'ApiKey'],
        menuHref: '/en/api-keys',
        pageRoot: '#api-keys-list-page'
    },
    {
        name: 'key create',
        route: '/en/api-keys/create',
        can: ['create', 'ApiKey'],
        pageRoot: '#api-key-create-page'
    }
]);
