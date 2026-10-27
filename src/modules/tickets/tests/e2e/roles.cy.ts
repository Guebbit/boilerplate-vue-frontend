/**
 * @module
 * Who may open the ticket inbox: every persona walks the pages and buttons below, and the browser must agree
 * with what that persona's own rules say. Co-located so deleting the module deletes its sweep.
 * The helper is `tests/support/e2e/role-sweep.ts`; this file is the case list.
 */
import { sweepRoles } from '../../../../../tests/support/e2e/role-sweep';

sweepRoles('tickets', [
    {
        name: 'ticket inbox',
        route: '/en/tickets',
        can: ['read', 'Ticket'],
        menuHref: '/en/tickets',
        pageRoot: '#ticket-inbox-page'
    }
]);
