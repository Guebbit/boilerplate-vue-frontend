// requires-module: account
/**
 * @module
 * FR6 · Too many attempts. A person who keeps getting the password wrong is, sooner or later,
 * refused by the backend's budget with a 429. The form must say THAT ("try again shortly"), not
 * keep repeating "wrong password", must stay on the login page with the address still typed, and
 * must let the next honest attempt through once the budget is back.
 *
 * The 429 is a stub on purpose: the real budget is proven by the backend's own tests, and a
 * budget spent for real would carry over to every later spec on a live backend. What is REAL is
 * its shape: the reject envelope `generateReject` builds (`status`, the HTTP phrase in `message`,
 * the `RATE_LIMITED` item in `errors`) and the `Retry-After` header `express-rate-limit` adds.
 */

/** What the backend answers when a budget runs out: `refuse` in its rate-limit middleware. */
const RATE_LIMITED = {
    success: false,
    status: 429,
    message: 'Too Many Requests',
    errors: [{ code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' }]
};

/**
 * Fills the login form and submits it, without expecting to leave the page.
 *
 * @param email - the address to type
 * @param password - the password to type
 */
const attemptLogin = (email: string, password: string): void => {
    cy.get('[type=email]').clear();
    cy.get('[type=email]').type(email);
    cy.get('[type=password]').clear();
    cy.get('[type=password]').type(password);
    cy.get('form').submit();
};

describe('FR6 · Too many attempts', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en/login');
    });

    it('says the budget is spent, not that the password is wrong, and lets the next honest try through', () => {
        cy.accountOf('user').then(({ email, password }) => {
            cy.step('a wrong password is answered as a wrong password');
            attemptLogin(email, `${password}-wrong`);
            cy.get('[data-test=login-error]')
                .should('be.visible')
                .invoke('text')
                .then((wrongPassword) => {
                    cy.step('the budget runs out: the answer is a 429 with the real envelope');
                    cy.intercept('POST', '**/account/login', {
                        statusCode: 429,
                        headers: { 'retry-after': '60' },
                        body: RATE_LIMITED
                    }).as('refused');
                    attemptLogin(email, `${password}-wrong`);
                    cy.wait('@refused');
                    cy.get('[data-test=login-error]').should(
                        'contain.text',
                        'Too many requests. Try again shortly.'
                    );
                    cy.get('[data-test=login-error]').should(
                        'not.contain.text',
                        wrongPassword.trim()
                    );

                    cy.step('nothing bounces: still on the login page, the address still typed');
                    cy.location('pathname').should('equal', '/en/login');
                    cy.get('[type=email]').should('have.value', email);
                    cy.get('#login-page').should('exist');
                });

            cy.step('the budget is back: the honest attempt goes through');
            cy.intercept('POST', '**/account/login', (request) => request.continue());
            attemptLogin(email, password);
            cy.url().should('not.include', '/login');
            cy.get('[data-test=nav-login-link]').should('not.exist');
        });
    });
});
