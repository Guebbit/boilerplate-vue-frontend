// requires-module: account, inventory, orders, payments, products
/**
 * @module
 * CU11 · I cancel a paid order and get my money back. A customer cancels an order that is paid and
 * not yet dispatched. The cancellation asks once, and then three things follow from it: the card is
 * refunded whole, the units go back on the shelf, and a credit note is issued against the invoice.
 *
 * There is no cancellation mail to assert: a customer's own cancel sends none (only the system's
 * expiries do — `orders/services/cancel.ts`). The order is the seeded `order.paid`, so the story
 * spends no card budget; paying is N1's and CU1's business.
 */
import { cents, eventually } from '../../../support/e2e/steps';

/** The slice of a payment this story reads: where the money stands. */
interface PaymentLike {
    status: string;
    amount: number;
    amountRefunded: number;
}

/** The slice of an order this story reads: what it holds, and where it stands. */
interface OrderLike {
    status: string;
    items: { quantity: number }[];
}

/** A credit note, as far as this story cares: that it is listed. */
interface CreditNoteLike {
    grandTotal: number;
}

/**
 * The units the product page says are available, read once the page has loaded them — the card
 * renders a dash until the product arrives.
 */
const unitsShown = (): Cypress.Chainable<number> =>
    cy
        .get('[data-test=product-stock]')
        .should(($stock) => {
            expect($stock.text()).to.match(/\d/);
        })
        .invoke('text')
        .then(cents);

describe('CU11 · I cancel a paid order and get my money back', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('refunds the card whole, returns the units to the shelf and issues a credit note', () => {
        cy.subjectId('order.paid').then((orderId) => {
            cy.subjectId('product.rich').then((productId) => {
                cy.step('the customer reads the shelf and the paid order');
                cy.loginAs('user');
                cy.visit(`/en/products/${productId}`);
                const shelf = { before: 0, units: 0 };
                unitsShown().then((units) => {
                    shelf.before = units;
                });
                cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`).then((order) => {
                    expect(order?.status).to.equal('paid');
                    shelf.units = (order?.items ?? []).reduce(
                        (sum, { quantity }) => sum + quantity,
                        0
                    );
                });
                cy.visit(`/en/orders/${orderId}`);
                cy.get('[data-test=payment-status]').should('exist');
                cy.get('[data-test=order-credit-note-row]').should('not.exist');

                cy.step('the cancel asks once; declining it changes nothing');
                cy.get('[data-test=order-cancel]').click();
                cy.get('[data-test=app-dialog-cancel]').click();
                cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`).should((order) => {
                    expect(order?.status).to.equal('paid');
                });

                cy.step('confirming cancels the order');
                cy.get('[data-test=order-cancel]').click();
                cy.get('[data-test=app-dialog-confirm]').click();
                cy.get('[data-test=order-cancel]').should('not.exist');
                cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`).should((order) => {
                    expect(order?.status).to.equal('cancelled');
                });

                cy.step('the whole payment goes back to the card');
                // The refund is the payments module answering the cancel, so it may land a beat later.
                eventually(
                    () => cy.apiAs<PaymentLike>('user', 'GET', `/payments/order/${orderId}`),
                    (payment) => payment?.status === 'refunded'
                ).should((payment) => {
                    expect(payment?.status).to.equal('refunded');
                    expect(payment?.amountRefunded).to.equal(payment?.amount);
                });
                cy.reload();
                cy.get('[data-test=payment-status]').should('contain.text', 'Refunded');

                cy.step('the units are back on the shelf');
                cy.visit(`/en/products/${productId}`);
                cy.get('[data-test=product-stock]').should(($stock) => {
                    expect(cents($stock.text())).to.equal(shelf.before + shelf.units);
                });

                cy.step('a credit note is issued, and the order page lists it');
                // Written after the refund, off the request's path, so the page is read until it is there.
                eventually(
                    () =>
                        cy.apiAs<CreditNoteLike[]>(
                            'user',
                            'GET',
                            `/orders/${orderId}/credit-notes`
                        ),
                    (notes) => (notes?.length ?? 0) > 0
                ).should((notes) => {
                    expect(notes).to.have.length(1);
                });
                cy.visit(`/en/orders/${orderId}`);
                cy.get('[data-test=order-credit-note-row]').should('have.length', 1);
                cy.get('[data-test=order-download-credit-note]').should('not.be.disabled');
            });
        });
    });
});
