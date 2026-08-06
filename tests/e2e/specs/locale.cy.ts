/**
 * The locale route prefix, exercised end to end.
 *
 * Every other spec visits `/en/…`, so the whole locale layer — the router's `:locale` segment,
 * the `localeChoice` guard, the dynamic dictionary import, `<html lang>` — was only ever
 * exercised in the one language where "translated" and "untranslated" look identical. A broken
 * `loadLocale` would have kept every one of those specs green.
 */
describe('Italian locale', () => {
    beforeEach(() => {
        cy.visit('/it');
        cy.resetState();
    });

    it('renders the home page in Italian and marks the document language', () => {
        cy.visit('/it');

        cy.get('#home-page').should('exist');
        cy.get('html').should('have.attr', 'lang', 'it');
    });

    it('renders page copy in Italian, not the fallback', () => {
        cy.visit('/it/products');

        cy.get('#products-list-page').should('exist');
        cy.get('h1').should('contain.text', 'Lista prodotti');
    });

    it('renders form labels in Italian', () => {
        cy.visit('/it/login');

        cy.get('#login-page').should('exist');
        cy.contains('Ricorda il mio accesso').should('exist');
        cy.contains('Password dimenticata?').should('exist');
    });

    /**
     * The validation path, which is where the schema thunks land: the schemas are module
     * constants, so a message frozen at import would show English here while the labels around
     * it are Italian.
     */
    it('renders validation messages in Italian', () => {
        cy.visit('/it/login');

        cy.get('[type=email]').type('not-an-email');
        cy.get('[type=password]').type('somepassword');
        cy.get('form').submit();

        cy.get('.v-messages__message').should('contain.text', "Deve essere un'email valida");
    });

    /**
     * The staleness `revalidateOn` fixes: an error already on screen holds a RESOLVED STRING, so
     * switching language has to re-run validation or the copy underneath an Italian label stays
     * English.
     *
     * It has to go through the in-app switcher, not `cy.visit('/it/login')`: a visit reloads the
     * page and throws the form away, which would test nothing. The switcher does a
     * `router.replace` on the same route record, so the component instance — and the error
     * already on screen — survives, which is the situation being asserted.
     */
    it('re-translates a displayed validation error when the language changes', () => {
        cy.visit('/en/login');

        cy.get('[type=email]').type('not-an-email');
        cy.get('[type=password]').type('somepassword');
        cy.get('form').submit();
        cy.get('.v-messages__message').should('contain.text', 'Must be a valid email');

        cy.get('[aria-label="Language"]').first().click();
        cy.contains('.v-list-item-title', 'italian').click();

        cy.url().should('include', '/it/login');
        cy.get('.v-messages__message').should('contain.text', "Deve essere un'email valida");
        cy.get('.v-messages__message').should('not.contain.text', 'Must be a valid email');
    });
});

/**
 * A language the API has and this app does not.
 *
 * `es` is declared in `VITE_APP_SUPPORTED_LOCALES` with no `src/locales/es.json`, and the mock
 * API serves a Spanish dictionary. That is the whole of design C in one navigation: the app
 * offers the language, downloads the API's copy into `api.*`, and falls back per key for its own
 * UI strings — Spanish where the API supplies it, English everywhere else, rather than
 * all-or-nothing.
 */
describe('a locale only the API has', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
    });

    it('is offered in the switcher even though this app has no dictionary for it', () => {
        cy.visit('/en');

        cy.get('[aria-label="Language"]').first().click();
        cy.contains('.v-list-item-title', 'spanish').should('exist');
    });

    it('activates, and falls back per key for UI copy it has no Spanish for', () => {
        cy.visit('/es/products');

        cy.get('#products-list-page').should('exist');
        cy.get('html').should('have.attr', 'lang', 'es');
        // No Spanish UI dictionary, so `fallbackLocale` supplies the English heading — the page
        // renders rather than showing raw keys, which is what "degrades per key" means.
        cy.get('h1').should('contain.text', 'Products list');
    });
});
