// requires-module: account, delivery, inventory, orders, products, returns
/**
 * @module
 * OP17 · A warehouse shift. The warehouse holds the stock and the parcel: it receives deliveries,
 * takes a paid order from "start" through "ship with a tracking code" to "delivered", closes a
 * digital order by hand (nothing to ship), and receives a returned parcel back, keeping a
 * deduction. It reads every order and edits none, answers no return request and cannot sweep
 * reservations, and the screens show it nothing it would be refused.
 *
 * Setup the story does not care about goes through the API: the digital order is bought by the
 * customer and paid by the admin, and the return request is approved by support first.
 */
import { centsOf } from '../../../support/e2e/steps';
import { mailMentions } from '../../../../scripts/e2e/mail-message';

/** The tracking code the warehouse types to ship the express order. */
const TRACKING_CODE = 'TRK-E2E-OP17';

/** What the warehouse keeps back for handling, in cents. */
const DEDUCTION_CENTS = 300;

/** The slice of an order this story reads. */
interface OrderLike {
    status: string;
}

/** The slice of a return this story reads. */
interface ReturnLike {
    status: string;
    orderId: string;
}

/** The slice of a payment this story reads. */
interface PaymentLike {
    amount: number;
}

/**
 * The hrefs of the open administration menu, then closes it.
 *
 * @returns a chain yielding the hrefs
 */
const adminMenuLinks = (): Cypress.Chainable<string[]> => {
    cy.get('[data-test=admin-menu]').click();
    return cy
        .get('[role=menu] a')
        .then(($links) => $links.toArray().map((link) => link.getAttribute('href') ?? ''))
        .then((hrefs) => {
            cy.get('body').type('{esc}');
            return cy.wrap(hrefs, { log: false });
        });
};

/**
 * Follows an address the role may not use: Home, with a notice.
 *
 * @param path - the locale-prefixed address
 */
const isTurnedBack = (path: string): void => {
    cy.visit(path);
    cy.get('#home-page').should('exist');
    cy.location('pathname').should('equal', '/en');
    cy.get('.v-alert').should('exist');
};

/**
 * Has the customer buy the digital course and the admin record the cash, so a paid digital order
 * waits for the warehouse.
 *
 * @returns a chain yielding the order's id
 */
const aPaidDigitalOrder = (): Cypress.Chainable<string> =>
    cy.subjectId('product.digital').then((productId) => {
        cy.apiAs('user', 'POST', '/cart', { productId, quantity: 1 });
        return cy.apiAs<{ id: string }>('user', 'POST', '/cart/checkout', {}).then((order) => {
            const orderId = String(order?.id);
            cy.apiAs('admin', 'POST', `/payments/order/${orderId}/offline`, { method: 'cash' });
            return cy.wrap(orderId, { log: false });
        });
    });

describe('OP17 · A warehouse shift', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('receives, ships, delivers, fulfils and takes a return back, and is shown only the warehouse', () => {
        cy.step('background: a paid digital order, and a return support has approved');
        aPaidDigitalOrder().as('digitalId');
        cy.subjectId('return.requested').as('returnId');
        cy.get<string>('@returnId').then((returnId) => {
            cy.apiAs('support', 'POST', `/returns/${returnId}/approve`, {});
        });

        cy.step('the warehouse’s menu is the stock room, and the other staff pages turn it back');
        cy.loginAs('warehouse');
        adminMenuLinks().should((links) => {
            expect(links).to.include('/en/inventory');
            for (const page of [
                '/users',
                '/feedback',
                '/locales',
                '/audit',
                '/admin',
                '/api-keys'
            ]) {
                expect(links, page).to.not.include(`/en${page}`);
            }
        });
        isTurnedBack('/en/users');
        isTurnedBack('/en/api-keys');

        cy.step('it reads every order, so the staff filters are there');
        cy.visit('/en/orders');
        cy.get('[data-test=filter-user-id]').should('exist');
        cy.get('[data-test=filter-email]').should('exist');

        cy.step('a delivery lands: the receipt form is open to it, the sweep is not');
        const title = `E2E OP17 ${Date.now()}`;
        cy.createProduct({ title, onHand: 1 }).then((product) => {
            cy.visit('/en/inventory');
            cy.get('[data-test=sweep-submit]').should('not.exist');
            cy.get('[data-test=receipt-product] input').clear();
            cy.get('[data-test=receipt-product] input').type(title);
            cy.get('[role=listbox] [role=option]').contains(title).click();
            cy.get('[data-test=receipt-quantity] input').clear();
            cy.get('[data-test=receipt-quantity] input').type('4');
            cy.get('[data-test=receipt-submit]').click();
            cy.get('[data-test=receipt-error]').should('not.exist');
            cy.apiAs<{ available: number }>('warehouse', 'GET', `/products/${product.id}`)
                .its('available')
                .should('equal', 5);
        });

        cy.step('an express order: start, ship with a code, deliver; and no edit door');
        cy.subjectId('order.paidExpress').then((orderId) => {
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=go-to-edit]').should('not.exist');
            cy.get('[data-test=mark-started]').click();
            cy.get('[data-test=mark-shipped]').should('be.disabled');
            cy.get('[data-test=tracking-code-input] input').type(TRACKING_CODE);
            cy.get('[data-test=mark-shipped]').should('not.be.disabled').click();
            cy.get('[data-test=shipment-tracking]').should('contain.text', TRACKING_CODE);
            cy.get('[data-test=mark-delivered]').click();
            cy.get('[data-test=mark-delivered]').should('not.exist');
            cy.apiAs<OrderLike>('warehouse', 'GET', `/orders/${orderId}`)
                .its('status')
                .should('equal', 'delivered');
            isTurnedBack(`/en/orders/${orderId}/edit`);

            cy.step('the customer was mailed the tracking code');
            cy.accountOf('user').then(({ email }) => {
                cy.emailTo(email, (mail) => mailMentions(mail, TRACKING_CODE));
            });
        });

        cy.step('a digital order has no parcel: after start, the warehouse closes it by hand');
        cy.get<string>('@digitalId').then((orderId) => {
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=mark-started]').click();
            cy.get('[data-test=mark-shipped]').should('not.exist');
            cy.get('[data-test=mark-fulfilled]').click();
            cy.get('[data-test=mark-fulfilled]').should('not.exist');
            cy.apiAs<OrderLike>('warehouse', 'GET', `/orders/${orderId}`)
                .its('status')
                .should('equal', 'delivered');
        });

        cy.step('a returned parcel: only receiving is the warehouse’s, and it keeps a deduction');
        cy.get<string>('@returnId').then((returnId) => {
            cy.visit(`/en/returns/${returnId}`);
            cy.get('[data-test=return-approve]').should('not.exist');
            cy.get('[data-test=return-decline-form]').should('not.exist');
            cy.get('[data-test=return-receive-deduction] input').type(
                (DEDUCTION_CENTS / 100).toFixed(2)
            );
            cy.get('[data-test=return-receive]').click();
            cy.get('[data-test=return-receive-form]').should('not.exist');

            cy.step('the return closes with the refund minus the deduction');
            cy.apiAs<ReturnLike>('warehouse', 'GET', `/returns/${returnId}`).then((received) => {
                expect(received?.status).to.equal('closed');
                cy.apiAs<PaymentLike>(
                    'admin',
                    'GET',
                    `/payments/order/${String(received?.orderId)}`
                ).then((payment) => {
                    const paidCents = Math.round(Number(payment?.amount) * 100);
                    centsOf('[data-test=return-refund]').should((refund) => {
                        expect(refund).to.equal(paidCents - DEDUCTION_CENTS);
                    });
                });
            });
        });

        cy.step('the customer reads the closed return and its refund');
        cy.switchUser('user');
        cy.get<string>('@returnId').then((returnId) => {
            cy.visit(`/en/returns/${returnId}`);
            cy.get('[data-test=return-refund]').should('exist');
            cy.get('[data-test=return-staff-actions]').find('button').should('not.exist');
        });
    });
});
