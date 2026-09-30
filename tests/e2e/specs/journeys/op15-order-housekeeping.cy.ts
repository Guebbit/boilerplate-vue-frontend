// requires-module: account, inventory, orders, products
/**
 * @module
 * OP15 · Order housekeeping. A moderator soft-deletes an order: it stays on the staff list,
 * marked deleted, and vanishes from its customer. Restoring brings it back. Hard-deleting an
 * unpaid order destroys it and returns its held units to the shelf; a PAID order refuses a hard
 * delete, because an invoice was frozen from its payment (BE `orders/services/crud.ts`, `remove`).
 *
 * The moderator holds `orders.any.delete` and nothing else this story needs, which is the point:
 * the destructive buttons belong to a role that cannot edit a product. Rows are found by their
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
    cy.visit(`/en/orders?id=${orderId}`);
    return cy.get(`[data-test=row-view][href$="/${orderId}"]`).closest('[data-test=list-row]');
};

describe('OP15 · Order housekeeping', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('soft delete hides an order from its owner, restore returns it, hard delete destroys an unpaid one only', () => {
        cy.subjectId('order.paid').then((paidId) => {
            cy.subjectId('order.awaitingTransfer').then((unpaidId) => {
                cy.subjectId('product.rich').then((productId) => {
                    const shelf = { before: 0 };
                    cy.loginAs('moderator');
                    cy.apiAs<ProductLike>('admin', 'GET', `/products/${productId}`).then(
                        (product) => {
                            shelf.before = Number(product?.available);
                        }
                    );

                    cy.step('the customer sees the paid order before anything happens');
                    customerListing(paidId).should('deep.equal', [paidId]);

                    cy.step('soft delete, after a confirmation: the row stays, marked deleted');
                    rowOf(paidId).within(() => {
                        cy.get('[data-test=row-deleted]').should('not.exist');
                        cy.get('[data-test=row-delete]').click();
                    });
                    cy.get('[data-test=app-dialog-confirm]').click();
                    rowOf(paidId).within(() => {
                        cy.get('[data-test=row-deleted]').should('exist');
                        cy.get('[data-test=row-restore]').should('exist');
                        cy.get('[data-test=row-delete]').should('not.exist');
                    });

                    cy.step('the customer no longer has it');
                    customerListing(paidId).should('deep.equal', []);

                    cy.step('restore needs no confirmation and brings it back');
                    rowOf(paidId).within(() => {
                        cy.get('[data-test=row-restore]').click();
                    });
                    rowOf(paidId).within(() => {
                        cy.get('[data-test=row-deleted]').should('not.exist');
                        cy.get('[data-test=row-delete]').should('exist');
                    });
                    customerListing(paidId).should('deep.equal', [paidId]);

                    cy.step('a paid order refuses a hard delete: its invoice must survive it');
                    rowOf(paidId).within(() => {
                        cy.get('[data-test=row-hard-delete]').click();
                    });
                    cy.get('[data-test=app-dialog-confirm]').click();
                    cy.get('[data-test=orders-list-row-action-error]').should('exist');
                    customerListing(paidId).should('deep.equal', [paidId]);

                    cy.step('hard delete of an unpaid order is permanent and frees its units');
                    rowOf(unpaidId).within(() => {
                        cy.get('[data-test=row-hard-delete]').click();
                    });
                    cy.get('[data-test=app-dialog-confirm]').click();
                    cy.get('[data-test=orders-list-row-action-error]').should('not.exist');
                    cy.visit(`/en/orders?id=${unpaidId}`);
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
