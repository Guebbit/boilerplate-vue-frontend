/**
 * @module
 * Accessibility for this module's own routes.
 *
 * Co-located so that deleting the module deletes its a11y coverage with it — a central list would
 * be left naming routes the app no longer serves. `tests/cross-cutting/a11y-coverage.spec.ts`
 * asserts every routed module has one of these, so the split cannot quietly lose a domain.
 *
 * The sweep itself lives in `tests/support/e2e/a11y-sweep.ts`; this file is the route list. The
 * one route serves two screens, so it is swept twice: the signed-in cart, and the guest's, both
 * empty and with a line in it.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11y-sweep';

sweepA11y('cart', [['cart', '/en/cart']], 'user');

sweepA11y('cart — guest', [
    ['cart', '/en/cart'],
    {
        name: 'cart with a line',
        route: '/en/cart',
        // A guest cart lives in the browser: put one line in it, then load the page again.
        prepare: () => {
            cy.subjectId('product.inStock').then((productId) => {
                cy.window().then((win) => {
                    win.localStorage.setItem(
                        'guest-cart',
                        JSON.stringify([{ productId, quantity: 2 }])
                    );
                });
                cy.reload();
                cy.get('[data-test=guest-cart-item]').should('exist');
            });
        }
    }
]);
