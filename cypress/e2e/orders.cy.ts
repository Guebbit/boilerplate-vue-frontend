describe('Orders', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetMockState();
    });

    describe('Orders list', () => {
        beforeEach(() => {
            cy.loginAs('user');
            cy.visit('/en/orders');
            cy.get('.users-table tbody tr').should('have.length', 2);
        });

        it('shows the page title', () => {
            cy.get('#orders-list-page').should('exist');
            cy.get('h1').should('contain.text', 'My Orders');
        });

        it('renders one row per order returned by the API', () => {
            cy.get('.users-table tbody tr').should('have.length', 2);
        });

        it('displays order status and total in each row', () => {
            cy.get('.users-table tbody tr')
                .eq(0)
                .within(() => {
                    cy.contains('pending').should('exist');
                    cy.contains('45.5').should('exist');
                });
            cy.get('.users-table tbody tr')
                .eq(1)
                .within(() => {
                    cy.contains('delivered').should('exist');
                    cy.contains('20').should('exist');
                });
        });

        it('shows View, Edit and Delete actions per row', () => {
            cy.get('.users-table tbody tr')
                .eq(0)
                .within(() => {
                    cy.get('.view-button').should('exist');
                    cy.get('.edit-button').should('exist');
                    cy.get('.delete-button').should('exist');
                });
        });

        it('navigates to order detail when clicking View', () => {
            cy.get('.users-table tbody tr').eq(0).find('.view-button').click();
            cy.url().should('include', '/orders/');
            cy.get('#order-target').should('exist');
        });
    });
});
