/**
 * @module
 * The cart's keyboard contract: its pinned navigation entry names itself in a tooltip on focus.
 *
 * Here and not in the shell's `tests/e2e/specs/keyboard.cy.ts` because the cart is the module that
 * pins an entry; a build without it has none to focus. Why real keystrokes: that spec's header.
 */

/** The tooltip showing, by Vuetify's active class: tooltip content is `pointer-events: none`. */
const SHOWN_TOOLTIP = '.v-tooltip.v-overlay--active .v-overlay__content';

describe('cart keyboard', () => {
    /**
     * A pinned entry — the one kind of icon-only control left on the bar — shows its name as a
     * tooltip on focus, not only on hover (WCAG 1.4.13), and the tooltip says what the reader
     * hears first (WCAG 2.5.3): the name may go on to the count and the detail, but it starts
     * with the label.
     */
    it('shows the label of a pinned entry as a tooltip on focus', () => {
        cy.loginAs('user');
        cy.visit('/en');
        cy.get('h1').should('exist');
        /**
         * What is asserted is that the tooltip OPENS, not how it animates in. With the transition
         * live, this races it — and loses whenever the four e2e shards leave the browser short of
         * CPU. After the visit, since a page load discards the injected style.
         */
        cy.freezeAnimations();

        /**
         * By a real keystroke, not `.focus()`: the tooltip opens on `:focus-visible`, which a
         * script focus does not set. Tab away and Shift+Tab back lands on the same control
         * with the keyboard's focus ring.
         */
        cy.get('[data-test^=pinned-]').first().focus();
        cy.realPress('Tab');
        cy.realPress(['Shift', 'Tab']);
        cy.focused()
            .should('have.attr', 'data-test')
            .and('match', /^pinned-/);
        cy.focused()
            .invoke('attr', 'aria-label')
            .then((label) => {
                cy.get(SHOWN_TOOLTIP)
                    .should('have.length', 1)
                    .invoke('text')
                    .then((tooltip) => {
                        expect(String(label).startsWith(tooltip.trim())).to.equal(true);
                    });
            });
    });
});
