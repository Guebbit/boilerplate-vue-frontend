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
 * The switch itself, watched from the visitor's side of the glass: same tab, no reload, the
 * page re-speaks. The URL follows the choice, because the URL is where a guest's language lives.
 */
describe('switching the language in place', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
    });

    it('re-translates the current page and moves the URL under the new locale', () => {
        cy.visit('/en');
        cy.contains('Welcome to your Vue boilerplate').should('exist');

        cy.get('[aria-label="Language"]').first().click();
        cy.contains('.v-list-item-title', 'italian').click();

        cy.get('html').should('have.attr', 'lang', 'it');
        cy.url().should('include', '/it');
        cy.contains('Benvenuto nel tuo boilerplate Vue').should('exist');
        cy.contains('Welcome to your Vue boilerplate').should('not.exist');
    });
});

/**
 * Where a language choice LIVES, by audience: a guest's in the tab and its URL, a registered
 * visitor's on their account — written on the switch, read back and re-applied at the next
 * login. The mock PUT patches the user through the account journal, so the re-login below is
 * served the saved preference exactly as the live API would serve `user.locale`.
 */
describe('the saved preference', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
        cy.visit('/en');
    });

    it("a guest's switch writes nothing to any account", function () {
        cy.skipUnlessMock();

        cy.get('[aria-label="Language"]').first().click();
        cy.contains('.v-list-item-title', 'italian').click();
        cy.get('html').should('have.attr', 'lang', 'it');

        // The account journal is where the mock records profile writes; a guest leaves none.
        cy.window().then((windowObject) => {
            const journal = windowObject.sessionStorage.getItem('mock_accountJournal') ?? '';
            expect(journal).to.not.contain('"locale"');
        });
    });

    it("a registered visitor's choice follows them to the next login", function () {
        cy.skipUnlessMock();

        cy.loginAs('user');
        cy.get('[aria-label="Language"]').first().click();
        cy.contains('.v-list-item-title', 'italian').click();
        cy.get('html').should('have.attr', 'lang', 'it');

        // End the session through the UI, then come back through the ENGLISH login form —
        // the record's preference, not the form's language, decides where they land.
        cy.get('.v-app-bar')
            .contains(/logout/i)
            .click();
        // The session is ended only once the viewer chip is gone — a locale-independent fact,
        // unlike any nav label after the switch above.
        cy.contains('gino@pino.it').should('not.exist');
        cy.loginAs('user');

        cy.get('html').should('have.attr', 'lang', 'it');
        cy.url().should('include', '/it');
    });
});

/**
 * A language the API has and this app does not.
 *
 * `es` is in no `.env` list and has no `src/locales/es.json`. It reaches the switcher because the
 * manifest announces it at boot, and it renders because the overrides stored against it are
 * downloaded and merged. That is the whole tier in one navigation: a language nobody deployed a
 * file for, translated by someone with no code editor, degrading per key to English for whatever
 * they have not finished — rather than all-or-nothing.
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
        // The overrides carry a handful of keys and not this heading, so `fallbackLocale`
        // supplies the English one — the page renders rather than showing raw keys, which is what
        // "degrades per key" means.
        cy.get('h1').should('contain.text', 'Products list');
    });

    /**
     * The download itself, observed. Picking Spanish in the switcher makes the app FETCH the
     * overrides it does not bundle (`GET /locales/es/messages`) and merge them at runtime.
     * MSW answers that fetch inside the page, where `cy.intercept` cannot see it — but the
     * browser's own resource timing records every fetch the page makes, service-worker-served
     * included, so the entry IS the proof the network round trip happened. The per-key fallback
     * rendering above is the proof the merge landed without displacing the bundled languages.
     */
    it('the switcher triggers the runtime download of the missing dictionary', () => {
        cy.visit('/en');

        cy.window().then((windowObject) => {
            // The dev server floods the default 250-entry resource buffer with module loads,
            // which would silently drop the very entry this test exists to see.
            windowObject.performance.setResourceTimingBufferSize(10_000);
            const downloads = windowObject.performance
                .getEntriesByType('resource')
                .filter((entry) => entry.name.includes('/locales/es/messages'));
            expect(downloads, 'no download before the choice').to.have.length(0);
        });

        cy.get('[aria-label="Language"]').first().click();
        cy.contains('.v-list-item-title', 'spanish').click();

        cy.get('html').should('have.attr', 'lang', 'es');
        cy.url().should('include', '/es');
        cy.window().should((windowObject) => {
            const downloads = windowObject.performance
                .getEntriesByType('resource')
                .filter((entry) => entry.name.includes('/locales/es/messages'));
            expect(downloads.length, 'the runtime download of the es dictionary').to.be.greaterThan(
                0
            );
        });
    });
});
