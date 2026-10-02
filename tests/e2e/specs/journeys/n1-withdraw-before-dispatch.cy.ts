// requires-module: account, cart, delivery, inventory, orders, payments, products, returns
/**
 * @module
 * N1 · Withdraw before dispatch. A customer pays by card and changes their mind while the order is
 * still in the shop. The EU withdrawal button (Consumer Rights Directive Art. 11a) asks twice, then
 * cancels the order, refunds every cent including delivery, puts the stock back and mails the
 * acknowledgement.
 *
 * Before dispatch there are no goods to send back, so the return that records the withdrawal is
 * born closed with no lines (BE `returns`' `create.ts`): the order page lists it as a closed
 * withdrawal and offers no button any more. After dispatch the return is approved instead (N2).
 */
import {
    addOpenProductToCart,
    cents,
    centsOf,
    eventually,
    idFromLocation,
    orderNumberShown,
    searchAndOpenProduct
} from '../../../support/e2e/steps';
import { mailMentions } from '../../../../scripts/e2e/mail-message';

/** The slice of a payment this story reads: what was paid and what came back. */
interface PaymentLike {
    status: string;
    amount: number;
    amountRefunded: number;
}

describe('N1 · Withdraw before dispatch', { tags: '@smoke' }, () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('asks twice, cancels the paid order, refunds it whole and gives the stock back', () => {
        cy.step('the customer reads the shelf, then buys one with standard shipping');
        cy.loginAs('user');
        cy.navigateTo('/en/products');
        searchAndOpenProduct('product.barebones');
        cy.get('[data-test=product-stock]').should(($stock) => {
            expect($stock.text()).to.match(/\d/);
        });
        const shelf = { before: '' };
        cy.get('[data-test=product-stock]')
            .invoke('text')
            .then((text) => {
                shelf.before = text;
            });
        addOpenProductToCart();
        cy.goToCart();
        cy.get('[data-test=shipping-method-standard]').click();
        const paid = { cents: 0 };
        centsOf('[data-test=cart-total]').then((total) => {
            paid.cents = total;
        });
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
        cy.get('#order-target').should('exist');
        cy.payWith('Card that pays');
        cy.get('[data-test=payment-status]').should('contain.text', 'Paid');

        cy.step('the withdrawal button asks for a second step before it does anything');
        cy.get('[data-test=withdrawal-panel]').should('exist');
        cy.get('[data-test=withdraw-button]').click();
        cy.get('[data-test=app-dialog-confirm]').should('exist');
        idFromLocation().then((orderId) => {
            cy.apiAs<{ status: string }>('user', 'GET', `/orders/${orderId}`).should((order) => {
                expect(order?.status, 'nothing happens on the first click').to.equal('paid');
            });

            cy.step('confirms, and the order is cancelled and refunded in full');
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.get('[data-test=order-cancel]').should('not.exist');
            cy.get('[data-test=withdraw-button]').should('not.exist');
            cy.apiAs<{ status: string }>('user', 'GET', `/orders/${orderId}`).should((order) => {
                expect(order?.status).to.equal('cancelled');
            });
            // The refund is the payments module answering the cancel, so it may land a beat later.
            eventually(
                () => cy.apiAs<PaymentLike>('user', 'GET', `/payments/order/${orderId}`),
                (payment) => payment?.status === 'refunded'
            ).should((payment) => {
                expect(payment?.status).to.equal('refunded');
                expect(
                    cents(String(payment?.amountRefunded.toFixed(2))),
                    'the refund is the whole charge, delivery included'
                ).to.equal(paid.cents);
            });

            cy.step('the withdrawal is on record as a closed return that expects no goods');
            cy.get('[data-test=order-return]')
                .should('have.length', 1)
                .and('contain.text', 'Closed');
            cy.get('[data-test=order-return-status]').should('not.exist');
            cy.apiAs<{ items: { reason: string; status: string; lines: unknown[] }[] }>(
                'user',
                'GET',
                `/returns?orderId=${orderId}`
            ).should((page) => {
                expect(page?.items).to.have.length(1);
                expect(page?.items[0]).to.include({ reason: 'withdrawal', status: 'closed' });
                expect(page?.items[0].lines).to.have.length(0);
            });

            cy.step('the stock is back on the shelf');
            cy.navigateTo('/en/products');
            searchAndOpenProduct('product.barebones');
            cy.get('[data-test=product-stock]').should(($stock) => {
                expect($stock.text()).to.equal(shelf.before);
            });

            cy.step('the acknowledgement mail names the order');
            cy.visit(`/en/orders/${orderId}`);
            orderNumberShown().then((number) => {
                cy.accountOf('user').then(({ email }) => {
                    cy.emailTo(
                        email,
                        (mail) => mailMentions(mail, number) && mailMentions(mail, 'withdraw')
                    );
                });
            });
        });
    });
});
