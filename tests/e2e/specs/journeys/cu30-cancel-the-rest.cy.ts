// requires-module: account, delivery, orders, payments, returns
/**
 * @module
 * CU30 · Cancel what has not shipped. One of the customer's three units has left; the other two
 * have not. The order page offers "Cancel what has not shipped" for the group, with the refund the
 * SERVER computed — never a sum made on the page — and a confirm step. Confirming closes a
 * cancellation, the group has nothing left to cancel, and the money for those two units goes back.
 */
import { eventually } from '../../../support/e2e/steps';

/** The slice of the options read this story compares the screen with. */
interface OptionsLike {
    cancellable: { refundAmount: number }[];
}

/** The slice of a return this story reads. */
interface ReturnLike {
    kind: string;
    status: string;
}

/** The slice of a payment this story reads. */
interface PaymentLike {
    status: string;
}

describe('CU30 · Cancel what has not shipped', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('cancels the unshipped units at the server’s refund, and the money goes back', () => {
        cy.subjectId('order.partiallyFulfilled').then((orderId) => {
            cy.step('the customer is offered the cancel, with what it would refund');
            cy.loginAs('user');
            const refund = { amount: 0 };
            cy.apiAs<OptionsLike>('user', 'GET', `/returns/options?orderId=${orderId}`).then(
                (options) => {
                    expect(options?.cancellable).to.have.length(1);
                    refund.amount = Number(options?.cancellable[0].refundAmount);
                }
            );
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=cancellable-item]').should('have.length', 1);
            cy.get('[data-test=cancel-hint]').should('exist');

            cy.step(
                'the confirm step shows the refund the server named, and nothing is cancelled yet'
            );
            cy.get('[data-test=cancel-remainder-open]').click();
            cy.get('[data-test=cancel-remainder-refund]').should(($line) => {
                expect($line.text()).to.contain(refund.amount.toFixed(2));
            });
            cy.apiAs<{ items: ReturnLike[] }>('user', 'GET', `/returns?orderId=${orderId}`).should(
                (page) => {
                    expect(
                        page?.items.filter(({ kind }) => kind === 'cancellation')
                    ).to.have.length(0);
                }
            );

            cy.step('confirms: a closed cancellation is on record and nothing is left to cancel');
            cy.get('[data-test=cancel-remainder-confirm]').click();
            cy.get('[data-test=cancel-remainder-dialog]').should('not.exist');
            cy.get('[data-test=cancellable-item]').should('not.exist');
            cy.get('[data-test=order-return]').should('have.length', 1);
            cy.apiAs<{ items: ReturnLike[] }>('user', 'GET', `/returns?orderId=${orderId}`).should(
                (page) => {
                    expect(page?.items).to.have.length(1);
                    expect(page?.items[0]).to.include({ kind: 'cancellation', status: 'closed' });
                }
            );

            cy.step('the refund for those units goes back to the card, in part');
            eventually(
                () => cy.apiAs<PaymentLike>('user', 'GET', `/payments/order/${orderId}`),
                (payment) => payment?.status === 'partially_refunded'
            ).should((payment) => {
                expect(payment?.status).to.equal('partially_refunded');
            });
        });
    });
});
