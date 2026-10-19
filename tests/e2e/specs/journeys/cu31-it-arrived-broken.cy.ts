// requires-module: account, delivery, inventory, orders, payments, returns
/**
 * @module
 * CU31 · It arrived broken. The customer's order of two lines was delivered today. They send part
 * of one line back as defective through the "Return goods" form, support approves, the warehouse
 * receives it, and the money goes back. Then the rest comes back as the wrong item.
 *
 * The story is about the form refusing what it should and the money rule a part-return exists to
 * test: shipping goes back only with the return that takes the LAST unit, and in full when the
 * goods were faulty or not what was ordered. Money is compared in cents against what the API says
 * the order cost, never a sum made on the page.
 */
import { centsOf, eventually, orderMailTo } from '../../../support/e2e/steps';

/** What the warehouse keeps back for handling on the first return, in cents. */
const DEDUCTION_CENTS = 100;

/** The slice of an order this story reads. */
interface OrderLike {
    items: { product: { id: string; price: number }; quantity: number }[];
}

/** The slice of a payment this story reads. */
interface PaymentLike {
    amount: number;
    amountRefunded: number;
    displayStatus: string;
}

/** The slice of a return this story reads. */
interface ReturnLike {
    id: string;
    status: string;
    reason: string;
    lines: { productId: string; quantity: number }[];
}

/** The slice of the options read this story compares the form with. */
interface OptionsLike {
    returnable: { productId: string; quantity: number }[];
}

/**
 * The money in cents, from the decimal the API writes.
 *
 * @param amount - a decimal amount
 */
const inCents = (amount: number): number => Math.round(amount * 100);

describe('CU31 · It arrived broken', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the form refuses what it should, a part-return refunds no shipping, and the last unit takes it all', () => {
        cy.subjectId('order.deliveredTwoLines').then((orderId) => {
            cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`).then((order) => {
                const [lineA, lineB] = order?.items ?? [];
                expect(lineA?.quantity, 'the first line holds two units').to.equal(2);
                expect(lineB?.quantity, 'the second line holds one unit').to.equal(1);
                const a = {
                    id: lineA?.product.id,
                    cents: inCents(lineA?.product.price)
                };
                const b = {
                    id: lineB?.product.id,
                    cents: inCents(lineB?.product.price)
                };

                cy.step('the customer opens the delivered order: the return form is offered');
                cy.loginAs('user');
                cy.visit(`/en/orders/${orderId}`);
                cy.get('[data-test=withdrawal-panel]').should('exist');
                cy.get('[data-test=return-request-open]').should('contain.text', 'Return goods');

                cy.step('submitting it empty is refused on the page, and nothing is sent');
                cy.intercept('POST', '**/returns').as('openReturn');
                cy.get('[data-test=return-request-open]').click();
                cy.get('[data-test=return-request-submit]').click();
                cy.get('[data-test=return-lines-error]').should(
                    'contain.text',
                    'Pick at least one item to send back'
                );
                cy.get('[data-test=return-request-form]').should('contain.text', 'Choose a reason');

                cy.step('a quantity past what can still come back is refused too');
                cy.get(`[data-test=return-line-pick-${a.id}] input`).check({ force: true });
                cy.get(`[data-test=return-line-quantity-${a.id}] input`)
                    .should('have.value', '2')
                    .clear();
                cy.get(`[data-test=return-line-quantity-${a.id}] input`).type('3');
                cy.pickOption('[data-test=return-reason]', 'Defective goods');
                cy.get('[data-test=return-request-submit]').click();
                cy.get('[data-test=return-request-form]').should(
                    'contain.text',
                    'Enter a whole quantity, from 1 up to what you can still return'
                );
                cy.get('@openReturn.all').should('have.length', 0);

                cy.step('one unit, a note, a double click: exactly one request goes out');
                cy.get(`[data-test=return-line-quantity-${a.id}] input`).clear();
                cy.get(`[data-test=return-line-quantity-${a.id}] input`).type('1');
                cy.get('[data-test=return-note] textarea').type('The bowl arrived cracked.');
                cy.get('[data-test=return-request-submit]').dblclick();
                cy.wait('@openReturn').its('response.statusCode').should('equal', 201);
                cy.get('@openReturn.all').should('have.length', 1);
                cy.get('[data-test=order-return]').should('have.length', 1);
                cy.apiAs<{ items: ReturnLike[] }>(
                    'user',
                    'GET',
                    `/returns?orderId=${orderId}`
                ).then((page) => {
                    expect(page?.items).to.have.length(1);
                    const [opened] = page?.items ?? [];
                    expect(opened).to.include({ status: 'requested', reason: 'defective' });
                    expect(
                        opened?.lines.map(({ productId, quantity }) => ({ productId, quantity }))
                    ).to.deep.equal([{ productId: a.id, quantity: 1 }]);

                    const firstId = opened?.id;
                    cy.step('the customer is mailed that it was received');
                    orderMailTo('user', orderId, 'We received your return request');

                    cy.step('what already comes back is not offered again');
                    cy.apiAs<OptionsLike>(
                        'user',
                        'GET',
                        `/returns/options?orderId=${orderId}`
                    ).should((options) => {
                        const quantities = Object.fromEntries(
                            (options?.returnable ?? []).map((line) => [
                                line.productId,
                                line.quantity
                            ])
                        );
                        expect(quantities).to.deep.equal({ [a.id]: 1, [b.id]: 1 });
                    });
                    cy.reload();
                    cy.get('[data-test=return-request-open]').click();
                    cy.get(`[data-test=return-line-pick-${a.id}] input`).check({ force: true });
                    cy.get(`[data-test=return-line-quantity-${a.id}]`).should(
                        'contain.text',
                        'Quantity (up to 1)'
                    );

                    cy.step('support approves it; receiving is not hers');
                    cy.switchUser('support');
                    cy.visit(`/en/returns/${firstId}`);
                    cy.get('[data-test=return-receive-form]').should('not.exist');
                    cy.get('[data-test=return-approve]').click();
                    cy.get('[data-test=return-approve]').should('not.exist');
                    cy.apiAs<ReturnLike>('support', 'GET', `/returns/${firstId}`).should(
                        (approved) => expect(approved?.status).to.equal('approved')
                    );
                    orderMailTo('user', orderId, 'Your return was approved');

                    cy.step('support reading the same order is not offered the customer’s form');
                    cy.visit(`/en/orders/${orderId}`);
                    cy.get('#order-target').should('exist');
                    cy.get('[data-test=return-request-open]').should('not.exist');

                    cy.step(
                        'the warehouse receives it with a deduction: the goods only, no shipping'
                    );
                    cy.switchUser('warehouse');
                    cy.visit(`/en/returns/${firstId}`);
                    cy.get('[data-test=return-receive-deduction] input').type(
                        (DEDUCTION_CENTS / 100).toFixed(2)
                    );
                    cy.get('[data-test=return-receive]').click();
                    cy.get('[data-test=return-receive-form]').should('not.exist');
                    centsOf('[data-test=return-refund]').should((refund) => {
                        expect(refund, 'one unit less the deduction, no shipping').to.equal(
                            a.cents - DEDUCTION_CENTS
                        );
                    });
                    cy.visit('/en/inventory');
                    cy.get(`[data-test=movement-row]:has(a[href$="/orders/${orderId}"])`)
                        .find('[data-test=movement-reason]')
                        .should('contain.text', 'Restock');

                    cy.step('the money, the credit note and the mail follow');
                    eventually(
                        () => cy.apiAs<PaymentLike>('admin', 'GET', `/payments/order/${orderId}`),
                        (payment) => inCents(Number(payment?.amountRefunded)) > 0
                    ).should((payment) => {
                        expect(inCents(Number(payment?.amountRefunded))).to.equal(
                            a.cents - DEDUCTION_CENTS
                        );
                        expect(payment?.displayStatus).to.equal('partially_refunded');
                    });
                    eventually(
                        () => cy.apiAs<unknown[]>('user', 'GET', `/orders/${orderId}/credit-notes`),
                        (notes) => (notes?.length ?? 0) > 0
                    ).should((notes) => expect(notes).to.have.length(1));
                    orderMailTo('user', orderId, 'Your return was refunded');
                    cy.switchUser('user');
                    cy.visit(`/en/orders/${orderId}`);
                    cy.get('[data-test=payment-partially-refunded]').should('exist');
                    cy.get('[data-test=order-credit-note-row]').should('have.length', 1);
                    cy.visit(`/en/returns/${firstId}`);
                    cy.get('[data-test=return-refund]').should('exist');

                    cy.step(
                        'the rest comes back as the wrong item: the last unit takes all the shipping'
                    );
                    cy.apiAs('user', 'POST', '/returns', {
                        orderId,
                        reason: 'wrong_item',
                        lines: [
                            { productId: a.id, quantity: 1 },
                            { productId: b.id, quantity: 1 }
                        ]
                    });
                    cy.apiAs<{ items: ReturnLike[] }>(
                        'user',
                        'GET',
                        `/returns?orderId=${orderId}`
                    ).then((both) => {
                        const second = both?.items.find(({ id }) => id !== firstId);
                        expect(second?.reason).to.equal('wrong_item');
                        cy.apiAs('support', 'POST', `/returns/${second?.id}/approve`);
                        cy.apiAs('warehouse', 'POST', `/returns/${second?.id}/receive`, {});
                    });
                    cy.apiAs<PaymentLike>('admin', 'GET', `/payments/order/${orderId}`).then(
                        (before) => {
                            const paid = inCents(Number(before?.amount));
                            eventually(
                                () =>
                                    cy.apiAs<PaymentLike>(
                                        'admin',
                                        'GET',
                                        `/payments/order/${orderId}`
                                    ),
                                (payment) =>
                                    inCents(Number(payment?.amountRefunded)) >
                                    a.cents - DEDUCTION_CENTS
                            ).should((payment) => {
                                expect(
                                    inCents(Number(payment?.amountRefunded)),
                                    'everything paid comes back but the deduction, shipping included'
                                ).to.equal(paid - DEDUCTION_CENTS);
                                expect(payment?.displayStatus).to.not.equal('refunded');
                            });
                        }
                    );

                    cy.step('nothing is left to send back');
                    cy.switchUser('user');
                    cy.visit(`/en/orders/${orderId}`);
                    cy.get('[data-test=order-return]').should('have.length', 2);
                    cy.get('[data-test=return-request-open]').should('not.exist');
                });
            });
        });
    });
});
