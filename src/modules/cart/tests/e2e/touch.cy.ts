/**
 * @module
 * The cart's touch contract: a tap on the pinned entry goes to the cart.
 *
 * Here and not in the shell's `tests/e2e/specs/touch.cy.ts` because the cart is the module that
 * pins an entry; a build without it has none to tap. How touch is emulated and why:
 * `docs/build/touch-testing.md`.
 */
import { applyViewport } from '../../../../../tests/support/e2e/apply-viewport';

/** The tooltip showing, by Vuetify's active class: tooltip content is `pointer-events: none`. */
const SHOWN_TOOLTIP = '.v-tooltip.v-overlay--active .v-overlay__content';

describe('cart touch', () => {
    it('goes to the cart by a tap on the pinned entry and leaves no tooltip behind', () => {
        cy.loginAs('user');
        cy.visit('/en');
        applyViewport('phone');
        cy.get('h1').should('exist');

        cy.get('[data-test^=pinned-]').first().tap();

        cy.location('pathname').should('match', /cart/);
        cy.get('h1').should('exist');
        cy.get(SHOWN_TOOLTIP).should('not.exist');
    });
});
