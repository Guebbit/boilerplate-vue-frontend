// requires-module: products
/**
 * @module
 * N3 · Two staff edit one product. The editor opens a product's edit form; while it is open the
 * admin changes the price; the editor saves a different price and is refused rather than
 * overwriting the admin's — told so, offered the latest version, and able to save on top of it.
 *
 * The story is about a lost update not happening: the edit form carries the version it was opened
 * on (`If-Match`), the server answers 412 to a stale one, and "reload latest" is the way forward.
 * Every price is read back from the API, never from the form.
 */

/** The price the admin sets while the editor's form is open. */
const ADMIN_PRICE = 123.45;

/** The price the editor tries to save. */
const EDITOR_PRICE = 77.7;

/**
 * The product's price as any shopper would read it.
 *
 * @param id - the product
 * @returns a chain yielding the price
 */
const publicPrice = (id: string): Cypress.Chainable<number> =>
    cy
        .env(['apiUrl'])
        .then(({ apiUrl }) =>
            cy
                .request(`${String(apiUrl)}/products/${id}`)
                .then((response) => (response.body as { data: { price: number } }).data.price)
        );

describe('N3 · Two staff edit one product', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('a save on a stale form is refused with the way forward, and succeeds once the form is reloaded', () => {
        cy.subjectId('product.inStock').then((productId) => {
            cy.step('the editor opens the edit form');
            cy.loginAs('editor');
            cy.visit(`/en/products/${productId}/edit`);
            // Hydrated: the form is showing the record, so its version is the one it will send.
            cy.get('[data-test=product-price-field] input').should('not.have.value', '');

            cy.step('meanwhile the admin changes the price');
            cy.apiAs('admin', 'PATCH', `/products/${productId}`, { price: ADMIN_PRICE });
            publicPrice(productId).should('equal', ADMIN_PRICE);

            cy.step('the editor saves a different price and is refused');
            cy.get('[data-test=product-price-field] input').clear();
            cy.get('[data-test=product-price-field] input').type(String(EDITOR_PRICE));
            cy.intercept('PATCH', `**/products/${productId}`).as('editorSave');
            cy.get('form').first().submit();
            cy.wait('@editorSave').its('response.statusCode').should('equal', 412);
            cy.get('[data-test=product-edit-submit-error]').should('be.visible');
            cy.get('[data-test=product-edit-reload-latest]').should('exist');
            cy.contains('Product updated successfully').should('not.exist');
            publicPrice(productId).should('equal', ADMIN_PRICE);

            cy.step('reloads the latest version: the admin’s price is in the form');
            cy.get('[data-test=product-edit-reload-latest]').click();
            cy.get('[data-test=product-price-field] input').should(
                'have.value',
                String(ADMIN_PRICE)
            );
            cy.get('[data-test=product-edit-reload-latest]').should('not.exist');

            cy.step('saves on top of it');
            cy.get('[data-test=product-price-field] input').clear();
            cy.get('[data-test=product-price-field] input').type(String(EDITOR_PRICE));
            cy.get('form').first().submit();
            cy.wait('@editorSave').its('response.statusCode').should('equal', 200);
            cy.contains('Product updated successfully').should('exist');
            publicPrice(productId).should('equal', EDITOR_PRICE);
        });
    });
});
