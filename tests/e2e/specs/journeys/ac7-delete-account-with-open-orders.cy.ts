// requires-module: account, delivery, orders
/**
 * @module
 * AC7 · Delete my account while an order is still open. The deletion goes ahead, and the shop
 * keeps what the law makes it keep: a paid order is an invoice, so it is detached from the person
 * but stays whole and staff can still ship it; an order that was never paid is no invoice, so its
 * personal details are marked for scrubbing at once and the next sweep wipes them.
 *
 * Demo only: the sweep is run on demand through the job lever (`POST /__test/jobs/reap-orders`),
 * which a live deployment does not mount. Needs the demo outbox for the two mails.
 */
import { expectMailTemplate, mailedLinkUrl } from '../../../support/e2e/commands';

/** The tracking code staff type to ship the express order. Chosen here so it is searchable. */
const TRACKING_CODE = 'TRK-E2E-AC7';

/** The slice of an order this story reads. */
interface OrderLike {
    status: string;
    userId?: string;
    email: string;
    shippingAddress?: { fullName: string };
}

/**
 * Staff read an order as the admin would, from the API.
 *
 * @param orderId - the order
 */
const readAsStaff = (orderId: string): Cypress.Chainable<OrderLike> =>
    cy.apiAs<OrderLike>('admin', 'GET', `/orders/${orderId}`).then((order) => {
        expect(order, 'the order').not.to.equal(null);
        return order!;
    });

describe('AC7 · Delete my account while an order is still open', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the account goes, a paid order stays as an invoice staff can ship, and an unpaid one is scrubbed at once', () => {
        cy.skipUnlessDemo();

        cy.step('the customer owns a paid express order and a transfer order nobody paid');
        cy.subjectId('order.paidExpress').as('paid');
        cy.subjectId('order.awaitingTransfer').as('unpaid');
        cy.get<string>('@paid').then(readAsStaff).as('paidBefore');
        cy.get<string>('@unpaid').then(readAsStaff).as('unpaidBefore');
        cy.get<OrderLike>('@paidBefore').then((order) => {
            expect(order.status).to.equal('paid');
            expect(order.userId, 'an owner before').to.be.a('string');
        });
        cy.get<OrderLike>('@unpaidBefore').then((order) => {
            expect(order.status).to.equal('pending');
        });

        cy.step('they ask for the deletion and confirm it from the mail');
        cy.loginAs('user');
        cy.visit('/en/profile');
        cy.get('[data-test=profile-delete-account] button').click();
        cy.get('[data-test=app-dialog-confirm]').click();
        cy.accountOf('user').then(({ email }) => {
            cy.emailTo(email).then((mail) => {
                expectMailTemplate(mail, 'account.delete-request');
                cy.visit(mailedLinkUrl(mail));
            });
        });
        cy.get('#account-delete-confirm-page button[type=submit]').click();
        cy.get('#home-page').should('exist');

        cy.step('the goodbye is mailed, and the deleted login is refused');
        cy.accountOf('user').then(({ email, password }) => {
            cy.emailTo(email, (mail) => mail.template === 'account.delete-confirm');
            cy.visit('/en/login');
            cy.get('[type=email]').should('not.be.disabled').type(email);
            cy.get('[type=password]').should('not.be.disabled').type(password);
            cy.get('form').submit();
            cy.get('[data-test=login-error]').should('exist');
            cy.url().should('include', '/login');
        });

        cy.step('the paid order is detached from the person, and is still the shop’s invoice');
        cy.get<string>('@paid').then(readAsStaff).as('paidAfter');
        cy.get<OrderLike>('@paidAfter').then((order) => {
            expect(order.userId, 'an owner after').to.equal(undefined);
            expect(order.status).to.equal('paid');
        });

        cy.step('staff can still ship it: start, then ship with a tracking code');
        cy.loginAs('admin');
        cy.get<string>('@paid').then((orderId) => {
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=mark-started]').click();
            cy.get('[data-test=tracking-code-input] input').type(TRACKING_CODE);
            cy.get('[data-test=mark-shipped]').should('not.be.disabled').click();
            cy.get('[data-test=shipment-tracking]').should('contain.text', TRACKING_CODE);
            readAsStaff(orderId).its('status').should('equal', 'shipped');
        });

        cy.step(
            'the sweep scrubs the unpaid order’s personal details and leaves the invoice alone'
        );
        cy.env(['apiUrl']).then(({ apiUrl }) => {
            cy.request('POST', `${String(apiUrl)}/__test/jobs/reap-orders`)
                .its('body.result')
                .should('be.greaterThan', 0);
        });
        cy.get<string>('@unpaid').then(readAsStaff).as('unpaidAfter');
        cy.get<OrderLike>('@unpaidBefore').then((before) => {
            cy.get<OrderLike>('@unpaidAfter').then((after) => {
                expect(after.userId, 'an owner').to.equal(undefined);
                expect(after.email, 'the buyer’s address').not.to.equal(before.email);
            });
        });
        cy.get<string>('@paid').then(readAsStaff).as('paidSwept');
        cy.get<OrderLike>('@paidBefore').then((before) => {
            cy.get<OrderLike>('@paidSwept').then((after) => {
                expect(before.shippingAddress?.fullName, 'a recipient to keep').to.be.a('string');
                expect(after.email, 'the invoice’s address').to.equal(before.email);
                expect(after.shippingAddress?.fullName, 'the invoice’s recipient').to.equal(
                    before.shippingAddress?.fullName
                );
            });
        });
    });
});
