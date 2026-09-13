/**
 * @module
 * End-to-end coverage of the multilingual product write surface: creating a product in two
 * languages in one submit, removing a language while editing another in the same save, and a
 * validation error on a tab that is not selected still showing on the tab itself.
 */

/** A value unique enough per run that two specs racing the same backend cannot collide. */
const unique = () => `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

describe('Product write surface', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.loginAs('owner');
    });

    describe('create — two languages in one submit', () => {
        it('shows both languages on the storefront afterwards', () => {
            const enTitle = `EN lamp ${unique()}`;
            const itTitle = `IT lampada ${unique()}`;

            cy.visit('/en/products/create');
            // ` input`, never the `data-test` element itself: Vuetify puts `data-test` on the
            // field's WRAPPER, and typing at a wrapper lands wherever focus happens to be — which,
            // with the tab bar's own `v-select` a sibling away, means the first space in a title
            // opens the language picker and the rest of the string filters it.
            cy.get('#translation-panel-en [data-test=translation-title-field] input').type(enTitle);
            cy.get('[data-test=product-price-field] input').clear();
            cy.get('[data-test=product-price-field] input').type('19.99');

            // Open the Italian tab and fill it, in the SAME submit as the English one above.
            // Scoped by the panel's own id, not `:visible`: `v-window`'s slide transition leaves
            // both panels reporting nonzero size for a moment, which `:visible` alone can't tell
            // apart — Cypress's own actionability retry is what actually waits out the animation.
            cy.get('[data-test=translation-tab-add]').click();
            cy.contains('.v-list-item-title', 'Italiano').click();
            /*
             * Wait for the picker to have taken focus BACK before typing. Vuetify hands focus to a
             * `v-select`'s activator when its menu closes, and it does so a beat after the pick —
             * inside the window this would otherwise be typing in. The title then keeps only what
             * was typed before the hand-back and the picker's own filter keeps the rest, which
             * reads as a create that silently refused. A person is slower than that beat; Cypress
             * is not. Waiting for it makes the click below the last thing to take focus.
             */
            cy.get('[data-test=translation-tab-add] input').should('be.focused');
            cy.get('#translation-panel-it [data-test=translation-title-field] input').click();
            cy.get('#translation-panel-it [data-test=translation-title-field] input').type(itTitle);
            cy.get('#translation-panel-it [data-test=translation-title-field] input').should(
                'have.value',
                itTitle
            );

            cy.get('form').first().submit();
            cy.url().should('include', '/products/').and('not.include', '/create');

            cy.url().then((url) => {
                const id = url.split('/products/')[1]?.replace(/\/$/, '');

                cy.visit(`/en/products/${id}`);
                cy.contains(enTitle).should('exist');

                cy.visit(`/it/products/${id}`);
                cy.contains(itTitle).should('exist');
            });
        });
    });

    describe('edit — remove a language and edit another in one save', () => {
        it('the removed language is gone and the edited one is kept', () => {
            // Three languages, not two: English is this deployment's fallback locale and never
            // offers the remove action, so the language actually removed here is Italian, and
            // the one edited alongside it is Spanish — leaving the fallback untouched by either.
            const editedEsTitle = `ES edited ${unique()}`;

            cy.createProduct({
                translations: {
                    en: { title: `EN original ${unique()}` },
                    it: { title: `IT original ${unique()}` },
                    es: { title: `ES original ${unique()}` }
                }
            }).then((product) => {
                cy.visit(`/en/products/${product.id}/edit`);

                cy.get('[data-test=translation-tab-en]').should('exist');
                cy.get('[data-test=translation-tab-it]').should('exist');
                cy.get('[data-test=translation-tab-es]').should('exist');

                // Edit the Spanish tab's title. Scoped by the panel id — see the create spec's
                // own comment for why `:visible` alone races `v-window`'s slide transition.
                cy.get('[data-test=translation-tab-es]').click();
                cy.get('#translation-panel-es [data-test=translation-title-field]').clear();
                cy.get('#translation-panel-es [data-test=translation-title-field]').type(
                    editedEsTitle
                );

                // Remove the Italian tab, in the SAME save as the Spanish edit above. The remove
                // button lives beside the bar, not inside the tab, and acts on whichever tab is
                // active — so select Italian first.
                cy.get('[data-test=translation-tab-it]').click();
                cy.get('[data-test=translation-tab-remove]').click();
                cy.get('[data-test=translation-tab-it]').should('not.exist');

                cy.get('form').first().submit();
                cy.contains('Product updated successfully').should('exist');

                // Reload the edit screen: the admin record is refetched after a save, so this is
                // the server's own answer, not the form's leftover local state.
                cy.reload();
                cy.get('[data-test=translation-tab-it]').should('not.exist');
                cy.get('[data-test=translation-tab-en]').should('exist');
                cy.get('[data-test=translation-tab-es]').click();
                // `data-test=translation-title-field` sits on `<v-text-field>` itself, which
                // Vuetify renders as a wrapping `<div>` — it has no `.value` of its own. `.type()`/
                // `.clear()` above work directly on it because Vuetify delegates a click/focus on
                // the wrapper to the real `<input>` inside; `have.value` needs that `<input>` by
                // name, or it always reads the wrapper's (nonexistent) value as `''`.
                cy.get('#translation-panel-es [data-test=translation-title-field] input').should(
                    'have.value',
                    editedEsTitle
                );
            });
        });
    });

    describe('validation — an error on an unselected tab', () => {
        it('is visible on the tab itself, as a badge', () => {
            cy.createProduct({
                translations: {
                    en: { title: `EN original ${unique()}` },
                    it: { title: `IT original ${unique()}` }
                }
            }).then((product) => {
                cy.visit(`/en/products/${product.id}/edit`);

                // Blank the Italian tab's title, then switch away to English before saving — the
                // failure has to surface without the Italian tab being the one on screen. Scoped
                // by the panel id — see the create spec's own comment for why.
                cy.get('[data-test=translation-tab-it]').click();
                cy.get('#translation-panel-it [data-test=translation-title-field]').clear();
                cy.get('[data-test=translation-tab-en]').click();

                cy.get('form').first().submit();

                cy.get('[data-test=translation-tab-it]').within(() => {
                    cy.get('[data-test=translation-tab-error-badge]').should('exist');
                });
            });
        });
    });
});
