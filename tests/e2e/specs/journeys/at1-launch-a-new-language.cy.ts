// requires-module: locales
/**
 * @module
 * AT1 · Launch a new language. An editor registers German switched off, fills its dictionary
 * three ways (one key by hand, a JSON import that merges, an inline edit), trims it, exports it
 * back, then switches it on: a guest sees it in the switcher and reads a German string on the
 * storefront. Last, the fallback `en` refuses to be deleted and the new language deletes.
 *
 * The editor holds every `locales.any.*` key (`shared/authorization-roles.yaml`), so this is
 * their story, not the admin's. An editor also READS inactive languages, which is why the
 * "not offered yet" check is made as a guest, not from the editor's own switcher.
 */

/** The language this story launches: a tag the seed does not know and the app ships no file for. */
const TAG = 'de';

/** What the JSON import brings: two nested keys, in the shape a translator's file has. */
const IMPORTED = {
    'home-page': { 'hero-title': 'Willkommen in Ihrem Vue-Boilerplate' },
    generic: { reset: 'Zuruecksetzen' }
};

/** The one key added by hand, in the entry dialog. */
const BY_HAND = { key: 'generic.search', value: 'Suchen' };

/** A sentence the inline edit writes over an imported value. */
const EDITED_RESET = 'Zurueck auf Anfang';

/** The slice of a language this story reads from `GET /locales`. */
interface LocaleRow {
    tag: string;
    active: boolean;
}

/** The slice of `GET /locales` this story reads. */
interface LocalesAnswer {
    locales: LocaleRow[];
}

/**
 * What a visitor with no session is offered, read straight off the public API.
 *
 * @returns a chain yielding whether {@link TAG} is listed, and whether it is switched on
 */
const offeredToGuests = (): Cypress.Chainable<'absent' | 'listed-off' | 'offered'> =>
    cy
        .env(['apiUrl'])
        .then(({ apiUrl }) => cy.request<{ data: LocalesAnswer }>(`${String(apiUrl)}/locales`))
        .then((response) => {
            const row = response.body.data.locales.find((found) => found.tag === TAG);
            if (!row) return 'absent';
            return row.active ? 'offered' : 'listed-off';
        });

/**
 * Opens the entries page of the new language from the list, by the row button's own address,
 * and narrows it to the frontend dictionary (so the add and import dialogs default to it).
 */
const openEntriesOfNewLanguage = (): void => {
    cy.visit('/en/locales');
    cy.get(`[data-test=row-entries][href$="/locales/${TAG}"]`).click();
    cy.get('[data-test=entry-create]').should('be.visible');
    cy.pickOption('[data-test=entries-filter-tenant]', /Frontend/);
    cy.get('[data-test=entries-filter-text] input').type('{enter}');
};

/**
 * Reads the JSON the export button downloaded.
 *
 * @returns a chain yielding the parsed dictionary
 */
const downloadedExport = (): Cypress.Chainable<unknown> =>
    cy.readFile(`${Cypress.config('downloadsFolder')}/${TAG}.json`);

describe('AT1 · Launch a new language', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('creates it inactive, fills and exports its dictionary, activates it, then deletes it', () => {
        cy.step('the editor registers German, switched off');
        cy.loginAs('editor');
        cy.visit('/en/locales');
        cy.get('[data-test=language-create]').click();
        cy.get('[data-test=language-tag] input').type(TAG);
        cy.get('[data-test=language-name] input').type('German');
        cy.get('[data-test=language-native-name] input').type('Deutsch');
        cy.get('[data-test=language-active] input').uncheck({ force: true });
        cy.get('[data-test=language-save]').click();
        cy.get('[data-test=language-form]').should('not.exist');
        cy.get(`[data-test=row-entries][href$="/locales/${TAG}"]`).should('exist');

        cy.step('a guest is not offered it yet');
        offeredToGuests().should('equal', 'absent');

        cy.step('one key added by hand');
        openEntriesOfNewLanguage();
        cy.get('[data-test=entries-empty]').should('exist');
        cy.get('[data-test=entry-create]').click();
        cy.get('[data-test=entry-key] input').type(BY_HAND.key);
        cy.get('[data-test=entry-value] textarea').first().type(BY_HAND.value);
        cy.get('[data-test=entry-save]').click();
        cy.get('[data-test=entry-form]').should('not.exist');
        cy.get('[data-test=entry-value-field]').should('have.length', 1);

        cy.step('a JSON file imported in merge mode keeps the key added by hand');
        cy.get('[data-test=entries-import-open]').click();
        cy.get('[data-test=import-file] input[type=file]').selectFile(
            {
                contents: Cypress.Buffer.from(JSON.stringify(IMPORTED)),
                fileName: `${TAG}.json`,
                mimeType: 'application/json'
            },
            { force: true }
        );
        cy.get('[data-test=import-preview]').should('exist');
        // Forced: the toast from the entry just saved floats over the dialog's button.
        cy.get('[data-test=import-submit]').click({ force: true });
        cy.get('[data-test=entries-import]').should('not.exist');
        cy.get('[data-test=entry-value-field]').should('have.length', 3);

        cy.step('an inline edit saves on blur and shows its tick');
        cy.get('[data-test=entries-filter-text] input').type('Zuruecksetzen{enter}');
        cy.get('[data-test=entry-value-field]').should('have.length', 1);
        cy.get('[data-test=entry-value-field] input').clear();
        cy.get('[data-test=entry-value-field] input').type(`${EDITED_RESET}{enter}`);
        cy.get('[data-test=entry-saved]').should('exist');

        cy.step('the text filter narrows, and a confirmed delete removes the hand-made key');
        cy.get('[data-test=entries-filter-text] input').clear();
        cy.get('[data-test=entries-filter-text] input').type(`${BY_HAND.value}{enter}`);
        cy.get('[data-test=entry-value-field]').should('have.length', 1);
        cy.get('[data-test=entry-delete]').click();
        cy.get('[data-test=app-dialog-confirm]').click();
        cy.get('[data-test=entries-empty]').should('exist');
        cy.get('[data-test=entries-filter-text] input').clear();
        cy.get('[data-test=entries-filter-text] input').type('{enter}');
        cy.get('[data-test=entry-value-field]').should('have.length', 2);

        cy.step('the export is exactly what is stored');
        cy.get('[data-test=entries-export]').click();
        downloadedExport().should('deep.equal', {
            'home-page': IMPORTED['home-page'],
            generic: { reset: EDITED_RESET }
        });

        cy.step('switched on, it is offered to a guest and renders on the storefront');
        cy.visit('/en/locales');
        cy.get(`[data-language=${TAG}] [data-test=row-edit]`).click();
        cy.get('[data-test=language-active] input').check({ force: true });
        cy.get('[data-test=language-save]').click();
        cy.get('[data-test=language-form]').should('not.exist');
        offeredToGuests().should('equal', 'offered');
        cy.logout();
        cy.visit('/en');
        cy.get('[data-test=language-switcher]').first().click();
        cy.get(`[data-test=language-option-${TAG}]`).click();
        cy.url().should('include', `/${TAG}`);
        cy.get('h2').should('contain.text', IMPORTED['home-page']['hero-title']);

        cy.step('the fallback language refuses deletion, the new one is deleted');
        cy.loginAs('editor');
        cy.visit('/en/locales');
        cy.get('[data-language=en] [data-test=row-delete]').click();
        cy.get('[data-test=app-dialog-confirm]').click();
        cy.get('[data-test=locales-list-delete-error]').should('be.visible');
        cy.get(`[data-test=row-entries][href$="/locales/en"]`).should('exist');
        cy.get(`[data-language=${TAG}] [data-test=row-delete]`).click();
        cy.get('[data-test=app-dialog-confirm]').click();
        cy.get(`[data-test=row-entries][href$="/locales/${TAG}"]`).should('not.exist');
        offeredToGuests().should('equal', 'absent');
    });
});
