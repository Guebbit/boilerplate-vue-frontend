// requires-module: account, products
/**
 * @module
 * FR23 · A busy staff session still ends after a day. An editor who never stops working never idles
 * out, yet 24 hours after signing in the session ends anyway: the next page load answers the login
 * page, which remembers the edit page they were on. The 24 hours are an absolute cap, not a
 * timeout: the idle rule cannot bound a session that is kept in use. A shopper's session has no
 * such cap and carries on past the same day.
 *
 * Both clocks move together (`travelEverywhere`): the server's decides when the session ends. The
 * editor "stays busy" by reloading the page every 25 minutes, inside the 30-minute idle limit, so
 * the only rule left to end the session is the cap. Both session modes: a bearer session and a
 * cookie session end the same way.
 */
import { answerChallengePage } from '../../../support/e2e/login-challenge';

/** One minute, in milliseconds. */
const MINUTE_MS = 60_000;

/** How far each reload of the busy editor is from the last: under the 30-minute staff idle limit. */
const HOP_MINUTES = 25;

/** Hops that keep the editor busy up to 23 h 45 min after sign-in: inside the 24-hour cap. */
const HOPS_INSIDE_THE_CAP = 57;

/** The code the idle rule answers with: the journey must see the CAP end the session, not this. */
const IDLE_CODE = 'SESSION_IDLE';

/**
 * Signs a seeded account in through the form with "remember me" ticked, so its session tier is
 * longer than the staff cap and only the cap can end it.
 *
 * @param role - the seeded persona
 */
const signInRemembering = (role: 'editor' | 'user'): void => {
    cy.accountOf(role).then(({ email, password, totpSecret }) => {
        cy.visit('/en/login');
        cy.get('[type=email]').should('not.be.disabled').clear();
        cy.get('[type=email]').type(email);
        cy.get('[type=password]').clear();
        cy.get('[type=password]').type(password);
        cy.get('[type=checkbox]').check({ force: true });
        cy.get('form').submit();
        // A staff account asks the code of its authenticator app next.
        if (totpSecret) answerChallengePage(totpSecret);
        cy.url().should('not.include', '/login');
    });
};

describe('FR23 · A busy staff session still ends after a day', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    // A regular `function`, so Mocha's `this.skip()` works.
    it('ends the editor 24 hours after sign-in however busy, and remembers the page', function () {
        cy.skipUnlessDemo();

        cy.subjectId('product.inStock').then((productId) => {
            const editPath = `/en/products/${productId}/edit`;
            const errorCodes: string[] = [];
            cy.intercept('**/account/**', (request) => {
                request.continue((response) => {
                    const body = response.body as { errors?: { code?: string }[] } | string;
                    if (typeof body === 'object') {
                        for (const error of body.errors ?? []) errorCodes.push(error.code ?? '');
                    }
                });
            });

            cy.step('the editor signs in remembering the device and opens the edit page');
            signInRemembering('editor');
            cy.visit(editPath);
            cy.get('[data-test=product-price-field] input').should('not.have.value', '');

            cy.step('every 25 minutes they reload the page: never idle, and still signed in');
            for (let hop = 0; hop < HOPS_INSIDE_THE_CAP; hop += 1) {
                cy.travelEverywhere(HOP_MINUTES * MINUTE_MS);
                cy.reload();
                // The price arrives from an authenticated read: waiting for it is waiting for the
                // reload to have counted as the editor acting, before the clock moves again.
                cy.get('[data-test=product-price-field] input').should('not.have.value', '');
                cy.location('pathname').should('equal', editPath);
            }

            cy.step('past the 24 hours since sign-in, the very next load ends the session');
            cy.travelEverywhere(HOP_MINUTES * MINUTE_MS);
            cy.reload();
            cy.get('#login-page').should('exist');
            cy.location('search').then((search) => {
                expect(decodeURIComponent(search)).to.include(`continue=${editPath}`);
            });

            cy.step('it was the cap that ended it, never the idle rule');
            cy.then(() => {
                expect(errorCodes).to.not.include(IDLE_CODE);
            });
        });
    });

    it('does not end a shopper session after the same day', function () {
        cy.skipUnlessDemo();

        cy.step('the shopper signs in remembering the device');
        signInRemembering('user');

        cy.step('25 hours later the shopper is still signed in');
        cy.travelEverywhere(25 * 60 * MINUTE_MS);
        cy.reload();
        cy.url().should('not.include', '/login');
        cy.get('[data-test=nav-login-link]').should('not.exist');
    });
});
