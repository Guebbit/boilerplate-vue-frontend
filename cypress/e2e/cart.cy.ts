describe('Cart', () => {
    describe('Empty cart', () => {
        beforeEach(() => {
            cy.intercept('GET', Cypress.env('apiUrl') + '/cart', { fixture: 'cart/empty' }).as(
                'cart'
            );
            cy.loginAs('user');
            cy.visit('/en/cart');
            cy.wait('@cart');
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
            cy.intercept('GET', Cypress.env('apiUrl') + '/cart', { fixture: 'cart/with-items' }).as(
                'cart'
            );
            cy.loginAs('user');
            cy.visit('/en/cart');
            cy.wait('@cart');
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
            cy.intercept('PUT', Cypress.env('apiUrl') + '/cart/prod-1', {
                fixture: 'cart/updated'
            }).as('updateCart');
            // prod-1 (qty 2) is the first item; its minus button is the first button in actions
            cy.get('.cart-item').eq(0).find('.cart-item-actions .theme-button').eq(0).click();
            cy.wait('@updateCart');
        });

        it('increases quantity when clicking the plus button', () => {
            cy.intercept('PUT', Cypress.env('apiUrl') + '/cart/prod-1', {
                fixture: 'cart/updated'
            }).as('updateCart');
            cy.get('.cart-item').eq(0).find('.cart-item-actions .theme-button').eq(1).click();
            cy.wait('@updateCart');
        });

        it('removes an item when clicking Remove', () => {
            cy.intercept('DELETE', Cypress.env('apiUrl') + '/cart/prod-2', {
                fixture: 'cart/after-remove'
            }).as('removeItem');
            cy.get('.cart-item').eq(1).contains('Remove').click();
            cy.wait('@removeItem');
        });

        it('clears the entire cart when clicking Clear cart', () => {
            cy.intercept('DELETE', Cypress.env('apiUrl') + '/cart', { fixture: 'cart/cleared' }).as(
                'clearCart'
            );
            cy.contains('Clear cart').click();
            cy.wait('@clearCart');
        });

        it('checks out and redirects to the orders list', () => {
            cy.intercept('POST', Cypress.env('apiUrl') + '/cart/checkout', {
                fixture: 'cart/checkout'
            }).as('checkout');
            cy.intercept('GET', Cypress.env('apiUrl') + '/orders*', { fixture: 'orders/list' });
            // fetchCart is called after checkout; return cleared cart so the chain resolves
            cy.intercept('GET', Cypress.env('apiUrl') + '/cart', { fixture: 'cart/cleared' });
            cy.contains('Checkout').click();
            cy.wait('@checkout');
            cy.url().should('include', '/orders');
        });
    });
});
