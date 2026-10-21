// requires-module: account, cart, delivery, inventory, notifications, orders, payments, products
/**
 * @module
 * PS5 · My preorder is late. A customer pays for two preorders of the same product. The shop moves
 * the release date a fortnight later: the buyer is told. When the new date has passed too, the
 * sweep tells each buyer once more. Nobody is asked anything: one buyer cancels from the order
 * page, the other does nothing, and a month later the sweep has cancelled nothing, so the second is
 * still waiting.
 *
 * The story is the buyer's side of a delay: what the order page shows at each stage, and that
 * silence never costs the buyer their order. The staff board is PS4's. The refund amount, the credit
 * note and the mails that follow a cancel are the cancel's own tests. Demo only: the dates are clock
 * jumps and the sweeps are pulled with the job lever.
 */
import { mailMentions } from '../../../../scripts/e2e/mail-message';
import { eventually, idFromLocation, preorderOnSale } from '../../../support/e2e/steps';

/** One day in milliseconds, for the clock jumps. */
const DAY_MS = 86_400_000;

/** The slice of an order this story reads. */
interface OrderLike {
    status: string;
}

/**
 * The customer buys one unit of the preorder and pays by card.
 *
 * @param productId - the preorder
 * @returns a chain yielding the new order's id
 */
const buyAndPay = (productId: string): Cypress.Chainable<string> => {
    cy.apiAs('user', 'DELETE', '/cart/all');
    cy.apiAs('user', 'POST', '/cart', { productId, quantity: 1 });
    cy.apiAs('user', 'PUT', '/cart/shipping-method', { shippingMethodId: 'pickup' });
    cy.goToCart();
    cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
    cy.get('#order-target').should('exist');
    cy.payWith('Card that pays');
    cy.get('[data-test=payment-status]').should('contain.text', 'Succeeded');
    return idFromLocation();
};

/**
 * Waits for a mail to the customer with this subject. A preorder notice names the product, not the
 * order, so it is matched by subject alone.
 *
 * @param subject - a fragment of the subject
 */
const mailedToCustomer = (subject: string): void => {
    cy.accountOf('user').then(({ email }) => {
        cy.emailTo(email, (mail) => mailMentions(mail, subject));
    });
};

describe('PS5 · My preorder is late', () => {
    beforeEach(() => {
        cy.skipUnlessDemo();
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('a slip and a lateness are only told, and nobody is cancelled for staying silent', () => {
        const title = `PS5 preorder ${String(Date.now())}`;
        preorderOnSale({ releaseInDays: 10, limit: 5, title }).then((productId) => {
            cy.step('the customer pays for two preorders: each waits for stock, with a date');
            cy.loginAs('user');
            buyAndPay(productId).then((first) => {
                buyAndPay(productId).then((second) => {
                    for (const orderId of [first, second]) {
                        cy.visit(`/en/orders/${orderId}`);
                        cy.get('[data-test=fulfillment-order-awaiting-stock]').should('exist');
                        cy.get('[data-test=fulfillment-order-expected]').should('exist');
                        cy.get('[data-test=confirm-wait]').should('not.exist');
                    }

                    cy.step(
                        'the date moves a fortnight later: the buyer is told, with nothing to answer'
                    );
                    cy.apiAs('editor', 'PATCH', `/products/${productId}`, {
                        releaseDate: new Date(Date.now() + 24 * DAY_MS).toISOString()
                    });
                    mailedToCustomer('Part of your order will arrive later than planned');
                    cy.visit(`/en/orders/${first}`);
                    cy.get('[data-test=fulfillment-order-last-notice]').should('exist');
                    cy.get('[data-test=confirm-wait]').should('not.exist');
                    cy.get('[data-test=order-timeline-entry][data-type=release_date_moved]').should(
                        'exist'
                    );
                    cy.get('[data-test=order-timeline-entry][data-type=delay_notice_sent]').should(
                        'exist'
                    );

                    cy.step(
                        'the new date passes: the sweep tells each buyer, in the mail and the bell'
                    );
                    cy.travel(25 * DAY_MS);
                    cy.runJob('sweep-preorders');
                    cy.loginAs('user');
                    mailedToCustomer('Part of your order is late');
                    cy.visit('/en');
                    cy.get('[data-test=notifications-bell]').click();
                    cy.get('[data-test=notifications-panel]')
                        .find('[data-test=notification-order-link]')
                        .should('have.length.at.least', 2);
                    for (const orderId of [first, second]) {
                        cy.visit(`/en/orders/${orderId}`);
                        cy.get('[data-test=fulfillment-order-consent]').should('not.exist');
                        cy.get('[data-test=fulfillment-order-answer-by]').should('not.exist');
                        cy.get('[data-test=confirm-wait]').should('not.exist');
                        cy.get('[data-test=order-cancel]').should('exist');
                    }

                    cy.step('the first buyer cancels from the order page');
                    cy.visit(`/en/orders/${first}`);
                    cy.get('[data-test=order-cancel]').click();
                    cy.get('[data-test=app-dialog-confirm]').click();
                    eventually(
                        () => cy.apiAs<OrderLike>('user', 'GET', `/orders/${first}`),
                        (order) => order?.status === 'cancelled'
                    ).should((order) => expect(order?.status).to.equal('cancelled'));

                    cy.step('a month of silence from the second: the sweep cancels nothing');
                    cy.travel(31 * DAY_MS);
                    cy.runJob('sweep-preorders');
                    cy.loginAs('user');
                    cy.apiAs<OrderLike>('user', 'GET', `/orders/${second}`).should((order) =>
                        expect(order?.status, 'not cancelled').to.not.equal('cancelled')
                    );
                    cy.visit(`/en/orders/${second}`);
                    cy.get('[data-test=fulfillment-order-awaiting-stock]').should('exist');
                    cy.get('[data-test=confirm-wait]').should('not.exist');
                });
            });
        });
    });
});
