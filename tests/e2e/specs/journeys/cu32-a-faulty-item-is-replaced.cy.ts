// requires-module: account, delivery, inventory, orders, payments, returns
/**
 * @module
 * CU32 · A faulty item is replaced. The customer's delivered order has a broken bowl. They open a
 * return for the defect and say they would like a replacement; support approves; the warehouse
 * receives it with the buyer's wish preselected. No money moves, the order is open for fulfilment
 * again on the SAME order, and the replacement ships through the ordinary door and arrives.
 *
 * Money and status are read off the API, never summed on the page.
 */
import { eventually, orderMailTo, paymentOfOrder } from '../../../support/e2e/steps';

/** The slice of an order this story reads. */
interface OrderLike {
    status: string;
    items: { product: { id: string }; quantity: number }[];
}

/** The slice of a payment this story reads. */
interface PaymentLike {
    amountRefunded: number;
}

/** The slice of a return this story reads. */
interface ReturnLike {
    id: string;
    status: string;
    preferredRemedy?: string;
    remedy?: string;
    refundAmount?: number;
}

describe('CU32 · A faulty item is replaced', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('asks for a replacement, receives it with no money moving, and ships it on the same order', () => {
        cy.subjectId('order.deliveredTwoLines').then((orderId) => {
            cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`).then((order) => {
                const line = order?.items[0];
                const productId = line?.product.id ?? '';

                cy.step('the customer picks a line, a defect, and a replacement');
                cy.loginAs('user');
                cy.visit(`/en/orders/${orderId}`);
                cy.get('[data-test=return-request-open]').click();
                cy.get(`[data-test=return-line-pick-${productId}] input`).check({ force: true });
                cy.get('[data-test=return-remedy]').should('not.exist');
                cy.pickOption('[data-test=return-reason]', 'Defective goods');
                cy.get('[data-test=return-remedy]').should(
                    'contain.text',
                    'extends your guarantee by 12 months'
                );
                cy.get('[data-test=return-remedy-replace] input').check({ force: true });
                cy.get('[data-test=return-request-submit]').click();
                cy.get('[data-test=order-return]').should('have.length', 1);

                cy.apiAs<{ items: ReturnLike[] }>(
                    'user',
                    'GET',
                    `/returns?orderId=${orderId}`
                ).then((page) => {
                    const [opened] = page?.items ?? [];
                    expect(opened?.preferredRemedy).to.equal('replace');
                    const returnId = opened?.id;

                    cy.step('support approves; the warehouse sees the wish preselected');
                    cy.switchUser('support');
                    cy.apiAs('support', 'POST', `/returns/${returnId}/approve`);
                    cy.switchUser('warehouse');
                    cy.visit(`/en/returns/${returnId}`);
                    cy.get('[data-test=return-preferred-remedy]').should(
                        'contain.text',
                        'Replace it'
                    );
                    cy.get('[data-test=return-receive-deduction]').should('not.exist');
                    cy.get('[data-test=return-receive-remedy-replace] input').should('be.checked');
                    cy.get('[data-test=return-receive]').click();
                    cy.get('[data-test=return-receive-form]').should('not.exist');
                    cy.get('[data-test=return-remedy]').should('contain.text', 'Replace it');

                    cy.step(
                        'the return is closed with no money moving, and the order is open again'
                    );
                    cy.apiAs<ReturnLike>('warehouse', 'GET', `/returns/${returnId}`).should(
                        (closed) => {
                            expect(closed?.status).to.equal('closed');
                            expect(closed?.remedy).to.equal('replace');
                            expect(closed?.refundAmount).to.equal(0);
                        }
                    );
                    paymentOfOrder<PaymentLike>('admin', orderId).then((payment) =>
                        expect(Number(payment?.amountRefunded)).to.equal(0)
                    );
                    cy.apiAs<OrderLike>('admin', 'GET', `/orders/${orderId}`).should((reopened) =>
                        expect(reopened?.status).to.equal('processing')
                    );
                    orderMailTo('user', orderId, 'Your replacement is on its way');

                    cy.step('the replacement ships through the ordinary door and arrives');
                    cy.apiAs<{ items: { id: string; status: string }[] }>(
                        'admin',
                        'GET',
                        `/orders/${orderId}/fulfillment-orders`
                    ).then((plan) => {
                        // The order has a second line that already shipped, so the reopened order reads in progress.
                        const open = plan?.items.find(
                            ({ status }) => status === 'open' || status === 'in_progress'
                        );
                        expect(open?.id, 'the reopened fulfillment order can ship').to.be.a(
                            'string'
                        );
                        cy.apiAs(
                            'admin',
                            'POST',
                            `/delivery/fulfillment-orders/${open?.id ?? ''}/shipments`,
                            { trackingCode: 'TRK-CU32-A' }
                        );
                    });
                    cy.apiAs<{ items: { id: string; status: string }[] }>(
                        'admin',
                        'GET',
                        `/orders/${orderId}/shipments`
                    ).then((shipments) => {
                        const out = shipments?.items.find(({ status }) => status === 'shipped');
                        cy.apiAs(
                            'admin',
                            'POST',
                            `/delivery/shipments/${out?.id ?? ''}/deliver`,
                            {}
                        );
                    });
                    eventually(
                        () => cy.apiAs<OrderLike>('admin', 'GET', `/orders/${orderId}`),
                        (arrived) => arrived?.status === 'delivered'
                    ).should((arrived) => expect(arrived?.status).to.equal('delivered'));

                    cy.step('the replaced unit can be returned again under the guarantee');
                    cy.switchUser('user');
                    cy.visit(`/en/orders/${orderId}`);
                    cy.get('[data-test=return-request-open]').should('exist');
                });
            });
        });
    });
});
