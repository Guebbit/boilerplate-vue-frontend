describe('Orders', () => {
    describe('Orders list', () => {
        beforeEach(() => {
            cy.intercept('GET', Cypress.env('apiUrl') + '/orders*', { fixture: 'orders/list' }).as(
                'orders'
            );
            cy.loginAs('user');
            cy.visit('/en/orders');
            cy.wait('@orders');
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
            cy.intercept('GET', Cypress.env('apiUrl') + '/orders/order-1', {
                fixture: 'orders/single'
            }).as('order');
            cy.get('.users-table tbody tr').eq(0).find('.view-button').click();
            cy.wait('@order');
            cy.url().should('include', '/orders/order-1');
        });
    });

    describe('Empty orders list', () => {
        beforeEach(() => {
            cy.intercept('GET', Cypress.env('apiUrl') + '/orders*', {
                body: {
                    success: true,
                    status: 200,
                    message: 'ok',
                    data: { items: [], total: 0, page: 1, pageSize: 10 }
                }
            }).as('orders');
            cy.loginAs('user');
            cy.visit('/en/orders');
            cy.wait('@orders');
        });

        it('shows the empty orders message', () => {
            cy.contains('You have no orders yet').should('be.visible');
        });

        it('does not render a table', () => {
            cy.get('.users-table').should('not.exist');
        });

        it('shows a link back to the cart', () => {
            cy.contains('Go to cart').should('exist');
        });
    });
});
