/**
 * The catalogue's own keyboard case — moved out of the central `tests/e2e/specs/keyboard.cy.ts`
 * (FA122): a facet chip is a products-list control, so it goes with the module rather than
 * staying in a shell-level spec that should not depend on this module being present.
 */
describe('keyboard', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('toggles a facet chip with Enter and with Space', () => {
        cy.visit('/en/products');
        cy.get('[data-test=category-chip]').should('exist');

        cy.get('[data-test=category-chip]').first().focus();
        cy.focused().realPress('Enter');
        cy.get('[data-test=category-chip]').first().should('have.attr', 'aria-pressed', 'true');

        cy.get('[data-test=category-chip]').first().focus();
        cy.focused().realPress('Space');
        cy.get('[data-test=category-chip]').first().should('have.attr', 'aria-pressed', 'false');
    });
});
