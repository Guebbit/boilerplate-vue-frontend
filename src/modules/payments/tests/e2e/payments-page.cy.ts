/**
 * @module
 * The staff payments page, driven against the real backend: the four tabs, the drawer a row
 * opens, and the door shut on a customer. The numbers themselves are the backend's and are proven
 * there; this checks the page puts them on screen.
 */
describe('Payments page', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    describe('as an administrator', () => {
        beforeEach(() => {
            cy.loginAs('admin');
            cy.visit('/en/sales/payments');
            cy.get('#payments-list-page').should('exist');
        });

        it('offers the four tabs, All first', () => {
            cy.get('[data-test=payments-tab-all]').should('exist');
            cy.get('[data-test=payments-tab-awaiting]').should('exist');
            cy.get('[data-test=payments-tab-refunds]').should('exist');
            cy.get('[data-test=payments-tab-attention]').should('exist');
            cy.get('[data-test=payments-all]').should('be.visible');
        });

        it('lists payments with their status, and opens one in a drawer', () => {
            cy.get('[data-test=payment-row]', { timeout: 10_000 }).should(
                'have.length.at.least',
                1
            );
            cy.get('[data-test=payment-row]')
                .first()
                .find('[data-test=payment-status]')
                .should('exist');

            cy.get('[data-test=payment-row]').first().click();

            cy.get('[data-test=payment-drawer]').should('be.visible');
            cy.get('[data-test=drawer-open-order]').should('exist');
            cy.get('[data-test=drawer-close]').click();
            cy.get('[data-test=payment-drawer]').should('not.be.visible');
        });

        it('narrows the list by status and clears it again', () => {
            cy.get('[data-test=payment-row]', { timeout: 10_000 }).should(
                'have.length.at.least',
                1
            );

            cy.pickOption('[data-test=filter-display-status]', 'Succeeded');
            cy.get('[data-test=payments-search-submit]').click();
            cy.get('[data-test=payment-row]').each(($row) => {
                expect($row.text()).to.contain('Succeeded');
            });

            cy.get('[data-test=payments-search-reset]').click();
            cy.get('[data-test=payment-row]').should('have.length.at.least', 1);
        });

        it('keeps the tab in the URL, so a reload lands on it', () => {
            cy.get('[data-test=payments-tab-refunds]').click();
            cy.url().should('include', 'tab=refunds');
            cy.get('[data-test=payments-refunds]').should('be.visible');

            cy.reload();
            cy.get('[data-test=payments-refunds]').should('be.visible');
        });

        it('shows what needs attention, or says nothing does', () => {
            cy.get('[data-test=payments-tab-attention]').click();
            cy.get('[data-test=payments-attention]').should('be.visible');
            cy.get('[data-test=attention-audit-note]').should(
                'contain.text',
                'payment.amount_mismatch'
            );
        });

        it('lists the bank transfers still owed, and a row opens its payment', () => {
            cy.get('[data-test=payments-tab-awaiting]').click();
            cy.get('[data-test=payments-awaiting]').should('be.visible');
            cy.get('[data-test=awaiting-row]').should('have.length.at.least', 1);
            cy.get('[data-test=awaiting-row]').first().click();
            cy.get('[data-test=payment-drawer]').should('be.visible');
        });
    });

    describe('as a customer', () => {
        it('is turned back to the home page', () => {
            cy.loginAs('user');
            cy.visit('/en/sales/payments');
            cy.get('#home-page').should('exist');
            cy.location('pathname').should('equal', '/en');
        });
    });
});
