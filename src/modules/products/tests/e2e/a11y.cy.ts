/**
 * Accessibility for this module's own routes.
 *
 * Co-located so that deleting the module deletes its a11y coverage with it — a central list would
 * be left naming routes the app no longer serves. `tests/cross-cutting/a11y-coverage.spec.ts`
 * asserts every routed module has one of these, so the split cannot quietly lose a domain.
 *
 * The sweep itself lives in `tests/support/e2e/a11y-sweep.ts`; this file is the route list.
 *
 * Detail and edit pages are addressed by SEEDED ids — the demo dataset in the backend's
 * `db/demo/demo-data.json`, the same rows every other e2e spec relies on — because a sweep
 * needs a URL, and a URL needs an id that exists after `cy.resetState()`.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11y-sweep';

/** The first seeded product — "Piccolo Sallyno panino", in stock, in the `food` category. */
const PRODUCT_ID = '65dc8a99604c307b702b5ccc';

sweepA11y('products — public', [
    ['products list', '/en/products'],
    ['product detail', `/en/products/${PRODUCT_ID}`],
    // The storefront's most-used page in its other theme: the product cards and the facet
    // chips carry their own colours, and a pair that passes on white can fail on dark.
    { name: 'products list, dark theme', route: '/en/products', theme: 'dark' }
]);

sweepA11y(
    'products — admin',
    [
        ['product create', '/en/products/create'],
        ['product edit', `/en/products/${PRODUCT_ID}/edit`],
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
