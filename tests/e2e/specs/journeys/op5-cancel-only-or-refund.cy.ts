// requires-module: account, inventory, orders, payments, products
/**
 * @module
 * OP5 · Cancel only, versus cancel and refund. An operator has two different things to say about a
 * paid order: "this is off" and "give the money back". They are three buttons because they are
 * not the same act.
 *
 * - Cancel only: the order is cancelled and the units return to the shelf, but the money stays
 *   captured. Refund only is still open afterwards, and later settles the payment.
 * - Cancel and refund: both happen in one press, and a credit note is issued for the money.
 *
 * Two seeded paid orders, one for each branch. Stock is read as the admin sees it, off the API,
 * beside the shelf before and after.
 */
import { eventually } from '../../../support/e2e/steps';

/** The slice of a payment this story reads: where the money stands. */
interface PaymentLike {
    status: string;
    amount: number;
    amountRefunded: number;
}

/** The slice of an order this story reads: where it stands, and what it holds. */
interface OrderLike {
    status: string;
    items: { quantity: number }[];
}

/** A credit note, as far as this story cares: that it is listed. */
interface CreditNoteLike {
    grandTotal: number;
}

/** The units a product has available, as the admin reads it. */
interface ProductLike {
    available: number;
}

/**
 * How many units an order holds, summed over its lines.
 *
 * @param order - the order as the API serves it
 */
const unitsIn = (order: OrderLike | null): number =>
    (order?.items ?? []).reduce((sum, { quantity }) => sum + quantity, 0);

describe('OP5 · Cancel only versus cancel and refund', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('cancel only keeps the money until refund only; cancel and refund does both at once', () => {
        cy.subjectId('order.paid').then((keptId) => {
            cy.subjectId('order.paidExpress').then((refundedId) => {
                cy.subjectId('product.rich').then((productId) => {
                    const shelf = { before: 0, units: 0 };
                    cy.loginAs('admin');
                    cy.apiAs<ProductLike>('admin', 'GET', `/products/${productId}`).then(
                        (product) => {
                            shelf.before = Number(product?.available);
                        }
                    );
                    cy.apiAs<OrderLike>('admin', 'GET', `/orders/${keptId}`).then((order) => {
                        shelf.units += unitsIn(order);
                    });
                    cy.apiAs<OrderLike>('admin', 'GET', `/orders/${refundedId}`).then((order) => {
                        shelf.units += unitsIn(order);
                    });

                    cy.step('cancel only: the order is cancelled, the payment is still captured');
                    cy.visit(`/en/orders/${keptId}/edit`);
                    cy.get('[data-test=button-cancel-only]').should('not.be.disabled').click();
                    cy.get('[data-test=button-cancel-only]').should('be.disabled');
                    cy.get('[data-test=order-edit-actions-error]').should('not.exist');
                    cy.apiAs<OrderLike>('admin', 'GET', `/orders/${keptId}`).should((order) => {
                        expect(order?.status).to.equal('cancelled');
                    });
                    cy.apiAs<PaymentLike>('admin', 'GET', `/payments/order/${keptId}`).should(
                        (payment) => {
                            expect(payment?.status, 'the money was not touched').to.equal(
                                'succeeded'
                            );
                            expect(payment?.amountRefunded).to.equal(0);
                        }
                    );
                    cy.get('[data-test=button-cancel-and-refund]').should('be.disabled');

                    cy.step('refund only still works afterwards, and settles the payment');
                    cy.get('[data-test=button-refund-only]').should('not.be.disabled').click();
                    cy.get('[data-test=button-refund-only]').should('be.disabled');
                    cy.apiAs<PaymentLike>('admin', 'GET', `/payments/order/${keptId}`).should(
                        (payment) => {
                            expect(payment?.status).to.equal('refunded');
                            expect(payment?.amountRefunded).to.equal(payment?.amount);
                        }
                    );

                    cy.step('cancel and refund: one press does both');
                    cy.visit(`/en/orders/${refundedId}/edit`);
                    cy.get('[data-test=button-cancel-and-refund]')
                        .should('not.be.disabled')
                        .click();
                    cy.get('[data-test=button-cancel-and-refund]').should('be.disabled');
                    cy.get('[data-test=order-edit-actions-error]').should('not.exist');
                    cy.apiAs<OrderLike>('admin', 'GET', `/orders/${refundedId}`).should((order) => {
                        expect(order?.status).to.equal('cancelled');
                    });
                    eventually(
                        () =>
                            cy.apiAs<PaymentLike>('admin', 'GET', `/payments/order/${refundedId}`),
                        (payment) => payment?.status === 'refunded'
                    ).should((payment) => {
                        expect(payment?.status).to.equal('refunded');
                        expect(payment?.amountRefunded).to.equal(payment?.amount);
                    });

                    cy.step('a credit note is issued for each refund');
                    for (const orderId of [keptId, refundedId])
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

                    cy.step('both cancellations put their units back on the shelf');
                    cy.apiAs<ProductLike>('admin', 'GET', `/products/${productId}`).should(
                        (product) => {
                            expect(Number(product?.available)).to.equal(shelf.before + shelf.units);
                        }
                    );
                });
            });
        });
    });
});
