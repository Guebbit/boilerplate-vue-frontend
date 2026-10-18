// requires-module: account, orders
/**
 * @module
 * AT5 · Orders list filters. Each staff filter narrows the list to rows that really match, and
 * "reset" brings the full list back. Status and deleted are read off the rows themselves; id,
 * email and awaiting-transfer are held to a seeded order that must, or must not, be among them.
 * The payment, fulfilment and return statuses, the created and paid windows, and the product are
 * held the same way: a subject that matches is in, a subject that does not is out.
 */
import { dayShifted, listedIds, resetSearch, submitSearch } from '../../../support/e2e/steps';

/**
 * Applies one filter and asserts which seeded orders the list then holds and lacks.
 *
 * @param apply - fills the filter in
 * @param included - orders that must be listed
 * @param excluded - orders that must not be
 */
const narrowedTo = (apply: () => unknown, included: string[], excluded: string[]): void => {
    apply();
    submitSearch();
    listedIds().should((ids) => {
        for (const id of included) expect(ids, `holds ${id}`).to.include(id);
        for (const id of excluded) expect(ids, `lacks ${id}`).to.not.include(id);
    });
    resetSearch();
};

describe('AT5 · Orders list filters', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.loginAs('admin');
        cy.trackNetwork();
        cy.visit('/en/sales/orders');
        cy.settleNetwork();
    });

    it('status, id, email, awaiting transfer and deleted each narrow the list, and reset restores it', () => {
        cy.subjectId('order.paid').then((paidId) => {
            cy.subjectId('order.awaitingTransfer').then((transferId) => {
                cy.subjectId('order.softDeleted').then((deletedId) => {
                    listedIds().then((all) => {
                        cy.step('status: only paid orders, and the paid subject is among them');
                        cy.pickOption('[data-test=filter-status]', 'Paid');
                        submitSearch();
                        cy.get('[data-test=list-row]').each(($row) => {
                            expect($row.text()).to.contain('Paid');
                        });
                        resetSearch();
                        listedIds().should('deep.equal', all);

                        cy.step('id: exactly that order');
                        cy.get('[data-test=filter-id] input').type(paidId);
                        submitSearch();
                        listedIds().should('deep.equal', [paidId]);
                        resetSearch();

                        cy.step("email: only the orders that address, and not another shopper's");
                        cy.subjectOrder('order.otherPending').then((anotherShoppers) => {
                            cy.get('[data-test=filter-email] input').type(
                                String(anotherShoppers.email)
                            );
                            submitSearch();
                            listedIds().should('include', anotherShoppers.id);
                            listedIds().should('not.include', paidId);
                        });
                        resetSearch();

                        cy.step('awaiting transfer: only unpaid bank-transfer orders');
                        cy.get('[data-test=filter-awaiting-transfer] input').check();
                        submitSearch();
                        listedIds().should('include', transferId);
                        listedIds().should('not.include', paidId);
                        cy.get('[data-test=filter-awaiting-transfer] input').uncheck();
                        resetSearch();

                        cy.step('deleted: only the soft-deleted order, then none of it');
                        cy.pickOption('[data-test=filter-deleted]', 'Deleted only');
                        submitSearch();
                        listedIds().should('deep.equal', [deletedId]);
                        cy.get('[data-test=row-deleted]').should('have.length', 1);
                        cy.pickOption('[data-test=filter-deleted]', 'Not deleted');
                        submitSearch();
                        listedIds().should('not.include', deletedId);
                        cy.get('[data-test=row-deleted]').should('not.exist');
                        resetSearch();
                        listedIds().should('deep.equal', all);
                    });
                });
            });
        });
    });

    it('payment, fulfilment and return status, the created and paid windows and the product each narrow the list', () => {
        cy.subjectId('order.paid').then((paidId) => {
            cy.subjectId('payment.refunded').then((refundedId) => {
                cy.subjectId('order.partiallyFulfilled').then((partialId) => {
                    cy.subjectId('order.onHold').then((heldId) => {
                        cy.subjectId('return.requested').then((returnId) => {
                            cy.subjectId('order.deliveredLongAgo').then((oldId) => {
                                cy.step('payment status: refunded orders only');
                                narrowedTo(
                                    () =>
                                        cy.pickOption(
                                            '[data-test=filter-payment-status]',
                                            'Refunded'
                                        ),
                                    [refundedId],
                                    [paidId]
                                );

                                cy.step('fulfilment status: partly shipped, then on hold');
                                narrowedTo(
                                    () =>
                                        cy.pickOption(
                                            '[data-test=filter-fulfillment-status]',
                                            'Partly shipped'
                                        ),
                                    [partialId],
                                    [heldId, paidId]
                                );
                                narrowedTo(
                                    () =>
                                        cy.pickOption(
                                            '[data-test=filter-fulfillment-status]',
                                            'On hold'
                                        ),
                                    [heldId],
                                    [partialId, paidId]
                                );

                                cy.step('return status: a requested return');
                                // The subject is a return; the list holds its order.
                                cy.apiAs<{ orderId: string }>(
                                    'admin',
                                    'GET',
                                    `/returns/${returnId}`
                                ).then((request) => {
                                    narrowedTo(
                                        () =>
                                            cy.pickOption(
                                                '[data-test=filter-return-status]',
                                                'Requested'
                                            ),
                                        [request?.orderId ?? ''],
                                        [paidId]
                                    );
                                });

                                cy.step('created window: around the old order, not today’s');
                                cy.apiAs<{ createdAt: string; paidAt?: string }>(
                                    'admin',
                                    'GET',
                                    `/orders/${oldId}`
                                ).then((old) => {
                                    const created = old?.createdAt ?? '';
                                    narrowedTo(
                                        () => {
                                            cy.get('[data-test=filter-created-from] input').type(
                                                dayShifted(created, -1)
                                            );
                                            cy.get('[data-test=filter-created-to] input').type(
                                                dayShifted(created, 1)
                                            );
                                        },
                                        [oldId],
                                        [paidId]
                                    );

                                    cy.step(
                                        'paid window: a future window holds nothing, one around the payment holds rows'
                                    );
                                    const now = new Date().toISOString();
                                    cy.get('[data-test=filter-paid-from] input').type(
                                        dayShifted(now, 2)
                                    );
                                    cy.get('[data-test=filter-paid-to] input').type(
                                        dayShifted(now, 3)
                                    );
                                    submitSearch();
                                    cy.get('[data-test=list-row]').should('not.exist');
                                    resetSearch();
                                    const paid = old?.paidAt ?? created;
                                    cy.get('[data-test=filter-paid-from] input').type(
                                        dayShifted(paid, -1)
                                    );
                                    cy.get('[data-test=filter-paid-to] input').type(
                                        dayShifted(paid, 1)
                                    );
                                    submitSearch();
                                    cy.get('[data-test=list-row]').should(
                                        'have.length.greaterThan',
                                        0
                                    );
                                    resetSearch();
                                });

                                cy.step(
                                    'product: the filler line of a two-line order lists that order, each confirmed by the API'
                                );
                                cy.subjectId('order.deliveredTwoLines').then((twoLinesId) => {
                                    cy.apiAs<{ items: { product: { id: string } }[] }>(
                                        'admin',
                                        'GET',
                                        `/orders/${twoLinesId}`
                                    ).then((order) => {
                                        const productId = order?.items[1]?.product.id ?? '';
                                        cy.get('[data-test=filter-product-id] input').type(
                                            productId
                                        );
                                        submitSearch();
                                        listedIds().then((ids) => {
                                            expect(ids).to.include(twoLinesId);
                                            expect(ids).to.not.include(paidId);
                                            for (const id of ids)
                                                cy.apiAs<{
                                                    items: { product: { id: string } }[];
                                                }>('admin', 'GET', `/orders/${id}`).should(
                                                    (listed) => {
                                                        expect(
                                                            listed?.items.map(
                                                                (item) => item.product.id
                                                            ),
                                                            `order ${id} holds the product`
                                                        ).to.include(productId);
                                                    }
                                                );
                                        });
                                        resetSearch();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    it('the pager moves through the list without repeating a row, and a larger page shows more', () => {
        listedIds().then((first) => {
            expect(first, 'the seed holds more than one page of orders').to.have.length(10);
            cy.get('[data-test=pagination]').contains('button', '2').click();
            cy.settleNetwork();
            listedIds().should((second) => {
                expect(second).to.have.length.greaterThan(0);
                expect(second.filter((id) => first.includes(id))).to.have.length(0);
            });
            cy.pickOption('[data-test=page-size]', '50');
            cy.settleNetwork();
            listedIds().should('have.length.greaterThan', first.length);
        });
    });
});
