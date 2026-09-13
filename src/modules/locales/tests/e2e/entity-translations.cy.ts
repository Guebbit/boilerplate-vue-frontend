/**
 * @module
 * End-to-end coverage of the generic translation door's own screen: an editor (here, the owner
 * account, which holds the same `translations.manage` key) edits a product's translation, and the
 * storefront reflects it. The full invalidation path, not a store-level assertion: the write
 * clears the API's own cache tag, so what proves the path end to end is a fresh page load
 * actually showing the new words.
 */

describe('Entity translations — the generic admin door', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.loginAs('owner');
    });

    it('an edited translation reaches the storefront', () => {
        const originalItTitle = `IT original ${Date.now()}`;
        const editedItTitle = `IT edited ${Date.now()}`;

        cy.createProduct({
            translations: {
                en: { title: `EN ${Date.now()}` },
                it: { title: originalItTitle }
            }
        }).then((product) => {
            cy.visit(`/en/locales/translations/product/${product.id}`);

            cy.get('[data-test=translation-tab-it]').click();
            /*
             * Scoped to the `it` PANEL, not filtered by `:visible`. Every open locale's fields
             * stay in the DOM — `v-window` renders them all — so `:visible` is a race with the
             * tab transition: the outgoing panel is still on screen for a frame, both panels
             * match, and `cy.type()` refuses a two-element subject. The panel's own id is the
             * one selector that names exactly one of them.
             *
             * `data-field=title` because the `it` row was seeded with only a title —
             * `description` renders too, from the registry's declared field set, but blank and
             * left alone.
             */
            cy.get(
                '#translation-panel-it [data-test=entity-translation-field][data-field=title]'
            ).clear();
            cy.get(
                '#translation-panel-it [data-test=entity-translation-field][data-field=title]'
            ).type(editedItTitle);
            cy.get('[data-test=entity-translations-save]').click();
            cy.contains('Translations saved').should('exist');

            cy.visit(`/it/products/${product.id}`);
            cy.contains(editedItTitle).should('exist');
            cy.contains(originalItTitle).should('not.exist');
        });
    });

    it('reaches the screen from the product edit page', () => {
        cy.createProduct({ translations: { en: { title: `EN ${Date.now()}` } } }).then(
            (product) => {
                cy.visit(`/en/products/${product.id}/edit`);
                cy.get('[data-test=translations-link]').click();

                cy.url().should('include', `/locales/translations/product/${product.id}`);
                cy.get('#entity-translations-page').should('exist');
            }
        );
    });
});
