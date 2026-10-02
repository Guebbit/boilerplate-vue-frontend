// requires-module: account, delivery, orders, payments, returns, users
/**
 * @module
 * OP20 · Staff prove it is still them. The actions that cannot be taken back (money out, a status
 * forced by hand, a parcel forced through, a returned parcel opening a refund, an account erased)
 * ask for the password again once the sign-in is older than five minutes. The dialog opens in the
 * middle of the action: a wrong password keeps it open, cancel writes nothing, and the right
 * password carries on with the same action, once. An ordinary start or ship never asks.
 *
 * Time passes by moving the demo backend's clock, so this is a demo-only journey. The window is
 * `NODE_REAUTH_TIME_CRITICAL` (300 s); each jump is past it and inside the access token's life.
 */
import { eventually } from '../../../support/e2e/steps';
import { loginDevice, requestAsDevice } from '../../../support/e2e/harness';

/** Past the critical window (300 s), inside the access token's own life (600 s). */
const PAST_CRITICAL_MS = 400_000;

/** The reason the admin types for each forced move. */
const REASON = 'OP20 the courier confirmed it by phone';

/** The slice of an order this story reads. */
interface OrderLike {
    status: string;
}

/** The slice of a payment this story reads. */
interface PaymentLike {
    amount: number;
    amountRefunded: number;
}

/** The slice of a return this story reads. */
interface ReturnLike {
    status: string;
}

/**
 * Types a password into the open re-auth dialog and submits it.
 *
 * @param password - what to type
 */
const answerDialog = (password: string): void => {
    cy.get('[data-test=reauth-dialog-password] input').type(password);
    cy.get('[data-test=reauth-dialog-submit]').click();
};

/**
 * Answers the open dialog with the signed-in role's real password.
 *
 * @param role - whose password
 */
const answerAs = (role: 'admin' | 'warehouse' | 'moderator'): void => {
    cy.accountOf(role).then(({ password }) => {
        answerDialog(password);
    });
};

/**
 * The dialog is up; a wrong password keeps it up, and cancel closes it.
 */
const wrongThenCancel = (): void => {
    cy.get('[data-test=reauth-dialog]').should('be.visible');
    answerDialog('not-the-password');
    cy.get('[data-test=reauth-dialog-password] .v-messages__message').should('exist');
    cy.get('[data-test=reauth-dialog]').should('be.visible');
    cy.get('[data-test=reauth-dialog-cancel]').click();
    cy.get('[data-test=reauth-dialog]').should('not.exist');
};

describe('OP20 · Staff prove it’s still them', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('money, forced moves, a received return and an erasure each ask, and carry on once the password is right', () => {
        cy.skipUnlessDemo();

        cy.step('the admin signs in, and the sign-in grows stale');
        cy.loginAs('admin');
        cy.travel(PAST_CRITICAL_MS);

        cy.step('an ordinary start never asks, however old the sign-in');
        cy.subjectId('order.paid').then((orderId) => {
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=mark-started]').click();
            cy.get('[data-test=mark-started]').should('not.exist');
            cy.get('[data-test=reauth-dialog]').should('not.exist');
            cy.apiAs<OrderLike>('admin', 'GET', `/orders/${orderId}`)
                .its('status')
                .should('equal', 'processing');
        });

        cy.step(
            'a refund asks: wrong password stays, cancel writes nothing, the right one pays once'
        );
        cy.subjectId('order.delivered').then((orderId) => {
            cy.visit(`/en/orders/${orderId}/edit`);
            cy.get('[data-test=button-refund-only]').should('not.be.disabled').click();
            wrongThenCancel();
            cy.apiAs<PaymentLike>('admin', 'GET', `/payments/order/${orderId}`).should(
                (payment) => {
                    expect(payment?.amountRefunded, 'cancel refunded nothing').to.equal(0);
                }
            );
            cy.get('[data-test=button-refund-only]').click();
            cy.get('[data-test=reauth-dialog]').should('be.visible');
            answerAs('admin');
            cy.get('[data-test=reauth-dialog]').should('not.exist');
            cy.apiAs<PaymentLike>('admin', 'GET', `/payments/order/${orderId}`).should(
                (payment) => {
                    expect(payment?.amountRefunded, 'refunded once, in full').to.equal(
                        payment?.amount
                    );
                }
            );
        });

        cy.step('a status forced by hand asks, and the right password forces it');
        cy.travel(PAST_CRITICAL_MS);
        cy.subjectId('order.shipped').then((orderId) => {
            cy.visit(`/en/orders/${orderId}/edit`);
            cy.get('[data-test=override-status-select]').click();
            cy.get('[role=listbox] [role=option]').contains('Delivered').click();
            cy.get('[data-test=override-reason] textarea').type(REASON);
            cy.get('[data-test=button-override]').should('not.be.disabled').click();
            wrongThenCancel();
            cy.apiAs<OrderLike>('admin', 'GET', `/orders/${orderId}`)
                .its('status')
                .should('equal', 'shipped');
            cy.get('[data-test=button-override]').click();
            cy.get('[data-test=reauth-dialog]').should('be.visible');
            answerAs('admin');
            cy.get('[data-test=reauth-dialog]').should('not.exist');
            cy.apiAs<OrderLike>('admin', 'GET', `/orders/${orderId}`)
                .its('status')
                .should('equal', 'delivered');
        });

        cy.step('a parcel forced out of the door asks too');
        cy.travel(PAST_CRITICAL_MS);
        cy.subjectId('order.awaitingTransfer').then((orderId) => {
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=force-ship-toggle] input').check();
            cy.get('[data-test=force-ship-reason] textarea').type(REASON);
            cy.get('[data-test=tracking-code-input] input').type('TRK-E2E-OP20');
            cy.get('[data-test=mark-shipped]').should('not.be.disabled').click();
            cy.get('[data-test=reauth-dialog]').should('be.visible');
            answerAs('admin');
            cy.get('[data-test=shipment-tracking]').should('contain.text', 'TRK-E2E-OP20');
            cy.apiAs<OrderLike>('admin', 'GET', `/orders/${orderId}`)
                .its('status')
                .should('equal', 'shipped');
        });

        cy.step('the warehouse receiving a returned parcel asks, and the return closes once');
        cy.subjectId('return.requested').then((returnId) => {
            cy.apiAs('support', 'POST', `/returns/${returnId}/approve`, {});
            cy.switchUser('warehouse');
            cy.travel(PAST_CRITICAL_MS);
            cy.visit(`/en/returns/${returnId}`);
            cy.get('[data-test=return-receive]').click();
            wrongThenCancel();
            cy.apiAs<ReturnLike>('warehouse', 'GET', `/returns/${returnId}`)
                .its('status')
                .should('equal', 'approved');
            cy.get('[data-test=return-receive]').click();
            cy.get('[data-test=reauth-dialog]').should('be.visible');
            answerAs('warehouse');
            cy.get('[data-test=return-receive-form]').should('not.exist');
            eventually(
                () => cy.apiAs<ReturnLike>('warehouse', 'GET', `/returns/${returnId}`),
                (found) => found?.status === 'closed'
            );
        });

        cy.step('the moderator erasing an account asks, and the account is gone afterwards');
        cy.accountInRole('pendingEmail').then(({ id: erasedId }) => {
            cy.switchUser('moderator');
            cy.travel(PAST_CRITICAL_MS);
            cy.visit('/en/users');
            cy.get('[data-test=filter-id] input').type(erasedId);
            cy.get('[data-test=search-submit]').click();
            cy.get('[data-test=row-hard-delete]').should('have.length', 1).click();
            cy.get('[data-test=app-dialog-confirm]').click();
            wrongThenCancel();
            cy.apiAs('moderator', 'GET', `/users/${erasedId}`).should('not.equal', null);
            cy.get('[data-test=row-hard-delete]').click();
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.get('[data-test=reauth-dialog]').should('be.visible');
            answerAs('moderator');
            cy.get('[data-test=row-hard-delete]').should('not.exist');
            loginDevice('moderator').then((device) => {
                requestAsDevice(device, 'GET', `/users/${erasedId}`)
                    .its('status')
                    .should('equal', 404);
            });
        });
    });
});
