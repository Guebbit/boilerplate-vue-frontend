/**
 * @module
 * Who may open the product pages: every persona walks the pages and buttons below, and the browser must agree
 * with what that persona's own rules say. Co-located so deleting the module deletes its sweep.
 * The helper is `tests/support/e2e/role-sweep.ts`; this file is the case list.
 */
import { sweepRoles } from '../../../../../tests/support/e2e/role-sweep';

sweepRoles('products', [
    {
        name: 'product list',
        route: '/en/products',
        can: ['read', 'Product'],
        pageRoot: '#products-list-page',
        buttons: [
            { selector: '[data-test=create-product]', can: ['create', 'Product'] },
            { selector: '[data-test=row-edit]', can: ['update', 'Product'] }
        ]
    },
    {
        name: 'product create',
        route: '/en/products/create',
        can: ['create', 'Product'],
        pageRoot: '#product-create-page',
        buttons: [
            // The opening count is the stock room's door, stacked on top of `create:Product`.
            { selector: '[data-test=product-on-hand-field]', can: ['create', 'StockMovement'] }
        ]
    },
    {
        name: 'product page',
        route: () => cy.subjectId('product.rich').then((id) => `/en/products/${id}`),
        can: ['read', 'Product'],
        pageRoot: 'h1',
        buttons: [{ selector: '[data-test=go-to-edit]', can: ['update', 'Product'] }]
    },
    {
        name: 'product edit',
        route: () => cy.subjectId('product.rich').then((id) => `/en/products/${id}/edit`),
        can: ['update', 'Product'],
        pageRoot: '#product-edit-page'
    }
]);
