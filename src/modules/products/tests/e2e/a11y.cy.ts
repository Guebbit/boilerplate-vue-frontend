/**
 * @module
 * Route list for the module's a11y sweep — see `tests/support/e2e/a11y-sweep.ts` for the
 * mechanism that turns these into axe runs.
 *
 * Detail and edit pages need a URL, and a URL needs an id — supplied by ROLE rather than by
 * literal, so the sweep audits whichever backend the profile started. `rich` rather than any
 * in-stock product: the populated record is the one that puts the description, the category
 * chips and the image on the page for axe to report on.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11y-sweep';

/** iPhone 14-class portrait — the width `DataTable.vue`'s `mobile-breakpoint` stacks rows below. */
const PHONE = [390, 844] as const;

/**
 * Detail-page URL for a populated product, resolved from a seeded role rather than a literal id.
 */
const productDetail = () =>
    cy.productInRole('rich').then((product) => `/en/products/${product.id}`);

/**
 * Edit-page URL for the same populated product.
 */
const productEdit = () =>
    cy.productInRole('rich').then((product) => `/en/products/${product.id}/edit`);

sweepA11y('products — public', [
    ['products list', '/en/products'],
    ['product detail', productDetail],
    // The storefront's most-used page in its other theme: the product cards and the facet
    // chips carry their own colours, and a pair that passes on white can fail on dark.
    { name: 'products list, dark theme', route: '/en/products', theme: 'dark' },
    // The 8-column table stacked into cards below `sm` — the layout the desktop sweep never sees.
    { name: 'products list, phone viewport', route: '/en/products', viewport: PHONE }
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
