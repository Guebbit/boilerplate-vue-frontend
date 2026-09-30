// requires-module: locales
/**
 * @module
 * AT2 · Fix a typo in the dictionary. An editor works the dictionary board, where every language
 * is a column: they fix a Spanish string and the storefront shows it, clear it and the storefront
 * falls back to English (Spanish ships no file, so English is the only thing left), complete a
 * new key in all five languages so the "incomplete only" switch drops it, and replace Spanish's
 * dictionary from a file, which removes what the file does not name but leaves the API's own
 * dictionary (another tenant) alone.
 *
 * A cleared cell falls back to the language's own shipped file where it has one (Italian does),
 * and to English only where it does not: Spanish is the language with nothing shipped.
 */

/** The key the typo fix and the clear are made on: a string the home page hero shows. */
const HERO_KEY = 'home-page.hero-title';

/** What the storefront says in English when Spanish has no override. */
const HERO_ENGLISH = 'Welcome to your Vue boilerplate';

/** The corrected Spanish string. */
const HERO_SPANISH = 'Bienvenido a tu plantilla Vue';

/** A key that exists nowhere yet, completed in every language. */
const NEW_KEY = 'e2e.at2.typo';

/** The native names of the five columns the board shows, in the order they are filled. */
const COLUMNS = ['English', 'Español', 'Français', 'Italiano', '日本語'];

/**
 * The board's cell for one key in one language, found by the language's native name, which the
 * cell's accessible label carries.
 *
 * @param key - the dictionary key
 * @param nativeName - the column's language, in its own name
 */
const cellOf = (key: string, nativeName: string): Cypress.Chainable<JQuery> =>
    cy
        .get(`[data-test=dictionary-cell][data-key="${key}"]`)
        .find(`input[aria-label*="${nativeName}"]`);

/**
 * Narrows the board to one key, so its row is the only one and on the first page.
 *
 * @param key - the dictionary key
 */
const filterBoardTo = (key: string): void => {
    cy.get('[data-test=dictionary-filter-text] input').clear();
    cy.get('[data-test=dictionary-filter-text] input').type(`${key}{enter}`);
    cy.get(`[data-test=dictionary-cell][data-key="${key}"]`).should('exist');
};

describe('AT2 · Fix a typo in the dictionary', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('edits a cell, clears it back to English, completes a key and replaces a dictionary', () => {
        cy.step('the board opens on the frontend dictionary; Spanish has no hero string yet');
        cy.loginAs('editor');
        cy.visit('/en/locales/dictionary');
        filterBoardTo(HERO_KEY);
        cy.get(`[data-test=dictionary-cell][data-key="${HERO_KEY}"]`)
            .filter('[data-state=missing]')
            .should('have.length.gte', 1);

        cy.step('a typed correction saves on Enter and shows its tick');
        cellOf(HERO_KEY, 'Español').type(`${HERO_SPANISH}{enter}`);
        cy.get('[data-test=dictionary-cell-saved]').should('exist');
        cy.get(`[data-test=dictionary-cell][data-key="${HERO_KEY}"]`)
            .filter('[data-state=entry]')
            .should('have.length', 1);

        cy.step('the storefront shows the corrected Spanish');
        cy.visit('/es');
        cy.get('h2').should('contain.text', HERO_SPANISH);

        cy.step('clearing the cell asks first, then the storefront falls back to English');
        cy.visit('/en/locales/dictionary');
        filterBoardTo(HERO_KEY);
        // The icon shows on hover only, hence the force: the press itself is what is under test.
        cellOf(HERO_KEY, 'Español')
            .parents('.v-field')
            .find('.v-field__clearable .v-icon')
            .click({ force: true });
        cy.get('[data-test=app-dialog-confirm]').click();
        cy.get(`[data-test=dictionary-cell][data-key="${HERO_KEY}"]`)
            .filter('[data-state=entry]')
            .should('not.exist');
        cy.visit('/es');
        cy.get('h2').should('contain.text', HERO_ENGLISH);

        cy.step('a new key completed in every language leaves the "incomplete only" view');
        cy.visit('/en/locales/dictionary');
        cy.get('[data-test=dictionary-new-key] input').type(`${NEW_KEY}{enter}`);
        for (const nativeName of COLUMNS) {
            cellOf(NEW_KEY, nativeName).type(`${nativeName} text{enter}`);
            cy.get('[data-test=dictionary-cell-saved]').should('exist');
            cy.get('[data-test=dictionary-cell-saved]').should('not.exist');
        }
        filterBoardTo(NEW_KEY);
        cy.get('[data-test=dictionary-filter-incomplete] input').check({ force: true });
        cy.get(`[data-test=dictionary-cell][data-key="${NEW_KEY}"]`).should('not.exist');
        cy.get('[data-test=dictionary-filter-incomplete] input').uncheck({ force: true });
        cy.get(`[data-test=dictionary-cell][data-key="${NEW_KEY}"]`).should('exist');

        cy.step('a replace import removes what the file omits, from that tenant only');
        cy.visit('/en/locales');
        cy.get('[data-test=row-entries][href$="/locales/es"]').click();
        cy.pickOption('[data-test=entries-filter-tenant]', /Frontend/);
        cy.get('[data-test=entries-filter-text] input').type('{enter}');
        cy.get('[data-test=entry-value-field]').should('have.length.gte', 10);
        cy.get('[data-test=entries-import-open]').click();
        cy.get('[data-test=import-file] input[type=file]').selectFile(
            {
                contents: Cypress.Buffer.from(
                    JSON.stringify({ e2e: { at2: { kept: 'Conservado' } } })
                ),
                fileName: 'es.json',
                mimeType: 'application/json'
            },
            { force: true }
        );
        cy.get('[data-test=import-mode] input[value=replace]').check({ force: true });
        cy.get('[data-test=import-submit]').click();
        cy.get('[data-test=app-dialog-confirm]').click();
        cy.get('[data-test=entries-import]').should('not.exist');
        cy.get('[data-test=entry-value-field]').should('have.length', 1);

        cy.step('the API tenant of the same language is untouched');
        cy.pickOption('[data-test=entries-filter-tenant]', /API/);
        cy.get('[data-test=entries-filter-text] input').type('{enter}');
        cy.get('[data-test=entry-value-field]').should('have.length', 2);
    });
});
