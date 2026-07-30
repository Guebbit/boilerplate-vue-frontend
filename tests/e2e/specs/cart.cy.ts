const readFirstItemQuantity = () =>
    cy
        .get('[data-test=cart-item]')
        .eq(0)
        .contains(/Quantity:\s*\d+/)
        .invoke('text')
        .then((quantityText) => {
            const quantityMatch = quantityText.match(/\d+/);
            if (!quantityMatch)
                throw new Error(
                    `Unable to parse cart quantity from: "${quantityText}". Expected format: Quantity: N where N is a positive integer.`
                );
            const quantityValue = Number.parseInt(quantityMatch[0], 10);
            expect(quantityValue).to.be.greaterThan(0);
            return quantityValue;
        });

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
                if (bodyElement.find('[data-test=cart-clear]').length > 0) {
                    cy.wrap(bodyElement).find('[data-test=cart-clear]').first().click();
                }
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
            cy.get('[data-test=cart-item]').should('not.exist');
            cy.get('[data-test=cart-summary]').should('not.exist');
        });

        it('shows a link to browse products', () => {
            cy.contains('Browse products').should('exist');
        });
    });

    describe('Cart with items', () => {
        beforeEach(() => {
            cy.loginAs('admin');
            cy.visit('/en/cart');
            cy.get('[data-test=cart-item]', { timeout: 10_000 }).should('have.length.at.least', 1);
        });

        it('shows all cart items', () => {
            cy.get('[data-test=cart-item]').should('have.length.at.least', 1);
        });

        it('shows the cart summary with totals', () => {
            cy.get('[data-test=cart-summary]').should('exist');
            cy.get('[data-test=cart-summary]').within(() => {
                cy.contains('Items').should('exist');
                cy.contains('Total').should('exist');
            });
        });

        it('decreases quantity when clicking the minus button', () => {
            readFirstItemQuantity().then((initialQuantity) => {
                if (initialQuantity === 1) {
                    cy.get('[data-test=cart-item]')
                        .eq(0)
                        .find('[data-test=cart-decrease]')
                        .should('be.disabled');
                } else {
                    cy.get('[data-test=cart-item]').eq(0).find('[data-test=cart-decrease]').click();
                    cy.get('[data-test=cart-item]')
                        .eq(0)
                        .contains(`Quantity: ${initialQuantity - 1}`)
                        .should('exist');
                }
            });
        });

        it('increases quantity when clicking the plus button', () => {
            readFirstItemQuantity().then((initialQuantity) => {
                cy.get('[data-test=cart-item]').eq(0).find('[data-test=cart-increase]').click();
                cy.get('[data-test=cart-item]')
                    .eq(0)
                    .contains(`Quantity: ${initialQuantity + 1}`)
                    .should('exist');
            });
        });

        it('removes an item when clicking Remove', () => {
            cy.get('[data-test=cart-item]')
                .its('length')
                .then((initialLength) => {
                    cy.get('[data-test=cart-item]').last().find('[data-test=cart-remove]').click();
                    cy.get('[data-test=cart-item]').should('have.length', initialLength - 1);
                });
        });

        it('clears the entire cart when clicking Clear cart', () => {
            cy.get('[data-test=cart-clear]').click();
            cy.contains('Your cart is empty').should('be.visible');
        });

        it('checks out and redirects to the orders list', () => {
            cy.get('[data-test=cart-checkout]').click();
            cy.url().should('include', '/orders');
            cy.get('#orders-list-page').should('exist');
        });
    });
});
