// requires-module: account, delivery, inventory, orders, payments, products
/**
 * @module
 * OP44 · A counter sale. A buyer with no account stands at the counter. Staff raise the order in
 * the app ("New order", the buyer left as a walk-in, the receipt going to an email), record the
 * cash on it, hand the goods over (ship without a tracking code, then deliver), and the order
 * ends delivered, paid, and with nobody's account behind it.
 *
 * Money and the parcel are the order page's own doors; this story proves the new screen leads
 * into them and that "no account" survives all the way to the stored order.
 */

/** Where the receipt goes: a walk-in has no account to read an address from. */
const RECEIPT_EMAIL = 'counter-sale@example.com';

/** The slice of an order this story reads. */
interface OrderLike {
    id: string;
    status: string;
    userId?: string;
    email: string;
}

describe('OP44 · A counter sale', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('raises a walk-in order, takes the cash, hands the goods over and ends delivered', () => {
        const title = `E2E OP44 ${Date.now()}`;
        cy.createProduct({ title, onHand: 5 });
        cy.loginAs('admin');

        cy.step('the staff list offers New order, and it opens the form with the buyer a walk-in');
        cy.visit('/en/sales/orders');
        cy.get('[data-test=orders-new]').click();
        cy.get('#order-create-page').should('exist');
        cy.get('[data-test=order-buyer-walk-in] input').should('be.checked');
        cy.get('[data-test=order-account]').should('not.exist');

        cy.step('one product, one email, created: the order page opens');
        cy.get('[data-test=order-product] input').type(title);
        cy.get('[role=listbox] [role=option]').contains(title).click();
        cy.get('[data-test=order-add-line]').click();
        cy.get('[data-test=order-line]').should('have.length', 1).and('contain.text', title);
        cy.get('[data-test=order-email] input').type(RECEIPT_EMAIL);
        cy.intercept('POST', '**/orders').as('createOrder');
        cy.get('[data-test=order-create-submit]').click();
        cy.wait('@createOrder').then(({ response }) => {
            expect(response?.statusCode).to.equal(201);
            // `as`: the intercepted body is untyped; a 201 here is the created order.
            const created = response?.body as OrderLike;
            // No account: the order carries the email and no buyer.
            expect(created).to.not.have.property('userId');
            expect(created.email).to.equal(RECEIPT_EMAIL);
            cy.wrap(created.id).as('orderId');
        });
        cy.url().should('match', /\/en\/orders\/[\da-f]+$/);

        cy.step('the cash is recorded on the order, which moves it to paid');
        cy.get<string>('@orderId').then((orderId) => {
            cy.visit(`/en/orders/${orderId}/edit`);
            cy.get('[data-test=record-offline-method]').click();
            cy.get('[role=listbox] [role=option]').contains('Cash').click();
            cy.get('[data-test=record-offline-submit]').click();
            cy.get('[data-test=record-offline-payment-error]').should('not.exist');
            cy.apiAs<OrderLike>('admin', 'GET', `/orders/${orderId}`)
                .its('status')
                .should('equal', 'paid');

            cy.step('the goods are handed over: ship with no tracking code, then deliver');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=open-ship]').first().click();
            cy.get('[data-test=ship-submit]').should('not.be.disabled').click();
            cy.get('[data-test=mark-delivered]').click();
            cy.get('[data-test=mark-delivered]').should('not.exist');
            cy.apiAs<OrderLike>('admin', 'GET', `/orders/${orderId}`).then((order) => {
                expect(order?.status).to.equal('delivered');
                expect(order, 'still nobody’s account').to.not.have.property('userId');
            });
        });
    });
});
