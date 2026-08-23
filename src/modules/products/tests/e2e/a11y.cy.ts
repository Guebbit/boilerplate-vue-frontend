/**
 * Accessibility for this module's own routes.
 *
 * Co-located so that deleting the module deletes its a11y coverage with it — a central list would
 * be left naming routes the app no longer serves. `tests/cross-cutting/a11y-coverage.spec.ts`
 * asserts every routed module has one of these, so the split cannot quietly lose a domain.
 *
 * The sweep itself lives in `tests/support/e2e/a11y-sweep.ts`; this file is the route list.
 *
 * Detail and edit pages need a URL, and a URL needs an id — supplied by ROLE rather than by
 * literal, so the sweep audits whichever backend the profile started. `rich` rather than any
 * in-stock product: axe can only report on markup that is rendered, and the populated record is
 * the one that puts the description, the category chips and the image on the page.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11y-sweep';

const productDetail = () =>
    cy.productInRole('rich').then((product) => `/en/products/${product.id}`);

const productEdit = () =>
    cy.productInRole('rich').then((product) => `/en/products/${product.id}/edit`);

sweepA11y('products — public', [
    ['products list', '/en/products'],
    ['product detail', productDetail],
    // The storefront's most-used page in its other theme: the product cards and the facet
    // chips carry their own colours, and a pair that passes on white can fail on dark.
    { name: 'products list, dark theme', route: '/en/products', theme: 'dark' }
]);

sweepA11y(
    'products — admin',
    [
        ['product create', '/en/products/create'],
        ['product edit', productEdit],
        {
            // Submitted empty: every field shows its error, and an error message has to be
            // associated with its field (`aria-describedby`) and announced, not only coloured.
            name: 'product create, submitted empty',
            route: '/en/products/create',
            prepare: () => {
                cy.get('form button[type=submit]').click();
                cy.get('.v-messages__message').should('be.visible');
            }
        }
    ],
    'admin'
);
