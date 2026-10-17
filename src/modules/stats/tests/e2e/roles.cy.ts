/**
 * @module
 * Who may open the sales numbers: every persona walks the pages and buttons below, and the browser must agree
 * with what that persona's own rules say. Co-located so deleting the module deletes its sweep.
 * The helper is `tests/support/e2e/role-sweep.ts`; this file is the case list.
 */
import { sweepRoles } from '../../../../../tests/support/e2e/role-sweep';

sweepRoles('stats', [
    {
        name: 'sales dashboard',
        route: '/en/sales/stats',
        can: ['read', 'Stats'],
        menuHref: '/en/sales/stats',
        pageRoot: '#stats-dashboard-page'
    },
    {
        name: 'one product sales',
        route: () => cy.subjectId('product.rich').then((id) => `/en/sales/stats/products/${id}`),
        can: ['read', 'Stats'],
        pageRoot: '#stats-product-sales-page'
    }
]);
