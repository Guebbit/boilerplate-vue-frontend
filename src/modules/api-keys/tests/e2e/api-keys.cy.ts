/**
 * @module
 * Cypress end-to-end spec driving the real app: list and mint/revoke for the admin-only api-keys
 * module. The a11y sweep is its own spec; this one is the
 * functional coverage of the mint/revoke flow.
 */

/** A value unique enough per run that two specs racing the same backend cannot collide. */
const unique = () => `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

describe('API keys', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.loginAs('admin');
    });

    describe('List', () => {
        beforeEach(() => {
            cy.visit('/en/api-keys');
        });

        it('shows the page title', () => {
            cy.get('#api-keys-list-page').should('exist');
            cy.get('h1').should('contain.text', 'API keys');
        });

        it('offers a create link for the admin', () => {
            cy.contains('a, button', 'New credential').should('exist');
        });
    });

    describe('Mint and revoke', () => {
        it('mints a credential through the real form, reveals the secret once, then revokes it', () => {
            const name = `e2e-key-${unique()}`;

            cy.visit('/en/api-keys/create');
            cy.get('[data-test=api-key-name] input').type(name);
            cy.get('[data-test=api-key-permissions] input').type('products.any.read{enter}');
            cy.get('form').submit();

            // The secret is shown exactly once, in a modal — never again after "Done".
            cy.get('[data-test=secret-reveal]').should('be.visible');
            cy.get('[data-test=secret-reveal-value]').invoke('text').should('match', /\S+/);
            cy.get('[data-test=secret-reveal-confirm-saved] input').click();
            cy.get('[data-test=secret-reveal-continue]').click();

            cy.url().should('include', '/api-keys').and('not.include', '/create');
            cy.contains('Credential minted').should('exist');

            // A large page size, since this list has no search of its own — the newly minted
            // credential has to be somewhere on the one page this fetches.
            cy.pickOption('[data-test=page-size]', '50');
            cy.contains('[data-test=list-row]', name).within(() => {
                cy.get('[data-test=row-revoke]').should('not.be.disabled').click();
            });
            cy.get('[data-test=app-dialog-confirm]').click();

            cy.contains('[data-test=list-row]', name).within(() => {
                cy.get('[data-test=row-revoke]').should('be.disabled');
            });
        });
    });
});
