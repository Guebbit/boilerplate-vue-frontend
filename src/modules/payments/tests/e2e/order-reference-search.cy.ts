/**
 * @module
 * The admin's RF-reference lookup, walked end to end: a customer checks out with a bank
 * transfer (the one path that freezes an RF reference onto the order), and the admin pastes that
 * exact reference into the orders list search and lands on the order's edit page — where
 * `RecordOfflinePaymentForm` already lives for recording the money once it arrives.
 */
describe('Order reference search', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('finds the order a pasted RF reference pays', () => {
        cy.loginAs('user');

        // ── Buy something, paying by bank transfer — the one method that mints an RF ──
        cy.navigateTo('/en/products');
        cy.get('[data-test=row-view]').first().click();
        cy.get('[data-test=add-to-cart]').click();
        cy.contains('Product added to cart').should('exist');
        cy.goToCart();
        cy.get('[data-test=payment-method-bank_transfer]').click();
        cy.get('[data-test=cart-checkout]').click();

        // ── Checkout lands on the orders list; open the new order (newest first) ────
        cy.get('#orders-list-page tbody tr').should('have.length.at.least', 1);
        cy.get('[data-test=row-view]').first().click();

        // ── The order page shows the reference the checkout froze ───────────────────
        cy.get('[data-test=transfer-instructions-panel]').should('exist');
        cy.get('[data-test=transfer-reference]')
            .invoke('text')
            .then((reference) => {
                const rf = reference.trim();

                // ── The admin pastes it and jumps straight to this same order's edit page ──
                cy.logout();
                cy.contains('customer@example.com').should('not.exist');
                cy.loginAs('admin');
                cy.visit('/en/orders');
                cy.get('[data-test=order-reference-search-input] input').type(rf);
                cy.get('[data-test=order-reference-search-submit]').click();

                cy.url().should('match', /\/orders\/[\da-f]{24}\/edit$/);
                cy.get('#order-edit-page').should('exist');
                cy.get('[data-test=record-offline-payment-form]').should('exist');
            });
    });

    it('shows a toast and stays put for a reference nothing matches', () => {
        cy.loginAs('admin');
        cy.visit('/en/orders');

        cy.get('[data-test=order-reference-search-input] input').type(
            'RF00 0000 0000 0000 0000 0000 0'
        );
        cy.get('[data-test=order-reference-search-submit]').click();

        cy.url().should('include', '/orders');
        cy.url().should('not.match', /\/edit$/);
        cy.contains(/not found/i).should('exist');
    });
});
