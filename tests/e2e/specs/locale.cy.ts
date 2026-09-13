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
        cy.contains('.v-list-item-title', 'italian').click();

        cy.url().should('include', '/it/login');
        cy.get('.v-messages__message').should('contain.text', "Controlla l'indirizzo email");
        cy.get('.v-messages__message').should('not.contain.text', 'Check your email address');
    });
});

/**
 * `useProductsStore`'s dictionary is keyed by product id alone, so nothing about the cached
 * record says which language filled it in. A switch has to WIPE it and refetch, or a product
 * page reads the language the visitor just left.
 */
describe('switching language wipes and refetches locale-sensitive stores', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('a product page shows the new language after an in-place switch, and the old one after switching back', () => {
        const enTitle = `EN lamp ${Date.now()}`;
        const itTitle = `IT lampada ${Date.now()}`;

        cy.createProduct({
            translations: { en: { title: enTitle }, it: { title: itTitle } }
        }).then((product) => {
            cy.visit(`/en/products/${product.id}`);
            cy.contains(enTitle).should('exist');

            cy.get('[data-test=language-switcher]').first().click();
            cy.contains('.v-list-item-title', 'italian').click();
            cy.url().should('include', '/it/');

            // The router keeps this same page — `products/:id` carries no locale of its own — so
            // an implementation that only cleared the cache on NAVIGATION and not on the switch
            // itself would still be showing the English title here.
            cy.contains(itTitle).should('exist');
            cy.contains(enTitle).should('not.exist');

            cy.get('[data-test=language-switcher]').first().click();
            cy.contains('.v-list-item-title', 'english').click();
            cy.url().should('include', '/en/');
            cy.contains(enTitle).should('exist');
            cy.contains(itTitle).should('not.exist');
        });
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
        cy.contains('.v-list-item-title', 'italian').click();

        cy.get('html').should('have.attr', 'lang', 'it');
        cy.url().should('include', '/it');
        cy.contains('Benvenuto nel tuo boilerplate Vue').should('exist');
        cy.contains('Welcome to your Vue boilerplate').should('not.exist');
    });
});

/**
 * Where a language choice LIVES, by audience: a guest's in the tab and its URL, a registered
 * visitor's on their account — written on the switch (`PUT /account`), read back from the
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
        cy.contains('.v-list-item-title', 'italian').click();
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
        cy.contains('.v-list-item-title', 'italian').click();
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
        cy.restore();
    });

    it('is offered in the switcher even though this app has no dictionary for it', () => {
        cy.visit('/en');

        cy.get('[data-test=language-switcher]').first().click();
        cy.contains('.v-list-item-title', 'spanish').should('exist');
    });

    it('activates, and falls back per key for UI copy it has no Spanish for', () => {
        cy.visit('/es/products');

        cy.get('#products-list-page').should('exist');
        cy.get('html').should('have.attr', 'lang', 'es');

        /*
         * Both halves on ONE page, which is what makes "per key" a claim rather than a hope: the
         * backend's Spanish overlay carries `products-list-page.page-title` and `generic.reset`,
         * and nothing else this page renders. So the heading and the reset button arrive in
         * Spanish while the search button beside it falls back to English — and the page renders
         * throughout rather than showing raw keys, which is what degrading per key means.
         */
        cy.get('h1').should('contain.text', 'Catálogo de productos');
        cy.contains('button', 'Restablecer').should('exist');
        cy.contains('button', 'Search').should('exist');
    });

    /**
     * The download itself, observed. Picking Spanish in the switcher makes the app FETCH the
     * overrides it does not bundle (`GET /locales/es/messages`) and merge them at runtime.
     * Asserted from the browser's own resource timing rather than from `cy.intercept`: the
     * entry is written by the page that made the request, so it stays true however the request
     * is routed, and it cannot pass on an interception the app never actually performed. The
     * per-key fallback rendering above is the proof the merge landed without displacing the
     * bundled languages.
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

        cy.get('[data-test=language-switcher]').first().click();
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
