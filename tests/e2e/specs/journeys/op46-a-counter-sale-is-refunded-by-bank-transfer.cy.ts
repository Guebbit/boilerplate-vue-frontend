// requires-module: account, delivery, inventory, orders, payments, products, returns, shop-tasks, tasks
/**
 * @module
 * OP46 · A counter sale is refunded on the spot, by bank transfer. A customer with an account
 * buys at the counter, staff raising the order in that account's name, and pays by bank transfer.
 * Later the customer returns the product. The admin receives it and, because the money already
 * went back outside the app, says so in the same step: "already paid outside", by bank transfer,
 * with the transfer's reference. The refund is settled at once, so nothing is owed, no to-do
 * opens, and the customer reads the closed return in their own account.
 *
 * Only an admin can do this in one step: it needs both receiving a return and creating a refund.
 */
import {
    counterSale,
    eventually,
    openStaffReturn,
    paymentOfOrder
} from '../../../support/e2e/steps';

/** The reference staff write for the transfer they made. */
const TRANSFER_REFERENCE = 'TRF-OP46-0001';

/** The slice of a return this story reads. */
interface ReturnLike {
    status: string;
}

/** The slice of a payment this story reads. */
interface PaymentLike {
    displayStatus?: string;
    refunds: { settledByHand?: boolean }[];
    actions: { settleRefundByHand: string[] };
}

/** The slice of the account this story reads: who the sale is for. */
interface AccountLike {
    email: string;
}

describe('OP46 · A counter sale is refunded by bank transfer', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('sells to an account by bank transfer, takes the goods back, settles the refund at once and shows the customer', () => {
        const title = `E2E OP46 ${Date.now()}`;
        cy.createProduct({ title, onHand: 5 }).then((product) => {
            cy.apiAs<AccountLike>('user', 'GET', '/account').then((account) => {
                cy.loginAs('admin');
                counterSale({
                    title,
                    quantity: 1,
                    paidBy: 'Bank transfer',
                    accountEmail: String(account?.email)
                }).then((orderId) => {
                    cy.step('the customer brings it back: staff open the return');
                    openStaffReturn({
                        orderId,
                        productId: product.id,
                        quantity: 1,
                        reason: 'Other'
                    }).then((returnId) => {
                        cy.step('the admin receives it and records the transfer already made');
                        cy.visit(`/en/returns/${returnId}`);
                        cy.get('[data-test=paid-outside-switch] input').check({ force: true });
                        cy.pickOption('[data-test=paid-outside-method]', 'Bank transfer');
                        cy.get('[data-test=paid-outside-reference] input').type(TRANSFER_REFERENCE);
                        cy.get('[data-test=return-receive]').click();
                        cy.get('[data-test=return-receive-form]').should('not.exist');

                        cy.step(
                            'the refund settled at once: the return is closed, nothing is owed'
                        );
                        eventually(
                            () => cy.apiAs<ReturnLike>('admin', 'GET', `/returns/${returnId}`),
                            (received) => received?.status === 'closed'
                        )
                            .its('status')
                            .should('equal', 'closed');
                        paymentOfOrder<PaymentLike>('admin', orderId).should((payment) => {
                            expect(payment?.refunds[0]?.settledByHand).to.equal(true);
                            expect(payment?.displayStatus).to.equal('refunded');
                            expect(payment?.actions.settleRefundByHand).to.have.length(0);
                        });
                        cy.visit(`/en/orders/${orderId}/edit`);
                        cy.get('[data-test^=button-mark-returned-]').should('not.exist');
                        cy.visit('/en/tasks');
                        // The seed holds no tasks, so a clean inbox is the empty state, not a row.
                        cy.contains('No messages yet').should('be.visible');
                        cy.get('[data-test=task-item]').should('not.exist');
                        cy.apiAs<{ items: unknown[] }>('admin', 'POST', '/tasks/search', {
                            kind: 'manual_refund_owed'
                        })
                            .its('items')
                            .should('have.length', 0);

                        cy.step('the customer logs in and reads the closed return and its refund');
                        cy.switchUser('user');
                        cy.visit('/en/returns');
                        cy.get(`[data-test=return-open][href$="/returns/${returnId}"]`).click();
                        cy.get('[data-test=return-status]').should('contain.text', 'Closed');
                        cy.get('[data-test=return-refund]').should('exist');
                        cy.get('[data-test=return-staff-actions]')
                            .find('button')
                            .should('not.exist');
                    });
                });
            });
        });
    });
});
