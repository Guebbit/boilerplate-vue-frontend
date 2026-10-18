/**
 * @module
 * Who may open the payments page: every persona walks the pages and buttons below, and the browser must agree
 * with what that persona's own rules say. Co-located so deleting the module deletes its sweep.
 * The helper is `tests/support/e2e/role-sweep.ts`; this file is the case list.
 */
import { sweepRoles } from '../../../../../tests/support/e2e/role-sweep';

sweepRoles('payments', [
    {
        name: 'payments',
        route: '/en/sales/payments',
        can: ['display', 'Payment'],
        menuHref: '/en/sales/payments',
        pageRoot: '#payments-list-page',
        buttons: [{ selector: '[data-test=order-reference-search]', can: ['create', 'Payment'] }]
    }
]);
