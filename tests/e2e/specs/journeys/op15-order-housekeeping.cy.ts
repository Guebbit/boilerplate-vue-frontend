// requires-module: account, inventory, orders, products
/**
 * @module
 * OP15 · Order housekeeping. A shop manager soft-deletes a cancelled order (an open one offers no
 * delete: it is cancelled first): it stays on the staff list, marked deleted, and vanishes from its
 * customer. Restoring brings it back. A hard delete is
 * offered only on a cancelled, never-paid order: an open order must be cancelled first (which
 * returns its held units to the shelf), and a PAID order never shows the action, because an
 * invoice was frozen from its payment (BE `orders/services/remove.ts`).
 *
 * The manager holds `delete:Order`; the moderator does not, since removing a customer's
 * order is a shop-running act and not a conduct one. Rows are found by their
 * own link — `?id=` on the list is a deep link — so no id is typed into a search box.
 */
import { eventually } from '../../../support/e2e/steps';

/** What a customer's order search answers with. */
interface OrderSearchLike {
    items: { id: string }[];
}

/** The units a product has available, as the admin reads it. */
interface ProductLike {
    available: number;
}

/**
 * The slice of the order list the customer sees for one order: empty when it is hidden.
 *
 * @param orderId - the order
 */
const customerListing = (orderId: string): Cypress.Chainable<string[]> =>
    cy
        .apiAs<OrderSearchLike>('user', 'POST', '/orders/search', { id: [orderId] })
        .then((found) => (found?.items ?? []).map(({ id }) => id));

/**
 * Opens the staff list narrowed to one order, and yields that order's row.
 *
 * @param orderId - the order
 */
const rowOf = (orderId: string): Cypress.Chainable<JQuery> => {
    cy.visit(`/en/sales/orders?id=${orderId}`);
    return cy.get(`[data-test=row-view][href$="/${orderId}"]`).closest('[data-test=list-row]');
};

describe('OP15 · Order housekeeping', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('soft delete hides a cancelled order from its owner, restore returns it, hard delete destroys a cancelled unpaid one only', () => {
        cy.subjectId('order.paid').then((paidId) => {
            cy.subjectId('order.awaitingTransfer').then((unpaidId) => {
                cy.subjectId('order.cancelled').then((cancelledId) => {
                    cy.subjectId('product.rich').then((productId) => {
                        const shelf = { before: 0 };
                        cy.loginAs('manager');
                        cy.apiAs<ProductLike>('admin', 'GET', `/products/${productId}`).then(
                            (product) => {
                                shelf.before = Number(product?.available);
                            }
                        );

                        cy.step(
                            'only a cancelled order can be hidden: an open one offers no delete'
                        );
                        rowOf(paidId).within(() => {
                            cy.get('[data-test=row-delete]').should('not.exist');
                        });

                        cy.step('the customer sees the cancelled order before anything happens');
                        customerListing(cancelledId).should('deep.equal', [cancelledId]);

                        cy.step('soft delete, after a confirmation: the row stays, marked deleted');
                        rowOf(cancelledId).within(() => {
                            cy.get('[data-test=row-deleted]').should('not.exist');
                            cy.get('[data-test=row-delete]').click();
                        });
                        cy.get('[data-test=app-dialog-confirm]').click();
                        rowOf(cancelledId).within(() => {
                            cy.get('[data-test=row-deleted]').should('exist');
                            cy.get('[data-test=row-restore]').should('exist');
                            cy.get('[data-test=row-delete]').should('not.exist');
                        });

                        cy.step('the customer no longer has it');
                        customerListing(cancelledId).should('deep.equal', []);

                        cy.step('restore needs no confirmation and brings it back');
                        rowOf(cancelledId).within(() => {
                            cy.get('[data-test=row-restore]').click();
                        });
                        rowOf(cancelledId).within(() => {
                            cy.get('[data-test=row-deleted]').should('not.exist');
                            cy.get('[data-test=row-delete]').should('exist');
                        });
                        customerListing(cancelledId).should('deep.equal', [cancelledId]);

                        cy.step(
                            'a paid order is never offered a hard delete: its invoice must survive'
                        );
                        rowOf(paidId).within(() => {
                            cy.get('[data-test=row-hard-delete]').should('not.exist');
                        });

                        cy.step('an open order is not offered one either, until it is cancelled');
                        rowOf(unpaidId).within(() => {
                            cy.get('[data-test=row-hard-delete]').should('not.exist');
                        });
                        cy.apiAs('admin', 'POST', `/orders/${unpaidId}/cancel`, {});

                        cy.step(
                            'hard delete of the cancelled unpaid order is permanent; the cancel freed its units'
                        );
                        rowOf(unpaidId).within(() => {
                            cy.get('[data-test=row-hard-delete]').click();
                        });
                        cy.get('[data-test=app-dialog-confirm]').click();
                        cy.get('[data-test=orders-list-row-action-error]').should('not.exist');
                        cy.visit(`/en/sales/orders?id=${unpaidId}`);
                        cy.get('[data-test=row-view]').should('not.exist');
                        customerListing(unpaidId).should('deep.equal', []);
                        eventually(
                            () => cy.apiAs<ProductLike>('admin', 'GET', `/products/${productId}`),
                            (product) => Number(product?.available) > shelf.before
                        ).should((product) => {
                            expect(Number(product?.available)).to.equal(shelf.before + 1);
                        });
                    });
                });
            });
        });
    });
});
