/**
 * @module
 * Cypress end-to-end spec driving the real app: logs in, visits the orders
 * list, and asserts on the rendered rows and their actions.
 */
describe('Orders', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    describe('Orders list', () => {
        beforeEach(() => {
            cy.loginAs('owner');
            cy.visit('/en/orders');
            cy.get('[data-test=list-row]', { timeout: 10_000 }).should('have.length.at.least', 1);
        });

        it('shows the page title and one row per order returned by the API', () => {
            cy.get('#orders-list-page').should('exist');
            cy.get('h1').should('contain.text', 'My Orders');
            cy.get('[data-test=list-row]').should('have.length.at.least', 1);
        });

        it('displays order status and total in rows', () => {
            cy.get('[data-test=list-row]')
                .eq(0)
                .within(() => {
                    cy.contains(/pending|paid|processing|shipped|delivered|cancelled/i).should(
                        'exist'
                    );
                    cy.contains(/\d+(\.\d+)?/).should('exist');
                });
        });

        it('shows View, Edit, Delete and Hard delete actions per row for admin users', () => {
            cy.get('[data-test=list-row]')
                .eq(0)
                .within(() => {
                    cy.get('[data-test=row-view]').should('exist');
                    cy.get('[data-test=row-edit]').should('exist');
                    cy.get('[data-test=row-delete]').should('exist');
                    cy.get('[data-test=row-hard-delete]').should('exist');
                });
        });

        it('navigates to order detail when clicking View', () => {
            cy.get('[data-test=list-row]').eq(0).find('[data-test=row-view]').click();
            cy.url().should('include', '/orders/');
            cy.get('#order-target').should('exist');
        });
    });

    /*
     * The staff row actions are gated on `orders.update`/`orders.delete` — a customer reaching
     * their own orders list must see View and nothing else, same model as
     * `src/modules/products/tests/e2e/products.cy.ts`'s per-role visibility. The seeded `user`
     * account has three visible orders of its own (its fourth, oldest one is soft-deleted) — no
     * provisioning needed, same as the admin block above.
     */
    describe('Orders list — a non-admin customer', () => {
        beforeEach(() => {
            cy.loginAs('user');
            cy.visit('/en/orders');
            cy.get('[data-test=list-row]', { timeout: 10_000 }).should('have.length.at.least', 1);
        });

        it('shows only the View action for non-admin users', () => {
            cy.get('[data-test=list-row]')
                .eq(0)
                .within(() => {
                    cy.get('[data-test=row-view]').should('exist');
                    cy.get('[data-test=row-edit]').should('not.exist');
                    cy.get('[data-test=row-delete]').should('not.exist');
                    cy.get('[data-test=row-hard-delete]').should('not.exist');
                });
        });
    });
});
