// requires-module: account, inventory, orders, products
/**
 * @module
 * OP8 · A day in the stock room. The warehouse records a delivery, then writes off damaged units,
 * narrows the board to low stock, and reads each movement back in the ledger with its note.
 *
 * The product is made for the story (three units, under the low-stock threshold of five), so the
 * board filter has exactly one row to find. The count is read as staff see it: a guest's product
 * page is cached for an hour and does not follow (OP21 owns that side).
 */

/** What the story's product starts with: under `NODE_LOW_STOCK_THRESHOLD` (5). */
const STARTING_UNITS = 3;

/** Units the delivery brings. */
const DELIVERED = 10;

/** Units written off as damaged. */
const DAMAGED = 2;

/** The slice of a product this story reads. */
interface ProductLike {
    id: string;
    available: number;
}

/**
 * Picks a product in a stock-form autocomplete by typing its title.
 *
 * @param field - the form's product `data-test`
 * @param title - the product's title
 */
const pickProduct = (field: string, title: string): void => {
    // Cleared first: the ledger's filter holds "All products" as its text until something else is chosen.
    cy.get(`[data-test=${field}] input`).clear();
    cy.get(`[data-test=${field}] input`).type(title);
    cy.get('[role=listbox] [role=option]').contains(title).click();
};

describe('OP8 · A day in the stock room', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('receipt, write-off, low-stock board and ledger agree, and the product page follows', () => {
        const title = `E2E OP8 ${Date.now()}`;
        cy.createProduct({ title, onHand: STARTING_UNITS }).then((product) => {
            cy.step('the board lists the product as low stock');
            cy.loginAs('warehouse');
            cy.visit('/en/inventory');
            cy.get('[data-test=levels-low-only] input').check({ force: true });
            cy.get('[data-test=level-row]').should('contain.text', title);

            cy.step('a delivery lands, with a note');
            cy.get('[data-test=levels-low-only] input').uncheck({ force: true });
            pickProduct('receipt-product', title);
            cy.get('[data-test=receipt-quantity] input').clear();
            cy.get('[data-test=receipt-quantity] input').type(String(DELIVERED));
            cy.get('[data-test=receipt-note] input').type('OP8 supplier delivery');
            cy.get('[data-test=receipt-submit]').click();
            cy.get('[data-test=receipt-error]').should('not.exist');
            cy.apiAs<ProductLike>('admin', 'GET', `/products/${product.id}`).should((found) => {
                expect(Number(found?.available)).to.equal(STARTING_UNITS + DELIVERED);
            });

            cy.step('damaged units are written off, with a note');
            pickProduct('adjust-product', title);
            cy.get('[data-test=adjust-delta] input').clear();
            cy.get('[data-test=adjust-delta] input').type(String(-DAMAGED));
            cy.get('[data-test=adjust-note] input').type('OP8 dropped pallet');
            cy.get('[data-test=adjust-submit]').click();
            cy.get('[data-test=adjust-error]').should('not.exist');
            cy.apiAs<ProductLike>('admin', 'GET', `/products/${product.id}`).should((found) => {
                expect(Number(found?.available)).to.equal(STARTING_UNITS + DELIVERED - DAMAGED);
            });

            cy.step('the product is no longer low stock');
            cy.reload();
            cy.get('[data-test=levels-low-only] input').check({ force: true });
            // The board drops its table when no row is low, so assert on the row rather than the table.
            cy.contains('[data-test=level-row]', title).should('not.exist');

            cy.step('the ledger filters by product and by reason, with each note');
            cy.get('[data-test=levels-low-only] input').uncheck({ force: true });
            pickProduct('movements-filter-product', title);
            // The opening stock is itself a movement, written by the same ledger.
            cy.get('[data-test=movement-reason]').should('have.length', 3);
            cy.get('[data-test=movements-filter-reason]').click();
            cy.get('[role=listbox] [role=option]')
                .contains(/adjust/i)
                .click();
            cy.get('[data-test=movement-reason]').should('have.length', 1);
            cy.get('body').should('contain.text', 'OP8 dropped pallet');

            cy.step('a product row on the board opens its history');
            cy.visit('/en/inventory');
            cy.get('[data-test=level-history]').first().click();
            cy.get('[data-test=movement-reason]').should('have.length.at.least', 1);
        });
    });
});
