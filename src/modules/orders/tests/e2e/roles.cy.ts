/**
 * @module
 * Who may open the staff order pages: every persona walks the pages and buttons below, and the browser must agree
 * with what that persona's own rules say. Co-located so deleting the module deletes its sweep.
 * The helper is `tests/support/e2e/role-sweep.ts`; this file is the case list.
 */
import { sweepRoles } from '../../../../../tests/support/e2e/role-sweep';

sweepRoles('orders', [
    {
        name: 'staff orders list',
        route: '/en/sales/orders',
        can: ['display', 'Order'],
        menuHref: '/en/sales/orders',
        pageRoot: '#orders-list-page',
        buttons: [
            { selector: '[data-test=orders-export]', can: ['export', 'Order'] },
            { selector: '[data-test=order-reference-search]', can: ['create', 'Payment'] },
            { selector: '[data-test=row-edit]', can: ['update', 'Order'] }
        ]
    },
    {
        name: 'order edit',
        route: () => cy.subjectId('order.paid').then((id) => `/en/orders/${id}/edit`),
        can: ['update', 'Order'],
        pageRoot: '#order-edit-page'
    }
]);
