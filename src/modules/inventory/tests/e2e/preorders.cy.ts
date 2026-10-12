/**
 * @module
 * The staff preorder board, driven against the real backend: the two tabs, the filters of the
 * second, the tab kept in the URL, and the door shut on a customer. Which orders are late is the
 * backend's own rule and is proven there; this checks the page puts the views on screen. Typed and
 * linted here; run by the live e2e pass.
 */
describe('Preorders board', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    describe('as an administrator', () => {
        beforeEach(() => {
            cy.loginAs('admin');
            cy.visit('/en/sales/preorders');
            cy.get('#preorders-board-page').should('exist');
        });

        it('offers the two tabs, products first', () => {
            cy.get('[data-test=preorders-tab-products]').should('exist');
            cy.get('[data-test=preorders-tab-orders]').should('exist');
            cy.get('[data-test=preorder-products]').should('be.visible');
        });

        it('opens the fulfillment orders and keeps the tab in the URL', () => {
            cy.get('[data-test=preorders-tab-orders]').click();
            cy.url().should('include', 'tab=orders');
            cy.get('[data-test=preorder-orders]').should('be.visible');

            cy.reload();
            cy.get('[data-test=preorder-orders]').should('be.visible');
        });

        it('offers the Late and Due-soon views and lets each be switched off again', () => {
            cy.get('[data-test=preorders-tab-orders]').click();

            cy.get('[data-test=preorder-filter-late] input').check({ force: true });
            cy.get('[data-test=preorder-orders]').should('be.visible');
            cy.get('[data-test=preorder-filter-late] input').uncheck({ force: true });

            cy.get('[data-test=preorder-filter-due-soon] input').check({ force: true });
            cy.get('[data-test=preorder-orders]').should('be.visible');
            cy.get('[data-test=preorder-filter-due-soon] input').uncheck({ force: true });
        });
    });

    describe('as a customer', () => {
        it('is turned back to the home page', () => {
            cy.loginAs('user');
            cy.visit('/en/sales/preorders');
            cy.get('#home-page').should('exist');
            cy.location('pathname').should('equal', '/en');
        });
    });
});
