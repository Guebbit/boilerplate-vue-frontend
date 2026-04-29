describe('Cart', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetMockState();
    });

    describe('Empty cart', () => {
        beforeEach(() => {
            cy.loginAs('user');
            cy.visit('/en/cart');
            cy.get('.clear-button').click();
            cy.contains('Your cart is empty').should('be.visible');
        });

        it('shows the page title', () => {
            cy.get('#cart-page').should('exist');
            cy.get('h1').should('contain.text', 'My Cart');
        });

        it('shows the empty cart message', () => {
            cy.contains('Your cart is empty').should('be.visible');
        });

        it('does not show cart items or summary', () => {
            cy.get('.cart-item').should('not.exist');
            cy.get('.cart-summary').should('not.exist');
        });

        it('shows a link to browse products', () => {
            cy.contains('Browse products').should('exist');
        });
    });

    describe('Cart with items', () => {
        beforeEach(() => {
            cy.loginAs('user');
            cy.visit('/en/cart');
            cy.get('.cart-item').should('have.length', 2);
        });

        it('shows all cart items', () => {
            cy.get('.cart-item').should('have.length', 2);
        });

        it('shows the cart summary with totals', () => {
            cy.get('.cart-summary').should('exist');
            cy.get('.cart-summary').within(() => {
                cy.contains('2').should('exist'); // itemsCount
                cy.contains('45.5').should('exist'); // total
            });
        });

        it('decreases quantity when clicking the minus button', () => {
            cy.get('.cart-item').eq(0).contains('Quantity: 2').should('exist');
            cy.get('.cart-item').eq(0).find('.decrease-button').click();
            cy.get('.cart-item').eq(0).contains('Quantity: 1').should('exist');
        });

        it('increases quantity when clicking the plus button', () => {
            cy.get('.cart-item').eq(0).contains('Quantity: 2').should('exist');
            cy.get('.cart-item').eq(0).find('.increase-button').click();
            cy.get('.cart-item').eq(0).contains('Quantity: 3').should('exist');
        });

        it('removes an item when clicking Remove', () => {
            cy.get('.cart-item').should('have.length', 2);
            cy.get('.cart-item').eq(1).find('.remove-button').click();
            cy.get('.cart-item').should('have.length', 1);
        });

        it('clears the entire cart when clicking Clear cart', () => {
            cy.get('.clear-button').click();
            cy.contains('Your cart is empty').should('be.visible');
        });

        it('checks out and redirects to the orders list', () => {
            cy.get('.checkout-button').click();
            cy.url().should('include', '/orders');
            cy.get('#orders-list-page').should('exist');
        });
    });
});
