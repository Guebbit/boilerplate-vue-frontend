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
                        JSON.stringify({
                            savedAt: Date.now(),
                            lines: [{ productId, quantity: 2 }]
                        })
                    );
                });
                cy.reload();
                cy.get('[data-test=guest-cart-item]').should('exist');
            });
        }
    }
]);

/**
 * The pinned entry (the cart) is icon-only: the label lives in `aria-label` and in a tooltip that
 * opens on focus. Audited with the tooltip showing, because that is when `aria-describedby`
 * points at a node that exists and the two texts can be compared. Signed in, because the entry's
 * route is. It lives here because the cart is the module that pins an entry; a build without it has none.
 */
const NAV_TOOLTIP_SHOWN = {
    name: 'cart, navigation tooltip shown',
    route: '/en/cart',
    prepare: () => {
        /**
         * A real keystroke: the tooltip opens on `:focus-visible`, which `.focus()` does not
         * set. Tab away and Shift+Tab back lands on the control with the keyboard's focus ring.
         */
        cy.get('[data-test^=pinned-]').first().focus();
        cy.realPress('Tab');
        cy.realPress(['Shift', 'Tab']);
        cy.focused()
            .should('have.attr', 'data-test')
            .and('match', /^pinned-/);
        /**
         * By Vuetify's active class: tooltip content is `pointer-events: none`, which Cypress
         * reads as "covered", i.e. not visible — axe and a visitor both see it.
         */
        cy.get('.v-tooltip.v-overlay--active .v-overlay__content').should('have.length', 1);
    }
};

sweepA11y('cart — pinned navigation entry', [NAV_TOOLTIP_SHOWN], 'user');
