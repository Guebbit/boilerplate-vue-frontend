describe('Cart', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetMockState();
    });

    describe('Empty cart', () => {
        beforeEach(() => {
            cy.loginAs('admin');
            cy.visit('/en/cart');
            cy.get('body').then((bodyElement) => {
                if (bodyElement.find('.clear-button').length > 0)
                    cy.wrap(bodyElement).find('.clear-button').first().click();
            });
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
            cy.loginAs('admin');
            cy.visit('/en/cart');
            cy.get('.cart-item', { timeout: 10_000 }).should('have.length.at.least', 1);
        });

        it('shows all cart items', () => {
            cy.get('.cart-item').should('have.length.at.least', 1);
        });

        it('shows the cart summary with totals', () => {
            cy.get('.cart-summary').should('exist');
            cy.get('.cart-summary').within(() => {
                cy.contains('Items').should('exist');
                cy.contains('Total').should('exist');
            });
        });

        it('decreases quantity when clicking the minus button', () => {
            cy.get('.cart-item')
                .eq(0)
                .contains(/Quantity:\s*\d+/)
                .invoke('text')
                .then((quantityText) => {
                    const initialQuantity = Number.parseInt(
                        quantityText.match(/\d+/u)?.[0] ?? '0',
                        10
                    );
                    cy.get('.cart-item').eq(0).find('.decrease-button').click();
                    cy.get('.cart-item')
                        .eq(0)
                        .contains(`Quantity: ${initialQuantity > 1 ? initialQuantity - 1 : initialQuantity}`)
                        .should('exist');
                });
        });

        it('increases quantity when clicking the plus button', () => {
            cy.get('.cart-item')
                .eq(0)
                .contains(/Quantity:\s*\d+/)
                .invoke('text')
                .then((quantityText) => {
                    const initialQuantity = Number.parseInt(
                        quantityText.match(/\d+/u)?.[0] ?? '0',
                        10
                    );
                    cy.get('.cart-item').eq(0).find('.increase-button').click();
                    cy.get('.cart-item')
                        .eq(0)
                        .contains(`Quantity: ${initialQuantity + 1}`)
                        .should('exist');
                });
        });

        it('removes an item when clicking Remove', () => {
            cy.get('.cart-item')
                .its('length')
                .then((initialLength) => {
                    cy.get('.cart-item').last().find('.remove-button').click();
                    cy.get('.cart-item').should('have.length', initialLength - 1);
                });
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
