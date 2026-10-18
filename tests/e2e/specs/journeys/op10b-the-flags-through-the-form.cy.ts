// requires-module: account, products
/**
 * @module
 * OP10b · The product flags through the form. The editor makes one product that needs no shipping
 * and one that cannot be withdrawn from, and the API holds both flags and the edit form shows
 * them again. Then a third is taken off sale from the edit form: a guest sees it listed but not
 * buyable, and the staff list's sale-status filter finds it. The checkout side of these flags is
 * CU10's.
 */

/** The slice of a product this story reads. */
interface FlagsLike {
    id: string;
    requiresShipping?: boolean;
    noWithdrawal?: boolean;
    purchasable?: boolean;
}

/** A value unique per run, so two specs on one backend cannot collide. */
const unique = (): string => `${String(Date.now())}-${String(Math.floor(Math.random() * 1000))}`;

/**
 * The editor creates a product through the form with one switch flipped, and lands on its page.
 *
 * @param title - the English title
 * @param flag - the switch to flip from its default
 * @returns a chain yielding the new product's id
 */
const createWithFlag = (
    title: string,
    flag: 'requires-shipping' | 'no-withdrawal'
): Cypress.Chainable<string> => {
    cy.visit('/en/products/create');
    cy.get('#translation-panel-en [data-test=translation-title-field] input').type(title);
    cy.get('[data-test=product-price-field] input').clear();
    cy.get('[data-test=product-price-field] input').type('12.00');
    cy.get(`[data-test=product-${flag}-field] input`).click({ force: true });
    cy.get('input[type=file]').selectFile('tests/e2e/fixtures/sample-image.png', { force: true });
    cy.get('form').first().submit();
    cy.url().should('include', '/products/').and('not.include', '/create');
    return cy
        .location('pathname')
        .then((path) => (path.split('/products/')[1] ?? '').replace(/\/$/, ''));
};

describe('OP10b · The product flags through the form', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('keeps requires-shipping and no-withdrawal through create and edit, and takes a product off sale', () => {
        cy.loginAs('editor');

        cy.step('a product that needs no shipping');
        createWithFlag(`OP10b digital ${unique()}`, 'requires-shipping').then((id) => {
            cy.apiAs<FlagsLike>('editor', 'GET', `/products/${id}`).should((product) => {
                expect(product?.requiresShipping).to.equal(false);
                expect(product?.noWithdrawal).to.equal(false);
            });
            cy.visit(`/en/products/${id}/edit`);
            cy.get('[data-test=product-weight-field] input').should('exist');
            cy.get('[data-test=product-requires-shipping-field] input').should('not.be.checked');
            cy.get('[data-test=product-no-withdrawal-field] input').should('not.be.checked');
        });

        cy.step('a product with no right of withdrawal');
        createWithFlag(`OP10b custom ${unique()}`, 'no-withdrawal').then((id) => {
            cy.apiAs<FlagsLike>('editor', 'GET', `/products/${id}`).should((product) => {
                expect(product?.noWithdrawal).to.equal(true);
                expect(product?.requiresShipping).to.equal(true);
            });
            cy.visit(`/en/products/${id}/edit`);
            cy.get('[data-test=product-weight-field] input').should('exist');
            cy.get('[data-test=product-no-withdrawal-field] input').should('be.checked');
        });

        cy.step('taken off sale from the edit form: listed, not buyable');
        const title = `OP10b off sale ${unique()}`;
        cy.createProduct({ title }).then((product) => {
            cy.visit(`/en/products/${product.id}/edit`);
            cy.get('[data-test=product-price-field] input').should('not.have.value', '');
            cy.get('[data-test=product-purchasable-field] input').uncheck({ force: true });
            cy.get('form').first().submit();
            cy.contains('Product updated successfully').should('exist');
            cy.apiAs<FlagsLike>('editor', 'GET', `/products/${product.id}`)
                .its('purchasable')
                .should('equal', false);

            cy.step('the staff list’s sale-status filter finds it');
            cy.visit('/en/products');
            cy.pickOption('[data-test=filter-purchasable]', 'Off sale');
            cy.get('[data-test=filter-text] input').type(`${title}{enter}`);
            cy.get('[data-test=row-view]').should('have.length', 1);

            cy.step('a guest sees it, switched off and with nothing to add');
            cy.logout();
            cy.visit(`/en/products/${product.id}`);
            cy.get('[data-test=product-purchasable]').should('exist');
            cy.get('[data-test=add-to-cart]').should('be.disabled');
        });
    });
});
