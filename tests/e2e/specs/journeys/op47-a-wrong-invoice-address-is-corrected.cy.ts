// requires-module: account, delivery, inventory, orders, payments, products
/**
 * @module
 * OP47 · A wrong invoice address is corrected. A walk-in paid cash at the counter and was
 * invoiced with no buyer on it; they write in to ask for their name and address on the invoice.
 * The shop manager opens the order's edit page, fills the billing address and saves. An invoice
 * is never edited, so the shop cancels it with a credit note and issues a new one to the
 * corrected buyer. No money moves, and the order's timeline says what happened, in order.
 *
 * Money and the parcel belong to the admin who made the sale; the correction is the manager's
 * (`update:Order`), so this story proves the manager's door reaches all the way to the documents.
 */
import { counterSale, creditNotesOf, eventually } from '../../../support/e2e/steps';

/** The street the buyer asked to have on the invoice. */
const STREET = 'Via Corretta 42';

/** The slice of an order's timeline this story reads. */
interface TimelineLike {
    items: { type: string; data?: { number?: string } }[];
}

/** The slice of an order this story reads. */
interface OrderLike {
    status: string;
    totalPrice: string;
    billingAddress?: { street: string };
}

/** The slice of a credit note's list row this story reads. */
interface CreditNotesLike {
    items: { grandTotal: string }[];
}

describe('OP47 · A wrong invoice address is corrected', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('cancels the invoice with a credit note, issues a new one, and writes it on the timeline', () => {
        const title = `E2E OP47 ${Date.now()}`;
        cy.createProduct({ title, onHand: 5 });
        cy.loginAs('admin');
        counterSale({ title, quantity: 1, paidBy: 'Cash' }).then((orderId) => {
            cy.step('the sale was invoiced, with nothing credited yet');
            eventually(
                () => cy.apiAs<TimelineLike>('admin', 'GET', `/orders/${orderId}/timeline`),
                (timeline) => timeline?.items.some(({ type }) => type === 'invoice_issued') ?? false
            ).should((timeline) => {
                expect(timeline?.items.map(({ type }) => type)).to.include('invoice_issued');
            });
            // The first invoice's number, to tell it from the one that replaces it.
            cy.apiAs<TimelineLike>('admin', 'GET', `/orders/${orderId}/timeline`).then(
                (timeline) => {
                    cy.wrap(
                        timeline?.items.find(({ type }) => type === 'invoice_issued')?.data?.number
                    )
                        .should('be.a', 'string')
                        .as('firstInvoice');
                }
            );
            cy.apiAs<{ items: unknown[] }>('admin', 'GET', `/orders/${orderId}/credit-notes`)
                .its('items')
                .should('have.length', 0);
            // What was invoiced, to compare with what the credit note cancels.
            cy.apiAs<OrderLike>('admin', 'GET', `/orders/${orderId}`)
                .its('totalPrice')
                .as('invoiced');

            cy.step('the manager opens the edit page and fills in the buyer to invoice');
            cy.switchUser('manager');
            cy.visit(`/en/orders/${orderId}/edit`);
            cy.get('[data-test=billing-address-form]').within(() => {
                cy.get('[data-test=billing-address-full-name] input').type('Gino Pino');
                cy.get('[data-test=billing-address-street] input').type(STREET);
                cy.get('[data-test=billing-address-city] input').type('Roma');
                cy.get('[data-test=billing-address-zip] input').type('00184');
            });
            // A `v-select` over every country: typing jumps to the match (the list is virtual, so
            // the option is not in the DOM to click), and Escape closes the list.
            cy.get('[data-test=billing-address-country]').click();
            cy.get('[data-test=billing-address-country]').type('Italy{esc}');
            cy.get('[data-test=billing-address-country]').should('contain.text', 'Italy');
            cy.get('[data-test=billing-address-submit]').click();
            cy.get('[data-test=billing-address-error]').should('not.exist');

            cy.step('the order now names the buyer, and its status did not move');
            // The save is not instant: read until the street is the new one.
            eventually(
                () => cy.apiAs<OrderLike>('manager', 'GET', `/orders/${orderId}`),
                (order) => order?.billingAddress?.street === STREET
            ).should((order) => {
                expect(order?.billingAddress?.street).to.equal(STREET);
                expect(order?.status).to.equal('delivered');
            });

            cy.step('the credit note and the new invoice follow, off the request');
            creditNotesOf('manager', orderId).should((notes) => {
                expect(notes?.items).to.have.length(1);
            });
            cy.step('no money moved: the credit note cancels exactly what was invoiced');
            cy.get<string>('@invoiced').then((invoiced) => {
                cy.apiAs<CreditNotesLike>('manager', 'GET', `/orders/${orderId}/credit-notes`)
                    .its('items.0.grandTotal')
                    .should('equal', invoiced);
            });
            eventually(
                () => cy.apiAs<TimelineLike>('manager', 'GET', `/orders/${orderId}/timeline`),
                (timeline) =>
                    timeline?.items.some(({ type }) => type === 'invoice_corrected') ?? false
            ).should((timeline) => {
                const types = timeline?.items.map(({ type }) => type);
                // One row says the whole correction (it names the credit note); the credit note
                // and the new invoice are documents, listed on the order page, not timeline rows.
                expect(types).to.include.members(['billing_corrected', 'invoice_corrected']);
                expect(types?.filter((type) => type === 'invoice_issued')).to.have.length(1);
            });
            // The reissued invoice is a new number from the same series.
            cy.apiAs<TimelineLike>('manager', 'GET', `/orders/${orderId}/timeline`).then(
                (timeline) => {
                    const reissued = timeline?.items.find(
                        ({ type }) => type === 'invoice_corrected'
                    );
                    cy.get<string>('@firstInvoice').then((first) => {
                        expect(reissued?.data?.number).to.be.a('string').and.not.equal(first);
                    });
                    cy.wrap(reissued?.data?.number).as('secondInvoice');
                }
            );

            cy.step(
                'the order page shows the new buyer, the credit note and the correction on the timeline'
            );
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=order-billing-address]').should('contain.text', STREET);
            cy.get('[data-test=order-credit-note-row]')
                .should('have.length', 1)
                .and('contain.text', 'invoice corrected');
            for (const type of ['billing_corrected', 'invoice_corrected'])
                cy.get(`[data-test=order-timeline-entry][data-type=${type}]`).should('exist');
            cy.get('[data-test=order-timeline-entry][data-type=invoice_corrected]').should(
                'contain.text',
                'Cancelled by credit note'
            );

            cy.step('the invoice the page hands out now is the reissued one, not the first');
            // There is no invoice list: the download is the one door, and it serves the live
            // invoice, named by its number. (The street on the PDF itself is the backend's test.)
            cy.intercept('GET', '**/orders/*/invoice').as('invoice');
            cy.get('[data-test=order-download-invoice]').click();
            cy.wait('@invoice').then(({ response }) => {
                expect(response?.statusCode).to.equal(200);
                cy.get<string>('@secondInvoice').then((second) => {
                    cy.get<string>('@firstInvoice').then((first) => {
                        const disposition = String(response?.headers['content-disposition']);
                        expect(disposition).to.contain(`invoice-${second}.pdf`);
                        expect(disposition).to.not.contain(`invoice-${first}.pdf`);
                    });
                });
            });
        });
    });
});
