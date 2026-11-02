// requires-module: account, inventory, orders, payments, returns
/**
 * @module
 * OP22 · A defective item comes back. The non-withdrawal path of a return: the customer says the
 * goods were faulty, and nothing happens until staff answer. Support decides (approve, or decline
 * with a coded reason and a message the customer will read); the warehouse, which holds the
 * parcel, receives it. Each role does only its own part — support is never offered "receive", the warehouse never "approve".
 *
 * Two seeded requests, since the story is about the answering. Opening one is CU31's story.
 * Faulty goods are the seller's own doing, so the delivery charge goes back too: the refund is
 * the full amount, delivery included, as the guarantee requires. No handling deduction applies.
 */
import { mailMentions } from '../../../../scripts/e2e/mail-message';
import { centsOf, creditNotesOf, orderMailTo, paymentOfOrder } from '../../../support/e2e/steps';

/** The coded reason support picks for declining: the goods show no fault. Shown by its label. */
const DECLINE_CODE_LABEL = 'No defect found';

/** The message support writes to the buyer, which the customer must be able to read. */
const DECLINE_REASON = 'The photos show ordinary wear, not a fault.';

/** Returns the seed already holds besides the two requests: one closed withdrawal cancellation. */
const SEEDED_CANCELLATIONS = 1;

/** The slice of a return this story reads. */
interface ReturnLike {
    status: string;
    orderId: string;
    lines: { productId: string; quantity: number }[];
}

/** The slice of the options read this story compares the form with. */
interface OptionsLike {
    returnable: { productId: string; quantity: number }[];
}

/** The slice of a payment this story reads. */
interface PaymentLike {
    amount: number;
    amountRefunded: number;
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
 * @param ids - the returns expected by id
 * @param others - how many more the seed holds that this story does not name
 */
const listShows = (ids: string[], others = 0): void => {
    cy.get('[data-test=return-open]').should('have.length', ids.length + others);
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
                cy.step(
                    'support opens the queue: both requests wait beside the seeded cancellation, and the filters narrow it'
                );
                cy.loginAs('support');
                cy.visit('/en/returns');
                listShows([approvedId, declinedId], SEEDED_CANCELLATIONS);
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

                cy.step('and declines the second, which needs a coded reason');
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
                cy.pickOption('[data-test=return-decline-reason]', DECLINE_CODE_LABEL);
                cy.get('[data-test=return-decline-message] textarea').type(DECLINE_REASON);
                cy.get('[data-test=return-decline]').click();
                cy.get('[data-test=return-decline-form]').should('not.exist');
                cy.get('[data-test=return-decline-reason-text]').should(
                    'contain.text',
                    DECLINE_CODE_LABEL
                );
                cy.get('[data-test=return-decline-message-text]').should(
                    'contain.text',
                    DECLINE_REASON
                );

                cy.step('the list now tells the two apart');
                cy.visit('/en/returns');
                filterReturnsBy('status', 'Declined');
                listShows([declinedId]);
                filterReturnsBy('status', 'Approved');
                listShows([approvedId]);

                cy.step('the warehouse receives the approved return, which offers no deduction');
                cy.switchUser('warehouse');
                cy.visit(`/en/returns/${approvedId}`);
                cy.get('[data-test=return-approve]').should('not.exist');
                cy.get('[data-test=return-decline-form]').should('not.exist');
                cy.get('[data-test=return-receive-deduction]').should('not.exist');
                cy.get('[data-test=return-receive-remedy-refund] input').should('be.checked');
                cy.get('[data-test=return-receive]').click();
                cy.get('[data-test=return-receive-form]').should('not.exist');

                cy.step('the refund is everything the payment took, delivery included');
                cy.apiAs<ReturnLike>('warehouse', 'GET', `/returns/${approvedId}`).then(
                    (received) => {
                        expect(received?.status).to.equal('closed');
                        const orderId = String(received?.orderId);
                        paymentOfOrder<PaymentLike>('admin', orderId).then((payment) => {
                            const paidCents = Math.round(Number(payment?.amount) * 100);
                            centsOf('[data-test=return-refund]').should((refund) => {
                                expect(refund).to.equal(paidCents);
                            });
                        });

                        cy.step('the ledger shows the goods back, against that order');
                        cy.visit('/en/inventory');
                        cy.get(`[data-test=movement-row]:has(a[href$="/orders/${orderId}"])`)
                            .find('[data-test=movement-reason]')
                            .should('contain.text', 'Restock');

                        cy.step('a credit note records the money that went back');
                        creditNotesOf('admin', orderId).should((notes) => {
                            expect(notes?.items).to.have.length(1);
                        });
                    }
                );

                cy.step(
                    'the customer opens both: one closed with its refund, one declined with the reason'
                );
                cy.switchUser('user');
                cy.visit('/en/returns');
                listShows([approvedId, declinedId], SEEDED_CANCELLATIONS);
                cy.get(`[data-test=return-open][href$="/returns/${declinedId}"]`).click();
                cy.get('[data-test=return-decline-reason-text]').should(
                    'contain.text',
                    DECLINE_CODE_LABEL
                );
                cy.get('[data-test=return-decline-message-text]').should(
                    'contain.text',
                    DECLINE_REASON
                );
                cy.get('[data-test=return-staff-actions]').find('button').should('not.exist');
                cy.visit(`/en/returns/${approvedId}`);
                cy.get('[data-test=return-refund]').should('exist');
                cy.get('[data-test=return-decline-reason-text]').should('not.exist');

                cy.step('the customer was mailed each answer, and the decline carries its reason');
                cy.apiAs<ReturnLike>('user', 'GET', `/returns/${approvedId}`).then((approved) => {
                    orderMailTo('user', String(approved?.orderId), 'Your return was approved');
                    orderMailTo('user', String(approved?.orderId), 'Your return was refunded');
                });
                cy.apiAs<ReturnLike>('user', 'GET', `/returns/${declinedId}`).then((declined) => {
                    orderMailTo('user', String(declined?.orderId), 'Your return was declined').then(
                        (mail) => {
                            expect(
                                mailMentions(mail, DECLINE_REASON),
                                'the reason is mailed'
                            ).to.equal(true);
                        }
                    );

                    cy.step('a declined request gives its quantity back: the form offers it again');
                    cy.apiAs<OptionsLike>(
                        'user',
                        'GET',
                        `/returns/options?orderId=${declined?.orderId}`
                    ).then((options) => {
                        for (const { productId } of declined?.lines ?? [])
                            expect(
                                options?.returnable.map((line) => line.productId),
                                'the declined line is offered again'
                            ).to.include(productId);
                    });
                    cy.visit(`/en/orders/${declined?.orderId}`);
                    cy.get('[data-test=return-request-open]').click();
                    for (const { productId, quantity } of declined?.lines ?? []) {
                        cy.get(`[data-test=return-line-pick-${productId}]`).should('exist');
                        cy.get(`[data-test=return-line-pick-${productId}] input`).check({
                            force: true
                        });
                        cy.get(`[data-test=return-line-quantity-${productId}]`).should(
                            'contain.text',
                            `up to ${String(quantity)}`
                        );
                    }
                });
            });
        });
    });
});
