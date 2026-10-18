/**
 * @module
 * The leave guard on a staff edit form: a half-typed price is not thrown away by a click on a
 * menu link without asking, Stay keeps the typed value, Leave navigates, and a saved form leaves
 * silently. `about` is a shell-owned page, so the click is an in-app navigation whatever modules
 * this build ships.
 */

/** The price typed and not saved. */
const TYPED_PRICE = '41.50';

/** Clicks the visible `about` link in the app bar: a router navigation, not a page load. */
const clickAboutLink = () => {
    cy.get('nav a[href="/en/about"]').filter(':visible').first().click();
};

describe('a half-typed product form asks before it is thrown away', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('Stay keeps the typed price, Leave navigates', () => {
        cy.subjectId('product.inStock').then((productId) => {
            cy.loginAs('editor');
            cy.visit(`/en/products/${productId}/edit`);
            cy.get('[data-test=product-price-field] input').should('not.have.value', '');
            cy.get('[data-test=product-price-field] input').clear();
            cy.get('[data-test=product-price-field] input').type(TYPED_PRICE);

            cy.step('a click on a menu link asks first, and Stay changes nothing');
            clickAboutLink();
            cy.get('[data-test=app-dialog]').should('be.visible');
            cy.get('[data-test=app-dialog-cancel]').click();
            cy.get('[data-test=app-dialog]').should('not.exist');
            cy.location('pathname').should('equal', `/en/products/${productId}/edit`);
            cy.get('[data-test=product-price-field] input').should('have.value', TYPED_PRICE);

            cy.step('Leave navigates');
            clickAboutLink();
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.location('pathname').should('equal', '/en/about');
        });
    });

    it('a form that was just saved leaves without asking', () => {
        cy.subjectId('product.inStock').then((productId) => {
            cy.loginAs('editor');
            cy.visit(`/en/products/${productId}/edit`);
            cy.get('[data-test=product-price-field] input').should('not.have.value', '');
            cy.get('[data-test=product-price-field] input').clear();
            cy.get('[data-test=product-price-field] input').type(TYPED_PRICE);
            cy.intercept('PATCH', `**/products/${productId}`).as('save');
            cy.get('form').first().submit();
            cy.wait('@save').its('response.statusCode').should('equal', 200);

            clickAboutLink();
            cy.location('pathname').should('equal', '/en/about');
            cy.get('[data-test=app-dialog]').should('not.exist');
        });
    });
});
