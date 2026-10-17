// requires-module: account, inventory, products
/**
 * @module
 * OP39 · A new product arrives with its first count. The admin creates a product through the form
 * with an opening quantity of seven. The product is made first and the count is received right
 * after, so the stock board shows 7 on hand, none reserved, 7 available, and the ledger holds one
 * "Received" row for it. Only what holds however the two calls are made is asserted: the field on
 * screen and the stock that results.
 */

/** A value unique per run, so two specs on one backend cannot collide. */
const unique = (): string => `${String(Date.now())}-${String(Math.floor(Math.random() * 1000))}`;

describe('OP39 · A new product arrives with its first count', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('creates the product and receives seven units', () => {
        const title = `OP39 lamp ${unique()}`;
        cy.step('the admin fills the form, with an opening count of seven');
        cy.loginAs('admin');
        cy.visit('/en/products/create');
        cy.get('#translation-panel-en [data-test=translation-title-field] input').type(title);
        cy.get('[data-test=product-price-field] input').clear();
        cy.get('[data-test=product-price-field] input').type('9.90');
        cy.get('[data-test=product-on-hand-field] input').clear();
        cy.get('[data-test=product-on-hand-field] input').type('7');
        cy.get('input[type=file]').selectFile('tests/e2e/fixtures/sample-image.png', {
            force: true
        });
        cy.get('form').first().submit();
        cy.url().should('include', '/products/').and('not.include', '/create');

        cy.step('the board shows seven on hand, none reserved, seven available');
        cy.visit('/en/inventory');
        cy.contains('[data-test=level-row]', title)
            .find('td')
            .should(($cells) => {
                const counts = [1, 2, 3].map((index) => Number($cells.eq(index).text().trim()));
                expect(counts, 'on hand, reserved, available').to.deep.equal([7, 0, 7]);
            });

        cy.step('the ledger holds one Received row for it');
        cy.get('[data-test=movements-filter-product] input').clear();
        cy.get('[data-test=movements-filter-product] input').type(title);
        cy.get('[role=listbox] [role=option]').contains(title).click();
        cy.get('[data-test=movement-reason]').should('have.length', 1).and('have.text', 'Received');
    });
});
