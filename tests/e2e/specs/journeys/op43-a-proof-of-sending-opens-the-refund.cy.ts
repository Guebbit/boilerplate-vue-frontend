// requires-module: account, orders, payments, returns
/**
 * @module
 * OP43 · A proof of sending opens the refund. The customer withdrew from a delivered order, so the
 * return is approved and the parcel is on its way back. The buyer shows the warehouse the carrier's
 * receipt: staff record it (date, carrier, reference) and on a withdrawal that opens the refund
 * now, before the goods arrive (Directive 2011/83/EU Art. 13(3)). The card network refuses it, so
 * the refund waits in Needs attention with its legal deadline and the rule behind it, until the
 * provider lets it through and the sweep sends it.
 *
 * The proof is recorded once (a second one is a 409), and once it opened the refund staff can no
 * longer cancel the return: the money is owed.
 *
 * Demo only: the refusal is a lever on the fake payment provider, and the hour is a clock jump.
 */
import { failRefundsOf, loginDevice } from '../../../support/e2e/harness';
import { eventually, paymentOfOrder, refusedWith } from '../../../support/e2e/steps';

/** The slice of a payment this story reads. */
interface PaymentLike {
    amountRefunded: string;
}

/** The slice of a return this story reads. */
interface ReturnLike {
    status: string;
    refundAmount?: string;
    proofCarrier?: string;
    proofReference?: string;
    actions: { cancel: boolean; recordProof: boolean };
}

/** The carrier's document, as staff read it off the buyer's receipt. */
const PROOF = { carrier: 'Poste Italiane', reference: 'RR123456789IT' };

/** The date on that receipt: two days ago, never the future, in `YYYY-MM-DD`. */
const sentOn = (): string =>
    new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

describe('OP43 · A proof of sending opens the refund', () => {
    beforeEach(() => {
        cy.skipUnlessDemo();
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('records the proof once, opens the refund, shows its legal deadline and no cancel', () => {
        cy.subjectId('order.withdrawal-open').then((orderId) => {
            cy.step(
                'the customer withdraws: an approved return, the card network will refuse the money'
            );
            failRefundsOf(orderId, 'insufficient_funds');
            cy.loginAs('user');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=withdraw-button]').click();
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.get('[data-test=order-return]').should('have.length', 1);
            cy.get('[data-test=order-return] a')
                .invoke('attr', 'href')
                .then((href) => {
                    const returnId = String(href).split('/').at(-1);

                    cy.step(
                        'the warehouse opens it: a proof form, and the button names the refund'
                    );
                    cy.switchUser('warehouse');
                    cy.visit(`/en/returns/${returnId}`);
                    cy.get('[data-test=return-proof-form]').should('exist');
                    cy.get('[data-test=return-proof]').should(
                        'contain.text',
                        'Record proof and refund'
                    );
                    cy.get('[data-test=return-proof-recorded]').should('not.exist');

                    cy.step('an empty proof is refused on the page; the real one is recorded');
                    cy.get('[data-test=return-proof]').click();
                    cy.get('[data-test=return-proof-form]').should(
                        'contain.text',
                        'This field is required'
                    );
                    cy.get('[data-test=return-proof-sent-at] input').type(sentOn());
                    cy.get('[data-test=return-proof-carrier] input').type(PROOF.carrier);
                    cy.get('[data-test=return-proof-reference] input').type(PROOF.reference);
                    cy.get('[data-test=return-proof]').click();

                    cy.step('the return shows the proof, offers no second one and no cancel');
                    cy.get('[data-test=return-proof-recorded]')
                        .should('contain.text', PROOF.carrier)
                        .and('contain.text', PROOF.reference);
                    cy.get('[data-test=return-proof-form]').should('not.exist');
                    cy.get('[data-test=return-cancel-form]').should('not.exist');
                    cy.apiAs<ReturnLike>('warehouse', 'GET', `/returns/${returnId}`).should(
                        (recorded) => {
                            expect(recorded?.status, 'the goods are still to come').to.equal(
                                'approved'
                            );
                            expect(recorded?.proofCarrier).to.equal(PROOF.carrier);
                            expect(recorded?.actions.recordProof).to.equal(false);
                            expect(recorded?.actions.cancel).to.equal(false);
                        }
                    );

                    cy.step('a second proof is refused, whoever sends it');
                    loginDevice('warehouse').then((device) => {
                        refusedWith(
                            device,
                            'POST',
                            `/returns/${returnId}/proof-of-sending`,
                            {
                                sentAt: `${sentOn()}T00:00:00.000Z`,
                                carrier: 'Another carrier',
                                reference: 'X1'
                            },
                            409,
                            'RETURN_PROOF_ALREADY_RECORDED'
                        );
                    });

                    cy.step(
                        'an hour on, the refused refund waits with its legal deadline and rule'
                    );
                    cy.travel(61 * 60_000);
                    cy.switchUser('moderator');
                    cy.visit('/en/sales/payments?tab=attention');
                    cy.contains('[data-test=attention-row]', orderId).within(() => {
                        cy.get('[data-test=attention-rule]').should(
                            'contain.text',
                            'Legal refund deadline (withdrawal)'
                        );
                    });

                    cy.step('the provider lets it through: the sweep sends the refund');
                    failRefundsOf(orderId, null);
                    cy.runJob('sweep-payment-effects');
                    cy.get('[data-test=attention-reload]').click();
                    cy.contains('[data-test=attention-row]', orderId).should('not.exist');
                    cy.apiAs<ReturnLike>('moderator', 'GET', `/returns/${returnId}`).then(
                        (opened) => {
                            eventually(
                                () => paymentOfOrder<PaymentLike>('moderator', orderId),
                                (payment) => Number(payment?.amountRefunded) > 0
                            ).should((payment) => {
                                expect(
                                    Math.round(Number(payment?.amountRefunded) * 100),
                                    'the amount quoted when the proof was recorded, no deduction'
                                ).to.equal(Math.round(Number(opened?.refundAmount) * 100));
                            });
                        }
                    );
                });
        });
    });
});
