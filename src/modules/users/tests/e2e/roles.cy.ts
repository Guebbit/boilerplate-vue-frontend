/**
 * @module
 * Who may open the people pages: every persona walks the pages and buttons below, and the browser must agree
 * with what that persona's own rules say. Co-located so deleting the module deletes its sweep.
 * The helper is `tests/support/e2e/role-sweep.ts`; this file is the case list.
 */
import { sweepRoles } from '../../../../../tests/support/e2e/role-sweep';

sweepRoles('users', [
    {
        name: 'users list',
        route: '/en/users',
        can: ['read', 'User'],
        menuHref: '/en/users',
        pageRoot: '#users-list-page'
    },
    {
        name: 'a user page',
        route: () => cy.accountInRole('unverified').then(({ id }) => `/en/users/${id}`),
        can: ['read', 'User'],
        pageRoot: 'h1'
    },
    {
        name: 'user create',
        route: '/en/users/create',
        can: ['create', 'User'],
        pageRoot: '#user-create-page'
    },
    {
        name: 'user edit',
        route: () => cy.accountInRole('unverified').then(({ id }) => `/en/users/${id}/edit`),
        can: ['update', 'User'],
        pageRoot: '#user-edit-page'
    }
]);
