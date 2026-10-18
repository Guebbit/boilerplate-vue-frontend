/**
 * @module
 * Who may open the stock room and the preorder board: every persona walks the pages and buttons below, and the browser must agree
 * with what that persona's own rules say. Co-located so deleting the module deletes its sweep.
 * The helper is `tests/support/e2e/role-sweep.ts`; this file is the case list.
 */
import { sweepRoles } from '../../../../../tests/support/e2e/role-sweep';

sweepRoles('inventory', [
    {
        name: 'stock board',
        route: '/en/inventory',
        can: ['read', 'StockLevel'],
        menuHref: '/en/inventory',
        pageRoot: '#inventory-page',
        buttons: [
            // Receipt and adjust forms, and the sweep, are separate doors on the same page.
            { selector: '[data-test=receipt-form]', can: ['create', 'StockMovement'] },
            { selector: '[data-test=sweep-submit]', can: ['sweep', 'StockLevel'] }
        ]
    },
    {
        name: 'preorder board',
        route: '/en/sales/preorders',
        can: ['display', 'Order'],
        menuHref: '/en/sales/preorders',
        pageRoot: '#preorders-board-page'
    }
]);
