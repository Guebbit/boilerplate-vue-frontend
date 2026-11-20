// requires-module: account, delivery, inventory, orders, payments, products, returns, shop-tasks, tasks
/**
 * @module
 * OP45 · A counter sale comes back in part. A walk-in buys two of a product at the counter and
 * pays cash; weeks later the buyer returns one and asks for the money back. Staff open the return
 * (the buyer is not in the app), the warehouse receives the parcel, and because the sale was in
 * cash the refund cannot be sent anywhere: it stays owed, a to-do and a Needs-attention row say
 * so, and nothing closes until the moderator hands the cash over and presses "Mark returned".
 *
 * The refund is the one unit that came back, not the whole sale. The reason is "other": a
 * counter sale has no legal withdrawal, so the return is the shop's goodwill.
 */
import {
    counterSale,
    eventually,
    openStaffReturn,
    paymentOfOrder
} from '../../../support/e2e/steps';

/** What the reason picker shows for the goodwill return. */
const GOODWILL_REASON = 'Other';

/** The slice of a return this story reads. */
interface ReturnLike {
    status: string;
    refundAmount?: string;
    lines: { productId: string; quantity: number; unitPrice: string }[];
}

/** The slice of a payment this story reads. */
interface PaymentLike {
    displayStatus?: string;
    amountRefunded: string;
    refunds: { settledByHand?: boolean }[];
}

/** The slice of the task list this story reads. */
interface TaskListLike {
    items: { status: string }[];
}

/** The open and resolved "refund owed by hand" to-dos, as staff see them. */
const refundTasks = (): Cypress.Chainable<TaskListLike | null> =>
    cy.apiAs<TaskListLike>('admin', 'POST', '/tasks/search', { kind: 'manual_refund_owed' });

describe('OP45 · A counter sale comes back in part', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('opens the return for one unit, receives it, owes the cash back by hand, and closes once marked returned', () => {
        const title = `E2E OP45 ${Date.now()}`;
        cy.createProduct({ title, onHand: 5 }).then((product) => {
            // One unit of the two sold: what the refund must be, to the cent.
            const unitCents = Math.round(Number(product.price) * 100);
            cy.loginAs('admin');
            counterSale({ title, quantity: 2, paidBy: 'Cash' }).then((orderId) => {
                cy.step('later, staff open a goodwill return for ONE of the two units');
                openStaffReturn({
                    orderId,
                    productId: product.id,
                    quantity: 1,
                    reason: GOODWILL_REASON
                }).then((returnId) => {
                    cy.apiAs<ReturnLike>('admin', 'GET', `/returns/${returnId}`)
                        .its('status')
                        .should('equal', 'approved');

                    cy.step('the warehouse receives the parcel: the return waits on the cash');
                    cy.switchUser('warehouse');
                    cy.visit(`/en/returns/${returnId}`);
                    cy.get('[data-test=return-receive]').click();
                    cy.get('[data-test=return-receive-form]').should('not.exist');
                    cy.apiAs<ReturnLike>('warehouse', 'GET', `/returns/${returnId}`).should(
                        (received) => {
                            expect(received?.status, 'owed by hand, so not closed').to.equal(
                                'received'
                            );
                            const [line] = received?.lines ?? [];
                            expect(line?.quantity).to.equal(1);
                            expect(
                                Math.round(Number(received?.refundAmount) * 100),
                                'the refund is the one unit'
                            ).to.equal(unitCents);
                        }
                    );

                    cy.step('the refund is owed: a to-do and a Needs-attention row say so');
                    eventually(
                        () => refundTasks(),
                        (tasks) => (tasks?.items.length ?? 0) > 0
                    ).should((tasks) => {
                        expect(tasks?.items).to.have.length(1);
                        expect(tasks?.items[0]?.status).to.not.equal('resolved');
                    });
                    cy.switchUser('admin');
                    cy.visit('/en/tasks');
                    cy.get('[data-test=task-item]')
                        .should('have.length', 1)
                        .and('contain.text', 'Refund owed by hand');
                    cy.get('[data-test=task-status]').should('contain.text', 'New');
                    cy.visit('/en/sales/payments?tab=attention');
                    cy.contains('[data-test=attention-row]', orderId)
                        .find('[data-test=attention-kind]')
                        .should('contain.text', 'Money to hand back outside the system');
                    cy.switchUser('moderator');

                    cy.step('the moderator hands the cash back and presses Mark returned');
                    cy.visit(`/en/orders/${orderId}/edit`);
                    cy.get('[data-test^=button-mark-returned-]').should('have.length', 1).click();
                    cy.get('[data-test=app-dialog-confirm]').click();
                    cy.get('[data-test^=button-mark-returned-]').should('not.exist');
                    cy.get('[data-test=order-edit-actions-error]').should('not.exist');

                    cy.step('the return closes, the to-do clears and the row leaves the list');
                    eventually(
                        () => cy.apiAs<ReturnLike>('moderator', 'GET', `/returns/${returnId}`),
                        (closed) => closed?.status === 'closed'
                    )
                        .its('status')
                        .should('equal', 'closed');
                    eventually(
                        () => refundTasks(),
                        (tasks) =>
                            tasks?.items.every(({ status }) => status === 'resolved') ?? false
                    ).should((tasks) => {
                        expect(tasks?.items.map(({ status }) => status)).to.deep.equal([
                            'resolved'
                        ]);
                    });
                    cy.switchUser('admin');
                    cy.visit('/en/tasks');
                    cy.get('[data-test=task-item]')
                        .should('have.length', 1)
                        .and('contain.text', 'Refund owed by hand');
                    cy.get('[data-test=task-status]').should('contain.text', 'Resolved');
                    cy.visit('/en/sales/payments?tab=attention');
                    cy.get('[data-test=attention-reload]').click();
                    cy.contains('[data-test=attention-row]', orderId).should('not.exist');

                    cy.step('the payment records one unit refunded by hand, not the whole sale');
                    paymentOfOrder<PaymentLike>('moderator', orderId).should((payment) => {
                        expect(payment?.refunds[0]?.settledByHand).to.equal(true);
                        expect(payment?.displayStatus).to.not.equal('refund_pending');
                        expect(
                            Math.round(Number(payment?.amountRefunded) * 100),
                            'only the returned unit went back'
                        ).to.equal(unitCents);
                    });
                });
            });
        });
    });
});
