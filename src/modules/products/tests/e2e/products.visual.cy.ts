/**
 * @module
 * Screen list for the module's visual-regression sweep — see `tests/support/e2e/visual-sweep.ts`
 * for the mechanism.
 *
 * Not part of `npm run complete`: run with `npm run test:e2e:visual`, and re-record with
 * `npm run test:e2e:visual:update` only after LOOKING at the diff image.
 */
import { sweepVisual } from '../../../../../tests/support/e2e/visual-sweep';

sweepVisual('products', [
    // Filters stack above the grid on a phone; the tablet keeps the grid wide.
    {
        name: 'products-list',
        route: '/en/products',
        readySelector: '#products-list-page',
        viewports: ['desktop', 'phone', 'tablet']
    },
    {
        name: 'products-list',
        route: '/en/products',
        readySelector: '#products-list-page',
        viewports: ['phone'],
        theme: 'dark'
    },
    {
        // The storefront's main page, through a seeded guarantee rather than a literal id.
        name: 'product',
        route: () => cy.subjectId('product.rich').then((id) => `/en/products/${id}`),
        readySelector: '#product-target',
        viewports: ['desktop', 'phone']
    }
]);
