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
        cy.restore();
    });

    it('renders the home page in Italian and marks the document language', () => {
        cy.visit('/it');

        cy.get('#home-page').should('exist');
        cy.get('html').should('have.attr', 'lang', 'it');
    });

    it('renders page copy in Italian, not the fallback', () => {
        cy.visit('/it');

        cy.get('#home-page').should('exist');
        cy.get('h2').should('contain.text', 'Benvenuto nel tuo boilerplate Vue');
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

        cy.get('[type=email]').should('not.be.disabled').type('not-an-email');
        cy.get('[type=password]').should('not.be.disabled').type('somepassword');
        cy.get('form').submit();

        cy.get('.v-messages__message').should('contain.text', "Controlla l'indirizzo email");
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

        cy.get('[type=email]').should('not.be.disabled').type('not-an-email');
        cy.get('[type=password]').should('not.be.disabled').type('somepassword');
        cy.get('form').submit();
        cy.get('.v-messages__message').should('contain.text', 'Check your email address');

        cy.get('[data-test=language-switcher]').first().click();
        cy.get('[data-test=language-option-it]').click();

        cy.url().should('include', '/it/login');
        cy.get('.v-messages__message').should('contain.text', "Controlla l'indirizzo email");
        cy.get('.v-messages__message').should('not.contain.text', 'Check your email address');
    });
});

/**
 * The switch itself, watched from the visitor's side of the glass: same tab, no reload, the
 * page re-speaks. The URL follows the choice, because the URL is where a guest's language lives.
 */
describe('switching the language in place', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('re-translates the current page and moves the URL under the new locale', () => {
        cy.visit('/en');
        cy.contains('Welcome to your Vue boilerplate').should('exist');

        cy.get('[data-test=language-switcher]').first().click();
        cy.get('[data-test=language-option-it]').click();

        cy.get('html').should('have.attr', 'lang', 'it');
        cy.url().should('include', '/it');
        cy.contains('Benvenuto nel tuo boilerplate Vue').should('exist');
        cy.contains('Welcome to your Vue boilerplate').should('not.exist');
    });
});

/**
 * Where a language choice LIVES, by audience: a guest's in the tab and its URL, a registered
 * visitor's on their account — written on the switch (`PATCH /account`), read back from the
 * whoami and re-applied at the next login.
 */
describe('the saved preference', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it("a guest's switch writes nothing to any account", function () {
        cy.skipUnlessDemo();

        cy.get('[data-test=language-switcher]').first().click();
        cy.get('[data-test=language-option-it]').click();
        cy.get('html').should('have.attr', 'lang', 'it');

        // The proof a guest's switch wrote nothing: the account's saved preference still rules
        // the next login. A guest write would have made the seed user Italian.
        cy.loginAs('user');
        cy.get('html').should('have.attr', 'lang', 'en');
    });

    it("a registered visitor's choice follows them to the next login", function () {
        cy.skipUnlessDemo();

        cy.loginAs('user');
        cy.get('[data-test=language-switcher]').first().click();
        cy.get('[data-test=language-option-it]').click();
        cy.get('html').should('have.attr', 'lang', 'it');

        // End the session through the UI, then come back through the ENGLISH login form —
        // the record's preference, not the form's language, decides where they land.
        cy.logout();
        // The session is ended only once the viewer chip is gone — a locale-independent fact,
        // unlike any nav label after the switch above.
        cy.contains('customer@example.com').should('not.exist');
        cy.loginAs('user');

        cy.get('html').should('have.attr', 'lang', 'it');
        cy.url().should('include', '/it');
    });
});

/**
 * A language the API has and this app does not — the shell-generic half. `es` is in no `.env`
 * list and has no `src/locales/es.json`; it reaches the switcher because the manifest announces
 * it at boot. Whether it ACTIVATES and falls back per key is product-specific at the seeded-data
 * level (`src/modules/products/tests/e2e/locale.cy.ts`, FA122): the backend's demo data seeds a
 * Spanish override only for the products list page, so that half moved with the module rather
 * than staying here pointed at a page with no override to render.
 */
describe('a locale only the API has', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('is offered in the switcher even though this app has no dictionary for it', () => {
        cy.visit('/en');

        cy.get('[data-test=language-switcher]').first().click();
        cy.get('[data-test=language-option-es]').should('exist');
    });
});
