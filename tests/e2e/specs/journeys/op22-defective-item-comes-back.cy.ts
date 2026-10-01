// requires-module: account, inventory, orders, payments, returns
/**
 * @module
 * OP22 · A defective item comes back. The non-withdrawal path of a return: the customer says the
 * goods were faulty, and nothing happens until staff answer. Support decides (approve, or decline
 * with a reason the customer will read); the warehouse, which holds the parcel, receives it. Each
 * role does only its own part — support is never offered "receive", the warehouse never "approve".
 *
 * Two seeded requests, since opening one is rate-limited and the story is about the answering.
 * Faulty goods are the seller's own doing, so the delivery charge goes back too: the refund is
 * everything the payment took, less the deduction.
 */
import { centsOf, eventually } from '../../../support/e2e/steps';

/** What the warehouse keeps back for handling, in cents. */
const DEDUCTION_CENTS = 200;

/** The reason support gives for declining, which the customer must be able to read. */
const DECLINE_REASON = 'The photos show ordinary wear, not a fault.';

/** The slice of a return this story reads. */
interface ReturnLike {
    status: string;
    orderId: string;
}

/** The slice of a payment this story reads. */
interface PaymentLike {
    amount: number;
    amountRefunded: number;
}

/** A credit note, as far as this story cares: that it is listed. */
interface CreditNoteLike {
    grandTotal: number;
}

/**
 * Narrows the returns list with one filter, through the filter's own select and the search button.
 *
 * @param filter - which filter, `status` or `reason`
 * @param label - the option's visible name
 */
const filterReturnsBy = (filter: 'status' | 'reason', label: string): void => {
    cy.pickOption(`[data-test=filter-${filter}]`, label);
    cy.get('[data-test=search-submit]').click();
};

/**
 * Asserts which returns the list shows, by the address each row opens — never by position.
 *
 * @param ids - the returns expected, and only those
 */
const listShows = (ids: string[]): void => {
    cy.get('[data-test=return-open]').should('have.length', ids.length);
    for (const id of ids) cy.get(`[data-test=return-open][href$="/returns/${id}"]`).should('exist');
};

describe('OP22 · A defective item comes back', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('support approves one and declines the other, the warehouse receives the approved one, the customer reads both', () => {
        cy.subjectId('return.requested').then((approvedId) => {
            cy.subjectId('return.requestedSecond').then((declinedId) => {
                cy.step('support opens the queue: both requests wait, and the filters narrow it');
                cy.loginAs('support');
                cy.visit('/en/returns');
                listShows([approvedId, declinedId]);
                filterReturnsBy('status', 'Approved');
                cy.get('[data-test=return-item]').should('not.exist');
                filterReturnsBy('status', 'Requested');
                listShows([approvedId, declinedId]);
                filterReturnsBy('reason', 'Withdrawal');
                cy.get('[data-test=return-item]').should('not.exist');
                filterReturnsBy('reason', 'Defective goods');
                listShows([approvedId, declinedId]);

                cy.step(
                    'support approves the first: from here only receiving is left, and not hers'
                );
                cy.visit(`/en/returns/${approvedId}`);
                cy.get('[data-test=return-receive-form]').should('not.exist');
                cy.get('[data-test=return-approve]').click();
                cy.get('[data-test=return-approve]').should('not.exist');
                cy.get('[data-test=return-decline-form]').should('not.exist');
                cy.get('[data-test=return-receive-form]').should('not.exist');
                cy.apiAs<ReturnLike>('support', 'GET', `/returns/${approvedId}`).should(
                    (approved) => {
                        expect(approved?.status).to.equal('approved');
                    }
                );

                cy.step('and declines the second, which needs a reason');
                cy.visit(`/en/returns/${declinedId}`);
                cy.get('[data-test=return-decline]').click();
                cy.get('[data-test=return-decline-form]').should(
                    'contain.text',
                    'A reason is required'
                );
                cy.apiAs<ReturnLike>('support', 'GET', `/returns/${declinedId}`).should(
                    (stillOpen) => {
                        expect(stillOpen?.status, 'an empty reason declines nothing').to.equal(
                            'requested'
                        );
                    }
                );
                cy.get('[data-test=return-decline-reason] input').type(DECLINE_REASON);
                cy.get('[data-test=return-decline]').click();
                cy.get('[data-test=return-decline-form]').should('not.exist');
                cy.get('[data-test=return-decline-reason-text]').should(
                    'contain.text',
                    DECLINE_REASON
                );

                cy.step('the list now tells the two apart');
                cy.visit('/en/returns');
                filterReturnsBy('status', 'Declined');
                listShows([declinedId]);
                filterReturnsBy('status', 'Approved');
                listShows([approvedId]);

                cy.step('the warehouse receives the approved return, keeping part for handling');
                cy.switchUser('warehouse');
                cy.visit(`/en/returns/${approvedId}`);
                cy.get('[data-test=return-approve]').should('not.exist');
                cy.get('[data-test=return-decline-form]').should('not.exist');
                cy.get('[data-test=return-receive-deduction] input').should('not.be.disabled');
                cy.get('[data-test=return-receive-deduction] input').type(
                    (DEDUCTION_CENTS / 100).toFixed(2)
                );
                cy.get('[data-test=return-receive]').click();
                cy.get('[data-test=return-receive-form]').should('not.exist');

                cy.step('the refund is what the order cost, delivery included, less the deduction');
                cy.apiAs<ReturnLike>('warehouse', 'GET', `/returns/${approvedId}`).then(
                    (received) => {
                        expect(received?.status).to.equal('closed');
                        const orderId = String(received?.orderId);
                        cy.apiAs<PaymentLike>('admin', 'GET', `/payments/order/${orderId}`).then(
                            (payment) => {
                                const paidCents = Math.round(Number(payment?.amount) * 100);
                                centsOf('[data-test=return-refund]').should((refund) => {
                                    expect(refund).to.equal(paidCents - DEDUCTION_CENTS);
                                });
                            }
                        );

                        cy.step('the ledger shows the goods back, against that order');
                        cy.visit('/en/inventory');
                        cy.get(`[data-test=movement-row]:has(a[href$="/orders/${orderId}"])`)
                            .find('[data-test=movement-reason]')
                            .should('contain.text', 'Restock');

                        cy.step('a credit note records the money that went back');
                        eventually(
                            () =>
                                cy.apiAs<CreditNoteLike[]>(
                                    'admin',
                                    'GET',
                                    `/orders/${orderId}/credit-notes`
                                ),
                            (notes) => (notes?.length ?? 0) > 0
                        ).should((notes) => {
                            expect(notes).to.have.length(1);
                        });
                    }
                );

                cy.step(
                    'the customer opens both: one closed with its refund, one declined with the reason'
                );
                cy.switchUser('user');
                cy.visit('/en/returns');
                listShows([approvedId, declinedId]);
                cy.get(`[data-test=return-open][href$="/returns/${declinedId}"]`).click();
                cy.get('[data-test=return-decline-reason-text]').should(
                    'contain.text',
                    DECLINE_REASON
                );
                cy.get('[data-test=return-staff-actions]').find('button').should('not.exist');
                cy.visit(`/en/returns/${approvedId}`);
                cy.get('[data-test=return-refund]').should('exist');
                cy.get('[data-test=return-decline-reason-text]').should('not.exist');
            });
        });
    });
});
