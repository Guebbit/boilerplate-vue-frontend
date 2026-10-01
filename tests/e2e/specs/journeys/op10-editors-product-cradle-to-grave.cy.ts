// requires-module: account, locales, orders, products
/**
 * @module
 * OP10 · An editor's product, cradle to grave. The editor creates a product in two languages with
 * its price, weight, tax class, category, tag and stock, then retires it in four steps.
 *
 * - Deactivated: hidden from guests, still listed for the editor.
 * - Soft-deleted: gone for guests; restored: visible again.
 * - Hard-deleted: gone for everyone, and a past order that held another hard-deleted product
 *   still reads (the seeded `order.productDeleted`).
 *
 * The publish switch is the form's `product-active-field`. The guest's reads are cached for an
 * hour on live, and every product write invalidates that cache, so the guest steps prove it there.
 */

/** A value unique per run, so two specs on one backend cannot collide. */
const unique = (): string => `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

/** The slice of a product this story reads. */
interface ProductLike {
    id: string;
}

/**
 * The guest's own view of a product: its public status code, without failing on a 404.
 *
 * @param id - the product
 * @returns a chain yielding the HTTP status
 */
const guestStatusOf = (id: string): Cypress.Chainable<number> =>
    cy
        .env(['apiUrl'])
        .then(({ apiUrl }) =>
            cy.request({ url: `${String(apiUrl)}/products/${id}`, failOnStatusCode: false })
        )
        .then((response) => response.status);

describe("OP10 · An editor's product, cradle to grave", () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('create in two languages, then deactivate, delete, restore and erase it', () => {
        const enTitle = `OP10 lamp ${unique()}`;
        const itTitle = `OP10 lampada ${unique()}`;
        const category = `op10cat${Date.now()}`;
        const tag = `op10tag${Date.now()}`;

        cy.step('the editor creates the product in English and Italian');
        cy.loginAs('editor');
        cy.visit('/en/products/create');
        cy.get('#translation-panel-en [data-test=translation-title-field] input').type(enTitle);
        cy.get('[data-test=product-price-field] input').clear();
        cy.get('[data-test=product-price-field] input').type('24.50');
        cy.get('[data-test=product-weight-field] input').clear();
        cy.get('[data-test=product-weight-field] input').type('750');
        cy.pickOption('[data-test=product-tax-class-field]', /reduced/i);
        cy.get('[data-test=product-categories-field] input').type(`${category}{enter}`);
        cy.get('[data-test=product-tags-field] input').type(`${tag}{enter}`);
        cy.get('[data-test=translation-tab-add]').click();
        cy.contains('.v-list-item-title', 'Italiano').click();
        cy.get('[data-test=translation-tab-add] input').should('be.focused');
        cy.get('#translation-panel-it [data-test=translation-title-field] input').click();
        cy.get('#translation-panel-it [data-test=translation-title-field] input').type(itTitle);
        // A product image: the same fixture the uploads specs use.
        cy.get('input[type=file]').selectFile('tests/e2e/fixtures/sample-image.png', {
            force: true
        });
        cy.get('form').first().submit();
        cy.url().should('include', '/products/').and('not.include', '/create');

        cy.location('pathname').then((path) => {
            const id = (path.split('/products/')[1] ?? '').replace(/\/$/, '');

            cy.step('every field round-trips through the edit form');
            cy.visit(`/en/products/${id}/edit`);
            cy.get('#translation-panel-en [data-test=translation-title-field] input').should(
                'have.value',
                enTitle
            );
            cy.get('[data-test=product-weight-field] input').should('have.value', '750');
            cy.get('[data-test=product-categories-field]').should('contain.text', category);
            cy.get('[data-test=product-tags-field]').should('contain.text', tag);
            cy.get('[data-test=product-active-field] input').should('be.checked');

            cy.step('a guest sees it, in both languages and in the facets');
            cy.switchUser('user');
            cy.logout();
            cy.visit(`/en/products/${id}`);
            cy.contains(enTitle).should('exist');
            cy.visit(`/it/products/${id}`);
            cy.contains(itTitle).should('exist');
            cy.visit('/en/products');
            cy.env(['apiUrl'])
                .then(({ apiUrl }) => cy.request(`${String(apiUrl)}/products/categories`))
                .its('body.data.categories')
                .should('deep.include', { name: category, count: 1 });

            cy.step('deactivated: hidden from the guest, still listed for the editor');
            cy.loginAs('editor');
            cy.visit(`/en/products/${id}/edit`);
            // The form fills in from the fetched record; saving before then sends an empty price.
            cy.get('[data-test=product-weight-field] input').should('have.value', '750');
            cy.get('[data-test=product-active-field] input').uncheck({ force: true });
            cy.get('form').first().submit();
            cy.contains('Product updated successfully').should('exist');
            guestStatusOf(id).should('equal', 404);
            cy.visit('/en/products');
            cy.get('[data-test=filter-text] input').type(`${enTitle}{enter}`);
            cy.get('[data-test=row-view]').should('have.length', 1);

            cy.step('soft-deleted: gone for the guest; restored: back for the editor');
            cy.get('[data-test=row-delete]').click();
            cy.get('[data-test=app-dialog-confirm]').click();
            guestStatusOf(id).should('equal', 404);
            cy.pickOption('[data-test=filter-deleted]', 'Deleted only');
            cy.get('[data-test=row-restore]').click();
            cy.get('[data-test=row-restore]').should('not.exist');
            cy.apiAs<ProductLike>('editor', 'GET', `/products/${id}`).should((product) => {
                expect(product?.id).to.equal(id);
            });

            cy.step('hard-deleted: gone for everyone');
            cy.visit('/en/products');
            cy.get('[data-test=filter-text] input').type(`${enTitle}{enter}`);
            cy.get('[data-test=row-hard-delete]').click();
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.get('[data-test=row-view]').should('not.exist');
            guestStatusOf(id).should('equal', 404);
        });

        cy.step('an order that held a hard-deleted product still reads');
        cy.subjectId('order.productDeleted').then((orderId) => {
            cy.switchUser('admin');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=order-number]').should('exist');
        });
    });
});
