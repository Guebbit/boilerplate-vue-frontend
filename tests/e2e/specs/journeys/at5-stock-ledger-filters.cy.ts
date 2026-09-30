// requires-module: account, inventory, products
/**
 * @module
 * AT5 · Stock ledger filters. A receipt and an adjustment are written for one product through the
 * API; the ledger's reason filter then shows only movements of that reason, the product filter
 * only that product's, and the board's "low stock only" switch narrows the board. Reset (clearing
 * each filter) brings every movement back.
 */

/**
 * Writes one stock movement as the admin.
 *
 * @param productId - the product
 * @param path - `/inventory/receipts` or `/inventory/adjustments`
 * @param body - the movement
 */
const movement = (productId: string, path: string, body: Record<string, unknown>) =>
    cy.apiAs('admin', 'POST', path, { productId, ...body });

describe('AT5 · Stock ledger filters', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('reason and product narrow the ledger, and low-stock narrows the board', () => {
        cy.subjectId('product.inStock').then((productId) => {
            movement(productId, '/inventory/receipts', { quantity: 7, note: 'AT5 receipt' });
            movement(productId, '/inventory/adjustments', { delta: -2, note: 'AT5 damaged' });

            cy.loginAs('admin');
            cy.visit('/en/inventory');
            cy.get('[data-test=movement-reason]').should('have.length.greaterThan', 0);
            cy.get('[data-test=movement-reason]').then(($all) => {
                const total = $all.length;

                cy.step('reason: only receipts');
                cy.pickOption('[data-test=movements-filter-reason]', 'Received');
                cy.get('[data-test=movement-reason]').should('have.length.greaterThan', 0);
                cy.get('[data-test=movement-reason]').each(($reason) => {
                    expect($reason.text()).to.contain('Received');
                });

                cy.step('reason: only adjustments');
                cy.pickOption('[data-test=movements-filter-reason]', 'Adjusted');
                cy.get('[data-test=movement-reason]').each(($reason) => {
                    expect($reason.text()).to.contain('Adjusted');
                });

                cy.step('all reasons: the ledger is back');
                cy.pickOption('[data-test=movements-filter-reason]', 'All reasons');
                cy.get('[data-test=movement-reason]').should('have.length', total);
            });

            cy.step("product: only that product's movements");
            cy.subjectProduct('product.inStock').then(({ title }) => {
                cy.get('[data-test=movements-filter-product] input').type(title);
                cy.get('[role=listbox] [role=option]').first().click();
                cy.get('[data-test=movements-total]').should('not.contain.text', ' 0 ');
                cy.get('[data-test=movement-reason]').should('have.length.greaterThan', 0);
            });

            cy.step('low stock only: the board shrinks to the products that are low');
            cy.createProduct({ title: `E2E AT5 low ${Date.now()}`, onHand: 2 }).then((low) => {
                cy.visit('/en/inventory');
                // The total reads "0" until the board has loaded; a row is the sign it has.
                cy.get('[data-test=level-row]').should('exist');
                cy.get('[data-test=levels-total]')
                    .invoke('text')
                    .then((before) => {
                        cy.get('[data-test=levels-low-only] input').check();
                        cy.get('[data-test=levels-total]').should('not.have.text', before);
                        cy.contains('[data-test=level-row]', low.title).should('exist');
                        cy.get('[data-test=levels-low-only] input').uncheck();
                        cy.get('[data-test=levels-total]').should('have.text', before);
                    });
            });
        });
    });
});
