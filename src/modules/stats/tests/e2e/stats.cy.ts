/**
 * @module
 * The sales dashboard, driven against the real backend: it renders its blocks for a period, a chart
 * can be read as a table, and a customer is turned back. The figures are the backend's and are
 * proven there; this checks the page puts them on screen.
 */
describe('Sales dashboard', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    describe('as an administrator', () => {
        beforeEach(() => {
            cy.loginAs('admin');
            cy.visit('/en/sales/stats');
            cy.get('#stats-dashboard-page').should('exist');
        });

        it('shows the sales block, the products block and how the shop is running', () => {
            cy.get('[data-test=stats-sales]').should('exist');
            cy.get('[data-test=stats-products]').should('exist');
            cy.get('[data-test=stats-operations]').should('exist');
            cy.get('[data-test=stats-time-zone]', { timeout: 10_000 }).should('exist');
        });

        it('reads a chart as a table and back', () => {
            cy.get('[data-test=chart-block]', { timeout: 10_000 }).first().as('chart');
            cy.get('@chart').find('[data-test=chart-toggle]').click();
            cy.get('@chart').find('[data-test=chart-table]').should('exist');
            cy.get('@chart').find('[data-test=chart-toggle]').click();
            cy.get('@chart').find('[data-test=chart-table]').should('not.exist');
        });

        it('refuses an impossible period before asking the server', () => {
            cy.get('[data-test=stats-from] input').clear();
            cy.get('[data-test=stats-from] input').type('2020-01-01');
            cy.get('[data-test=stats-period-problem]').should('contain.text', 'two years');
            cy.get('[data-test=stats-apply]').should('be.disabled');
        });

        it('re-reads for a preset', () => {
            cy.intercept('GET', '**/stats/sales*').as('sales');
            cy.get('[data-test=stats-preset-last-7]').click();
            cy.wait('@sales').its('request.url').should('include', 'from=');
        });
    });

    describe('as a customer', () => {
        it('is turned back to the home page', () => {
            cy.loginAs('user');
            cy.visit('/en/sales/stats');
            cy.get('#home-page').should('exist');
            cy.location('pathname').should('equal', '/en');
        });
    });
});
