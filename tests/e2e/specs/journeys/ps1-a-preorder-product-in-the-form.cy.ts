// requires-module: account, products
/**
 * @module
 * PS1 · An editor sells something before it exists. A release date in the future is the whole
 * switch: the form says the product is now a preorder, the product page shows the date, and moving
 * it later or clearing it is a plain edit of the same field. Clearing it ends the preorder.
 *
 * Written against the live form and not yet run in a browser: the first run may need its
 * selectors nudged (a `datetime-local` field is typed as one string).
 */
import { createProductThroughTheForm, releaseDateIn } from '../../../support/e2e/steps';

/** A value unique per run, so two specs on one backend cannot collide. */
const unique = (): string => `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

describe('PS1 · An editor sells something before it exists', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('a future date makes a preorder, moving it keeps one, clearing it ends it', () => {
        cy.step('the editor creates a product with a release date two months out');
        cy.loginAs('editor');
        createProductThroughTheForm(`PS1 vinyl ${unique()}`, releaseDateIn(60)).then((id) => {
            cy.step('the product page shows the date it ships from');
            cy.get('[data-test=product-release-date]').should('exist');

            cy.step('the edit form knows it is a preorder now');
            cy.visit(`/en/products/${id}/edit`);
            cy.get('[data-test=product-release-date-field]').should(
                'contain.text',
                'This product is a preorder now'
            );

            cy.step('moving the date later is a plain edit, and it sticks');
            const later = releaseDateIn(120);
            cy.get('[data-test=product-release-date-field] input').clear();
            cy.get('[data-test=product-release-date-field] input').type(later);
            cy.get('form').first().submit();
            cy.contains('Product updated successfully').should('exist');
            cy.visit(`/en/products/${id}/edit`);
            cy.get('[data-test=product-release-date-field] input').should('have.value', later);

            cy.step(
                'clearing the date ends the preorder: the page shows none, the hint is the plain one'
            );
            cy.get('[data-test=product-release-date-field] input').clear();
            cy.get('form').first().submit();
            cy.contains('Product updated successfully').should('exist');
            cy.visit(`/en/products/${id}`);
            cy.get('[data-test=product-release-date]').should('not.exist');
            cy.visit(`/en/products/${id}/edit`);
            cy.get('[data-test=product-release-date-field]').should(
                'not.contain.text',
                'This product is a preorder now'
            );
        });
    });
});
