describe('Orders', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetMockState();
    });

    describe('Orders list', () => {
        beforeEach(() => {
            cy.loginAs('admin');
            cy.visit('/en/orders');
            cy.get('.list-table tbody tr', { timeout: 10_000 }).should('have.length.at.least', 1);
        });

        it('shows the page title', () => {
            cy.get('#orders-list-page').should('exist');
            cy.get('h1').should('contain.text', 'My Orders');
        });

        it('renders one row per order returned by the API', () => {
            cy.get('.list-table tbody tr').should('have.length.at.least', 1);
        });

        it('displays order status and total in rows', () => {
            cy.get('.list-table tbody tr')
                .eq(0)
                .within(() => {
                    cy.contains(/pending|paid|processing|shipped|delivered|cancelled/i).should(
                        'exist'
                    );
                    cy.contains(/\d+(\.\d+)?/).should('exist');
                });
        });

        it('shows View, Edit and Delete actions per row', () => {
            cy.get('.list-table tbody tr')
                .eq(0)
                .within(() => {
                    cy.get('.view-button').should('exist');
                    cy.get('.edit-button').should('exist');
                    cy.get('.delete-button').should('exist');
                });
        });

        it('navigates to order detail when clicking View', () => {
            cy.get('.list-table tbody tr').eq(0).find('.view-button').click();
            cy.url().should('include', '/orders/');
            cy.get('#order-target').should('exist');
        });
    });
});
