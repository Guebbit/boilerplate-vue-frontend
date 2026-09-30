// requires-module: account, delivery, inventory, orders, payments, returns
/**
 * @module
 * N2 · Withdraw after delivery. The parcel has arrived and the customer still has the EU
 * withdrawal right (Consumer Rights Directive Art. 9: fourteen days from delivery). Unlike N1 there
 * is now something to send back, so the button opens a return — born `approved`, since a
 * withdrawal is a right and not a favour. When the goods come back the warehouse may keep part of
 * the money for handling damage (Art. 14(2)); the rest, delivery included, goes back to the card.
 *
 * The figures are the point: refund = what was paid − the deduction, read off the screen in cents
 * and checked against what the payment says it took, so a rounding or a forgotten delivery charge
 * cannot pass. The subject is `order.deliveredRecent`: `order.delivered` is weeks past its window.
 */
import { centsOf, eventually, idFromLocation, orderNumberShown } from '../../../support/e2e/steps';
import { mailMentions } from '../../../../scripts/e2e/mail-message';

/** What the warehouse keeps back for handling damage, in cents. */
const DEDUCTION_CENTS = 300;

/** The slice of a payment this story reads: what was taken and what came back. */
interface PaymentLike {
    status: string;
    amount: number;
    amountRefunded: number;
}

/** The slice of a return this story reads. */
interface ReturnLike {
    status: string;
    reason: string;
}

/** A credit note, as far as this story cares: that one exists and what it gives back. */
interface CreditNoteLike {
    grandTotal: number;
}

describe('N2 · Withdraw after delivery', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('opens an approved return, and the warehouse refunds what was paid minus the deduction', () => {
        cy.subjectId('order.deliveredRecent').then((orderId) => {
            cy.step('the customer finds the withdrawal window open on a delivered order');
            cy.loginAs('user');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=withdrawal-panel]').should('exist');
            cy.get('[data-test=withdrawal-until]').should('exist');
            cy.get('[data-test=order-return]').should('not.exist');
            const paid = { cents: 0 };
            cy.apiAs<PaymentLike>('user', 'GET', `/payments/order/${orderId}`).then((payment) => {
                paid.cents = Math.round(Number(payment?.amount) * 100);
            });

            cy.step('the button asks twice; nothing happens on the first click');
            cy.get('[data-test=withdraw-button]').click();
            cy.get('[data-test=app-dialog-confirm]').should('exist');
            cy.get('[data-test=order-return]').should('not.exist');
            cy.get('[data-test=app-dialog-confirm]').click();

            cy.step('a return opens, already approved — a withdrawal is not staff to decide');
            cy.get('[data-test=order-return]').should('have.length', 1);
            cy.get('[data-test=order-return] a')
                .invoke('attr', 'href')
                .then((href) => {
                    const returnId = String(href).split('/').at(-1);
                    cy.apiAs<ReturnLike>('user', 'GET', `/returns/${returnId}`).should((opened) => {
                        expect(opened?.status).to.equal('approved');
                        expect(opened?.reason).to.equal('withdrawal');
                    });

                    cy.step('the warehouse receives the goods, keeping part for handling');
                    cy.switchUser('warehouse');
                    cy.visit(`/en/returns/${returnId}`);
                    cy.get('[data-test=return-approve]').should('not.exist');
                    cy.get('[data-test=return-decline-form]').should('not.exist');
                    cy.get('[data-test=return-receive-deduction] input').should('not.be.disabled');
                    cy.get('[data-test=return-receive-deduction] input').type(
                        (DEDUCTION_CENTS / 100).toFixed(2)
                    );
                    cy.get('[data-test=return-receive]').click();
                    cy.get('[data-test=return-receive-form]').should('not.exist');

                    cy.step('the refund is what was paid, less the deduction');
                    centsOf('[data-test=return-refund]').should((refund) => {
                        expect(refund).to.equal(paid.cents - DEDUCTION_CENTS);
                    });
                    cy.apiAs<ReturnLike>('warehouse', 'GET', `/returns/${returnId}`).should(
                        (received) => {
                            expect(received?.status).to.equal('closed');
                        }
                    );
                });

            cy.step('the ledger shows the goods back on the shelf, against this order');
            cy.visit('/en/inventory');
            cy.get(`[data-test=movement-row]:has(a[href$="/orders/${orderId}"])`)
                .find('[data-test=movement-reason]')
                .should('contain.text', 'Restock');

            cy.step('the payment reports the part-refund, and a credit note is issued for it');
            eventually(
                () => cy.apiAs<PaymentLike>('admin', 'GET', `/payments/order/${orderId}`),
                (payment) => Number(payment?.amountRefunded) > 0
            ).should((payment) => {
                expect(Math.round(Number(payment?.amountRefunded) * 100)).to.equal(
                    paid.cents - DEDUCTION_CENTS
                );
                expect(payment?.status, 'part of the money stayed').to.not.equal('refunded');
            });
            eventually(
                () => cy.apiAs<CreditNoteLike[]>('user', 'GET', `/orders/${orderId}/credit-notes`),
                (notes) => (notes?.length ?? 0) > 0
            ).should((notes) => {
                expect(notes).to.have.length(1);
            });

            cy.step('the customer sees the closed return, the partial refund and the credit note');
            cy.switchUser('user');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=order-return]').should('have.length', 1);
            cy.get('[data-test=withdraw-button]').should('not.exist');
            cy.get('[data-test=payment-partially-refunded]').should('exist');
            cy.get('[data-test=order-credit-note-row]').should('have.length', 1);
            idFromLocation().should('equal', orderId);
            orderNumberShown().then((number) => {
                cy.accountOf('user').then(({ email }) => {
                    cy.emailTo(email, (mail) => mailMentions(mail, number));
                });
            });
        });
    });
});
