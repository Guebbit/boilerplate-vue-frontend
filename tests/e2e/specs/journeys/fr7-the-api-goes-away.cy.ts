// requires-module: feedback, products
/**
 * @module
 * FR7 · The API goes away mid-session. A visitor is using the shop when the connection to the API
 * drops. What they see must be honest and recoverable: the page they were on stays put, a toast says
 * the server could not be reached, the form they half-filled keeps every word, and once the API
 * answers again the same button works, with nothing retyped.
 *
 * The API is a stub on purpose (`forceNetworkError`): the story is about the UI's reaction, not the
 * backend's. The health banner is the one piece that does not notice by itself. The app probes the
 * API at startup and whenever the browser reports coming back `online`, then slowly while down, so
 * the story fires that event instead of waiting out the retry timer.
 */

/** What a readable failure must not look like: a raw code or a value that was never a sentence. */
const UNREADABLE = /undefined|\[object|network error|null/i;

/**
 * Tells the page the browser is back online — the signal the health probe re-runs on.
 */
const fireOnline = (): void => {
    cy.window().then((win) => {
        win.dispatchEvent(new win.Event('online'));
    });
};

describe('FR7 · The API goes away mid-session', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('keeps the page and the typed words, says it in a sentence, and recovers when the API answers', () => {
        cy.env(['apiUrl']).then(({ apiUrl }) => {
            const everything = `${String(apiUrl)}/**`;
            const healthCheck = { method: 'GET', url: `${String(apiUrl)}/` } as const;

            cy.step('the visitor is on the catalogue, with products on screen');
            cy.visit('/en/products');
            cy.get('[data-test=product-card]').should('have.length.at.least', 1);
            cy.get('[data-test=health-banner]').should('not.exist');

            cy.step('the API stops answering: a search is refused politely and the page stays');
            cy.intercept(everything, { forceNetworkError: true }).as('down');
            cy.get('[data-test=filter-text] input').type('dog{enter}');
            cy.get('[role=region] .v-alert')
                .should('be.visible')
                .invoke('text')
                .should((toast) => {
                    expect(toast.trim().length, 'a sentence').to.be.greaterThan(20);
                    expect(toast).not.to.match(UNREADABLE);
                });
            cy.get('#products-list-page').should('exist');
            cy.get('[data-test=product-card]').should('have.length.at.least', 1);

            cy.step('the banner appears when the browser re-checks, and only then');
            cy.get('[data-test=health-banner]').should('not.exist');
            fireOnline();
            cy.get('[data-test=health-banner]').should('be.visible');

            cy.step(
                'a half-typed message keeps every word when sending fails, with a way to retry'
            );
            cy.visit('/en/contact');
            cy.get('[data-test=contact-email] input').type('fr7.visitor@example.com');
            cy.get('[data-test=contact-subject] input').type('A question about delivery');
            cy.textareaIn('contact-message').type(
                'Do you deliver on Sundays? I would like to know.'
            );
            cy.get('[data-test=contact-submit]').click();
            cy.get('[data-test=contact-submit-error]')
                .should('be.visible')
                .invoke('text')
                .should((shown) => {
                    expect(shown.trim().length, 'a sentence').to.be.greaterThan(20);
                    expect(shown).not.to.match(UNREADABLE);
                });
            cy.get('[data-test=contact-email] input').should(
                'have.value',
                'fr7.visitor@example.com'
            );
            cy.get('[data-test=contact-subject] input').should(
                'have.value',
                'A question about delivery'
            );
            cy.textareaIn('contact-message').should(
                'have.value',
                'Do you deliver on Sundays? I would like to know.'
            );
            cy.get('[data-test=contact-submit]').should('not.be.disabled');

            cy.step('the API answers again: the banner goes, and the same button now works');
            // A newer intercept runs first; letting the request continue is what "answering" means.
            cy.intercept(everything, (request) => {
                request.continue();
            });
            cy.intercept(healthCheck, (request) => {
                request.continue();
            });
            fireOnline();
            cy.get('[data-test=health-banner]').should('not.exist');
            cy.get('[data-test=contact-submit]').click();
            cy.get('[data-test=contact-subject] input').should('have.value', '');
            cy.get('[data-test=contact-submit-error]').should('not.exist');
        });
    });
});
