// requires-module: account, orders, payments
/**
 * @module
 * AT5 · Payments and refunds filters. Every filter on the payments page narrows the list to rows
 * that really match: method, provider, order id, reference, amount, and the created and received
 * windows on the payments tab; status, reason, order id and the created window on the refunds tab.
 * Each is held to a seeded subject that must be listed, and a window that holds nothing must empty
 * the list. The order a row belongs to is read off its link, since the row shows the order number.
 */

import { dayShifted } from '../../../support/e2e/steps';

/** The slice of a payment the filters are checked against. */
interface PaymentLike {
    provider?: string;
    method?: string;
    reference?: string;
    amount: number;
    createdAt: string;
    receivedAt?: string;
}

/**
 * The orders the payments or refunds list holds, read off each row's order link.
 *
 * @param link - the `data-test` of the order link in the row
 * @returns a chain yielding the order ids, in list order
 */
const listedOrders = (link: string): Cypress.Chainable<string[]> =>
    cy
        .get(`[data-test=${link}]`)
        .then(($links) =>
            $links
                .toArray()
                .map((anchor) => (anchor.getAttribute('href') ?? '').split('/orders/')[1] ?? '')
        );

/**
 * Applies one filter and asserts the orders the payments list then holds and lacks.
 *
 * @param apply - fills the filter in
 * @param included - orders that must be listed
 * @param excluded - orders that must not be
 */
const narrowedTo = (apply: () => unknown, included: string[], excluded: string[]): void => {
    apply();
    cy.get('[data-test=payments-search-submit]').click();
    listedOrders('payment-order-link').should((orders) => {
        for (const id of included) expect(orders, `holds ${id}`).to.include(id);
        for (const id of excluded) expect(orders, `lacks ${id}`).to.not.include(id);
    });
    cy.get('[data-test=payments-search-reset]').click();
};

describe('AT5 · Payments and refunds filters', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.loginAs('admin');
        cy.visit('/en/sales/payments');
        cy.get('[data-test=payments-all]').should('be.visible');
    });

    it('method, provider, order, reference, amount and the two windows each narrow the payments', () => {
        cy.subjectId('order.paidOffline').then((cashId) => {
            cy.subjectId('order.paid').then((cardId) => {
                cy.apiAs<PaymentLike>('admin', 'GET', `/payments/order/${cashId}`).then((cash) => {
                    cy.apiAs<PaymentLike>('admin', 'GET', `/payments/order/${cardId}`).then(
                        (card) => {
                            if (!cash || !card)
                                throw new Error('AT5: a seeded order has no payment');

                            cy.step('method: cash lists the cash payment and not the card one');
                            narrowedTo(
                                () => cy.pickOption('[data-test=filter-method]', /cash/i),
                                [cashId],
                                [cardId]
                            );

                            cy.step(
                                'provider: only payments of that provider, and none for an unknown one'
                            );
                            cy.get('[data-test=filter-provider] input').type(card.provider ?? '');
                            cy.get('[data-test=payments-search-submit]').click();
                            cy.get('[data-test=payment-row]').should('have.length.greaterThan', 0);
                            cy.get('[data-test=payment-row]').each(($row) => {
                                expect($row.text()).to.contain(card.provider);
                            });
                            cy.get('[data-test=payments-search-reset]').click();
                            cy.get('[data-test=filter-provider] input').type('no-such-provider');
                            cy.get('[data-test=payments-search-submit]').click();
                            cy.get('[data-test=payment-row]').should('not.exist');
                            cy.get('[data-test=payments-search-reset]').click();

                            cy.step('order id: exactly that order');
                            narrowedTo(
                                () => cy.get('[data-test=filter-order-id] input').type(cashId),
                                [cashId],
                                [cardId]
                            );

                            cy.step('reference: only the payment that carries it');
                            const reference = card.reference ?? cash.reference;
                            if (reference)
                                narrowedTo(
                                    () =>
                                        cy
                                            .get('[data-test=filter-reference] input')
                                            .type(reference),
                                    [reference === card.reference ? cardId : cashId],
                                    []
                                );

                            cy.step('amount: a range around the card payment');
                            narrowedTo(
                                () => {
                                    cy.get('[data-test=filter-amount-min] input').type(
                                        String(card.amount)
                                    );
                                    cy.get('[data-test=filter-amount-max] input').type(
                                        String(card.amount)
                                    );
                                },
                                [cardId],
                                card.amount === cash.amount ? [] : [cashId]
                            );

                            cy.step(
                                'created window: around the card payment, then a window with none'
                            );
                            narrowedTo(
                                () => {
                                    cy.get('[data-test=filter-created-from] input').type(
                                        dayShifted(card.createdAt, -1)
                                    );
                                    cy.get('[data-test=filter-created-to] input').type(
                                        dayShifted(card.createdAt, 1)
                                    );
                                },
                                [cardId],
                                []
                            );
                            cy.get('[data-test=filter-created-to] input').type('2000-01-01');
                            cy.get('[data-test=payments-search-submit]').click();
                            cy.get('[data-test=payment-row]').should('not.exist');
                            cy.get('[data-test=payments-search-reset]').click();

                            cy.step('received window: around the cash payment');
                            narrowedTo(
                                () => {
                                    cy.get('[data-test=filter-received-from] input').type(
                                        dayShifted(cash.receivedAt ?? cash.createdAt, -1)
                                    );
                                    cy.get('[data-test=filter-received-to] input').type(
                                        dayShifted(cash.receivedAt ?? cash.createdAt, 1)
                                    );
                                },
                                [cashId],
                                []
                            );
                        }
                    );
                });
            });
        });
    });

    it('status, reason, order and the created window each narrow the refunds', () => {
        cy.subjectId('payment.refunded').then((refundedId) => {
            cy.get('[data-test=payments-tab-refunds]').click();
            cy.get('[data-test=payments-refunds]').should('be.visible');

            cy.step('status: succeeded refunds only, and the refunded order is among them');
            cy.pickOption('[data-test=refund-filter-status]', 'Succeeded');
            cy.get('[data-test=refunds-search-submit]').click();
            listedOrders('refund-order-link').should('include', refundedId);
            cy.get('[data-test=refunds-search-reset]').click();

            cy.step('reason: a cancellation refund lists the cancelled order');
            cy.pickOption('[data-test=refund-filter-reason]', 'Cancellation');
            cy.get('[data-test=refunds-search-submit]').click();
            listedOrders('refund-order-link').should('include', refundedId);
            cy.pickOption('[data-test=refund-filter-reason]', 'Goodwill');
            cy.get('[data-test=refunds-search-submit]').click();
            cy.get('[data-test=refund-row]').should('not.exist');
            cy.get('[data-test=refunds-search-reset]').click();

            cy.step('order id: exactly that order’s refunds');
            cy.get('[data-test=refund-filter-order-id] input').type(refundedId);
            cy.get('[data-test=refunds-search-submit]').click();
            listedOrders('refund-order-link').should('deep.equal', [refundedId]);
            cy.get('[data-test=refunds-search-reset]').click();

            cy.step('created window: a window that holds nothing empties the list');
            cy.get('[data-test=refund-filter-created-to] input').type('2000-01-01');
            cy.get('[data-test=refunds-search-submit]').click();
            cy.get('[data-test=refund-row]').should('not.exist');
        });
    });
});
