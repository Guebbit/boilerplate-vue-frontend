/**
 * @module
 * Visual regression for this module's own screen.
 *
 * Baselines live in `__snapshots__/` beside this file, so deleting the module deletes its
 * photographs too — a central folder would keep PNGs of a screen the app no longer serves.
 *
 * Not part of `npm run complete`: run it with `npm run test:e2e:visual`, and re-record with
 * `npm run test:e2e:visual:update` only after LOOKING at the diff image. Re-recording without
 * looking is the one thing that makes this suite worthless.
 *
 * The sweep itself lives in `tests/support/e2e/visual-sweep.ts`; this file is the screen list.
 */
import { sweepVisual } from '../../../../../tests/support/e2e/visual-sweep';

/**
 * The seeded shopper's cart with exactly one line, built through the API so the first paint
 * already holds it.
 *
 * @returns a chain yielding the cart's path
 */
const cartWithOneLine = () =>
    cy
        .apiAs('user', 'DELETE', '/cart/all')
        .then(() => cy.subjectId('product.inStock'))
        .then((productId) => cy.apiAs('user', 'POST', '/cart', { productId, quantity: 1 }))
        .then(() => '/en/cart');

sweepVisual(
    'cart',
    [
        ['cart', '/en/cart', '#cart-page'],
        // Lines and totals stack on a phone.
        {
            name: 'cart, one line',
            route: cartWithOneLine,
            readySelector: '#cart-page',
            viewports: ['phone']
        },
        {
            name: 'cart, one line',
            route: cartWithOneLine,
            readySelector: '#cart-page',
            viewports: ['phone'],
            theme: 'dark'
        },
        {
            // Below the fold: address pickers, payment method and the checkout button.
            name: 'cart, checkout',
            route: cartWithOneLine,
            readySelector: '#cart-page',
            viewports: ['phone'],
            scrollTo: '[data-test=cart-summary]'
        },
        {
            // The app-wide confirm, fullscreen on a phone.
            name: 'cart, clear confirm',
            route: cartWithOneLine,
            readySelector: '#cart-page',
            viewports: ['phone'],
            prepare: () => {
                cy.get('[data-test=cart-clear]').click();
                cy.get('[data-test=app-dialog]').should('be.visible');
            }
        }
    ],
    'user'
);
