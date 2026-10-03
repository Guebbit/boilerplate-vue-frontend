/**
 * The catalogue's own stake in the locale layer — moved out of the central
 * `tests/e2e/specs/locale.cy.ts`: both cases below are product-specific at the DATA
 * level, not just the page choice, so they go with this module rather than a foundation page that
 * cannot stand in for them.
 *
 * `useProductsStore`'s dictionary is keyed by product id alone, so nothing about the cached
 * record says which language filled it in. A switch has to drop it and refetch, or a product
 * page reads the language the visitor just left. The store scopes its cache by locale
 * (`dependsOn`), and no foundation module holds server text that way, so there is no page to move
 * this to instead of deleting it with the module.
 */
describe('switching language drops and refetches locale-sensitive stores', () => {
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
            cy.get('[data-test=language-option-it]').click();
            cy.url().should('include', '/it/');

            // The router keeps this same page — `products/:id` carries no locale of its own — so
            // an implementation that only cleared the cache on NAVIGATION and not on the switch
            // itself would still be showing the English title here.
            cy.contains(itTitle).should('exist');
            cy.contains(enTitle).should('not.exist');

            cy.get('[data-test=language-switcher]').first().click();
            cy.get('[data-test=language-option-en]').click();
            cy.url().should('include', '/en/');
            cy.contains(enTitle).should('exist');
            cy.contains(itTitle).should('not.exist');
        });
    });
});

/**
 * A language the API has and this app does not, watched through the ONE page the demo backend
 * seeds a Spanish translation OVERRIDE for (`products-list-page.page-title`, `generic.reset` —
 * `scenarios/locales.ts` in the backend repo). That data coupling, not just the route, is why
 * this case cannot move to a foundation page without also reseeding the backend's demo data.
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
        cy.get('[data-test=language-option-es]').click();

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
