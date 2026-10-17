// requires-module: account, orders, payments
/**
 * @module
 * OP36 · The payments page's two doors. The moderator works the Awaiting tab, which lists the bank
 * transfers still owed: a row opens the payment, the payment points to its order, and recording the
 * transfer there empties the row from the tab and mails the buyer. Then a card payment is refunded
 * from its drawer: answering No writes nothing, answering Yes refunds what is left, and the buyer
 * ends up with a refund and a credit note.
 */
import { byTemplate } from '../../../../scripts/e2e/mail-filters';

/** The slice of a payment this story reads. */
interface PaymentLike {
    amountRefunded: number;
}

describe('OP36 · The payments page’s two doors', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('records a transfer from the Awaiting tab’s payment, and refunds a card payment from the drawer', () => {
        cy.subjectId('order.awaitingTransfer').then((transferId) => {
            cy.step('the Awaiting tab lists the transfer, and its row opens the payment');
            cy.loginAs('moderator');
            cy.visit('/en/sales/payments?tab=awaiting');
            cy.get(`[data-test=awaiting-order-link][href*="${transferId}"]`)
                .closest('[data-test=awaiting-row]')
                .click();
            cy.get('[data-test=payment-drawer]').should('be.visible');

            cy.step('the payment points to its order, where the transfer is recorded');
            cy.get('[data-test=drawer-open-order]').click();
            cy.url().should('match', new RegExp(`/orders/${transferId}/edit$`));
            cy.get('[data-test=record-offline-submit]').click();
            cy.get('[data-test=record-offline-payment-error]').should('not.exist');
            cy.apiAs<{ status: string }>('moderator', 'GET', `/orders/${transferId}`)
                .its('status')
                .should('equal', 'paid');

            cy.step('the row has left the Awaiting tab, and the buyer is told the money arrived');
            cy.visit('/en/sales/payments?tab=awaiting');
            cy.get('[data-test=payments-awaiting]').should('be.visible');
            cy.get(`[data-test=awaiting-order-link][href*="${transferId}"]`).should('not.exist');
            cy.accountOf('user').then(({ email }) => {
                cy.emailTo(email, byTemplate('payments.payment-received'));
            });
        });

        cy.subjectId('order.paidExpress').then((cardId) => {
            cy.step('a card payment opens in the drawer; answering No refunds nothing');
            cy.visit('/en/sales/payments');
            cy.get('[data-test=filter-order-id] input').type(cardId);
            cy.get('[data-test=payments-search-submit]').click();
            cy.get('[data-test=payment-row]').should('have.length', 1).first().click();
            cy.get('[data-test=drawer-refund]').click();
            cy.get('[data-test=app-dialog-cancel]').click();
            cy.apiAs<PaymentLike>('moderator', 'GET', `/payments/order/${cardId}`)
                .its('amountRefunded')
                .should('equal', 0);

            cy.step('answering Yes refunds what is left, and the drawer closes');
            cy.get('[data-test=drawer-refund]').click();
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.get('[data-test=payment-drawer]').should('not.be.visible');

            cy.step('the Refunds tab holds it, and the buyer has a refund and a credit note');
            cy.get('[data-test=payments-tab-refunds]').click();
            cy.get('[data-test=refund-filter-order-id] input').type(cardId);
            cy.get('[data-test=refunds-search-submit]').click();
            cy.get('[data-test=refund-order-link]').should('have.length', 1);
            cy.apiAs<PaymentLike>('user', 'GET', `/payments/order/${cardId}`)
                .its('amountRefunded')
                .should('be.greaterThan', 0);
            cy.apiAs<unknown[]>('user', 'GET', `/orders/${cardId}/credit-notes`)
                .its('length')
                .should('be.greaterThan', 0);
        });
    });
});
