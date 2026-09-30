// requires-module: account, cart, delivery, inventory, orders, payments, products
/**
 * @module
 * CU19 · Changed my mind: a transfer order paid by card. The customer checks out by bank transfer,
 * is shown where to send the money, and then pays the same order by card instead. Both ways stay
 * open until one of them lands (the order page keeps the card form beside the transfer
 * instructions), and the first to land settles it.
 *
 * The order then has to agree with itself: the payment says card, so the order's own payment
 * method says card too, not the checkout choice it started with. The admin arrives by the RF
 * reference the customer was given, finds a paid order and is not offered the offline form.
 * One card confirm is spent, as `user`.
 */
import { addToCartFromStorefront, idFromLocation } from '../../../support/e2e/steps';

/** The slice of an order this story reads. */
interface OrderLike {
    status: string;
    paymentMethod: string;
}

describe('CU19 · Changed my mind: a transfer order paid by card', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('pays a transfer order by card: the transfer panel goes, the order says card, the admin finds it paid', () => {
        cy.step('the customer checks out by bank transfer and is shown the instructions');
        cy.loginAs('user');
        addToCartFromStorefront('product.rich');
        cy.goToCart();
        // `pickup` needs no address, so the method alone enables the button.
        cy.get('[data-test=shipping-method-pickup]').click();
        cy.get('[data-test=payment-method-bank_transfer]').click();
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
        cy.get('#order-target').should('exist');
        cy.get('[data-test=transfer-instructions-panel]').should('exist');
        cy.get('[data-test=order-payment-method]').should('contain.text', 'Bank transfer');
        cy.get('[data-test=order-download-invoice]').should('not.exist');

        cy.step('the card form is offered beside the transfer; the customer pays by card instead');
        cy.get('[data-test=payment-method-select]').should('exist');
        idFromLocation().then((orderId) => {
            cy.get('[data-test=transfer-reference]')
                .invoke('text')
                .then((shown) => {
                    const reference = shown.replaceAll(/\s+/g, '');
                    cy.payWith('Card that pays');

                    cy.step(
                        'the order is paid: no transfer panel, an invoice, and the method is card'
                    );
                    cy.get('[data-test=payment-status]').should('contain.text', 'Paid');
                    cy.get('[data-test=transfer-instructions-panel]').should('not.exist');
                    cy.get('[data-test=payment-method-select]').should('not.exist');
                    cy.get('[data-test=order-download-invoice]').should('exist');
                    cy.get('[data-test=order-payment-method]').should('contain.text', 'Card');
                    cy.get('[data-test=order-payment-method]').should(
                        'not.contain.text',
                        'Bank transfer'
                    );
                    cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`).should((order) => {
                        expect(order?.status).to.equal('paid');
                        expect(order?.paymentMethod).to.equal('card');
                    });

                    cy.step(
                        'the admin searches the reference the customer was given, and finds a paid order'
                    );
                    cy.switchUser('admin');
                    cy.visit('/en/orders');
                    cy.get('[data-test=order-reference-search-input] input').type(reference);
                    cy.get('[data-test=order-reference-search-submit]').click();
                    cy.url().should('match', new RegExp(`/orders/${orderId}/edit$`));
                    cy.get('#order-edit-page').should('exist');

                    cy.step('there is no money left to record: the offline form is not offered');
                    cy.get('[data-test=button-refund-only]').should('not.be.disabled');
                    cy.get('[data-test=record-offline-payment-form]').should('not.exist');
                    cy.visit(`/en/orders/${orderId}`);
                    cy.get('[data-test=payment-status]').should('contain.text', 'Paid');
                    cy.get('[data-test=order-payment-method]').should('contain.text', 'Card');
                });
        });
    });
});
