// requires-module: account, orders, payments
/**
 * @module
 * OP33 · The shop's money doors ask a fresh session. A manager exporting the orders asks for the
 * password after fifteen minutes (the sensitive window), and cancelling someone's paid order or a
 * moderator recording an offline payment ask after five (the critical window). A customer
 * cancelling their own order never asks, however old the sign-in.
 *
 * Time passes by moving the demo backend's clock, so this is a demo-only journey.
 */
import { eventually } from '../../../support/e2e/steps';

/** Past the sensitive window (900 s). */
const PAST_SENSITIVE_MS = 1_000_000;

/** Past the critical window (300 s), inside the access token's own life (600 s). */
const PAST_CRITICAL_MS = 400_000;

/** The bank's reference the moderator types for the transfer. */
const BANK_REFERENCE = 'OP33-TRANSFER-1';

/** The slice of an order this story reads. */
interface OrderLike {
    status: string;
}

/**
 * Types the signed-in role's real password into the open re-auth dialog and submits it.
 *
 * @param role - whose password
 */
const answerAs = (role: 'manager' | 'moderator'): void => {
    cy.get('[data-test=reauth-dialog]').should('be.visible');
    cy.accountOf(role).then(({ password }) => {
        cy.get('[data-test=reauth-dialog-password] input').type(password);
    });
    cy.get('[data-test=reauth-dialog-submit]').click();
    cy.get('[data-test=reauth-dialog]').should('not.exist');
};

describe('OP33 · The money doors ask a fresh session', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the export, a staff cancel and an offline payment ask; a customer’s own cancel does not', () => {
        cy.skipUnlessDemo();

        cy.step('the manager’s sign-in grows past the sensitive window: the export asks');
        cy.loginAs('manager');
        cy.travel(PAST_SENSITIVE_MS);
        cy.visit('/en/sales/orders');
        cy.intercept('GET', '**/orders/export*').as('exportOrders');
        cy.get('[data-test=orders-export]').click();
        answerAs('manager');
        // The first call is the refused one; the replay after the password is the second.
        cy.wait('@exportOrders').its('response.statusCode').should('equal', 401);
        cy.wait('@exportOrders').then(({ response }) => {
            expect(response?.statusCode).to.equal(200);
            expect(response?.headers['content-type']).to.contain('text/csv');
        });

        cy.step('a stale manager cancelling someone’s paid order asks; the money stays');
        cy.travel(PAST_CRITICAL_MS);
        cy.subjectId('order.paidExpress').then((orderId) => {
            cy.visit(`/en/orders/${orderId}/edit`);
            cy.get('[data-test=button-cancel-only]').should('not.be.disabled').click();
            answerAs('manager');
            eventually(
                () => cy.apiAs<OrderLike>('manager', 'GET', `/orders/${orderId}`),
                (order) => order?.status === 'cancelled'
            );
        });

        cy.step('a stale customer cancelling their own order is never asked');
        cy.switchUser('user');
        cy.travel(PAST_CRITICAL_MS);
        cy.subjectId('order.awaitingTransfer').then((orderId) => {
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=order-cancel]').click();
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.get('[data-test=reauth-dialog]').should('not.exist');
            eventually(
                () => cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`),
                (order) => order?.status === 'cancelled'
            );
        });

        cy.step('a stale moderator recording an offline payment asks, then the order is paid');
        cy.switchUser('moderator');
        cy.travel(PAST_CRITICAL_MS);
        cy.subjectId('order.otherPending').then((orderId) => {
            cy.visit(`/en/orders/${orderId}/edit`);
            cy.get('[data-test=record-offline-reference] input').type(BANK_REFERENCE);
            cy.get('[data-test=record-offline-submit]').click();
            answerAs('moderator');
            eventually(
                () => cy.apiAs<OrderLike>('moderator', 'GET', `/orders/${orderId}`),
                (order) => order?.status === 'paid'
            );
        });
    });
});
