// requires-module: account, users
/**
 * @module
 * AC18 · A bot-shaped login meets the human check. A visitor who keeps typing the wrong password is
 * not yet a bot: the first misses are answered as misses. Once the account's failure budget is
 * half spent, the next try carries a human check; the widget appears on the login page, the visitor
 * solves it and the right password signs in. Password reset and signup, which a script farms the
 * most, ask for the check from the start and refuse a send without its token.
 *
 * Runs in the antibot shard only. That backend pins the per-account login budget at 6
 * (`scripts/e2e/antibot-backend.ts`), so the check is three wrong passwords away. The account is
 * the seeded pending-email customer, which no other antibot journey signs in as: its failures are
 * counted per address, and a shared account would carry them into the other tests in the run. An
 * admin can no longer create an account with a password, so there is no made-for-the-story one.
 */
import { fillSignupForm, solveHumanCheck } from '../../../support/e2e/steps';

/** The story's account, read from the seed when the story starts. */
const OWNER = { email: '', password: '' };

/** A newcomer who signs up at the end, with an address of their own. */
const NEWCOMER = {
    email: `ac18-newcomer-${String(Date.now())}@example.com`,
    password: 'Newcomer-Passw0rd!x'
};

/**
 * Fills the login form and submits it, without expecting to leave the page.
 *
 * @param password - the password to type; the address is the story's account
 */
const attemptLogin = (password: string): void => {
    cy.get('[type=email]').clear();
    cy.get('[type=email]').type(OWNER.email);
    cy.get('[type=password]').clear();
    cy.get('[type=password]').type(password);
    cy.get('form').submit();
};

describe('AC18 · A bot-shaped login meets the human check', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('asks for the check only once the misses pile up, and signup and reset ask from the start', () => {
        cy.step('an account exists for the story');
        cy.accountOf('pendingEmail').then(({ email, password }) => {
            OWNER.email = email;
            OWNER.password = password;
        });

        cy.step('the first wrong passwords are answered as wrong passwords, with no check');
        cy.visit('/en/login');
        attemptLogin(`${OWNER.password}-wrong`);
        cy.get('[data-test=login-error]').should('be.visible');
        attemptLogin(`${OWNER.password}-wrong`);
        cy.get('[data-test=login-error]').should('be.visible');
        cy.get('[data-test=human-check-altcha]').should('not.exist');

        cy.step('the third wrong password is the one that is asked to prove itself');
        attemptLogin(`${OWNER.password}-wrong`);
        cy.get('[data-test=human-check-altcha]').should('exist');
        cy.location('pathname').should('equal', '/en/login');

        cy.step('solving the check lets the right password in');
        solveHumanCheck();
        attemptLogin(OWNER.password);
        cy.url().should('not.include', '/login');
        cy.get('[data-test=nav-login-link]').should('not.exist');
        cy.logout();

        cy.step('the reset request has the check from the start, and is refused without its token');
        cy.intercept('POST', '**/account/reset').as('reset');
        cy.visit('/en/password-reset');
        cy.get('[data-test=human-check-altcha]').should('exist');
        cy.get('[data-test=password-reset-email] input').type(OWNER.email);
        cy.get('form').submit();
        cy.wait('@reset').its('response.statusCode').should('equal', 401);
        cy.get('[data-test=password-reset-request-error]').should('be.visible');

        cy.step('solved, the same request is accepted');
        solveHumanCheck();
        cy.get('form').submit();
        cy.wait('@reset').its('response.statusCode').should('be.within', 200, 299);
        cy.get('[data-test=password-reset-request-error]').should('not.exist');

        cy.step('signup has the check from the start, and is refused without its token');
        cy.intercept('POST', '**/account/signup').as('signup');
        cy.visit('/en/signup');
        cy.get('[data-test=human-check-altcha]').should('exist');
        fillSignupForm(NEWCOMER.email, NEWCOMER.password);
        cy.wait('@signup').its('response.statusCode').should('equal', 401);
        cy.get('[data-test=signup-error]').should('be.visible');
        cy.location('pathname').should('equal', '/en/signup');

        cy.step('solved, the same signup creates the account');
        solveHumanCheck();
        cy.get('#signup-page button[type="submit"]').click();
        cy.wait('@signup').its('response.statusCode').should('be.within', 200, 299);
        cy.get('#home-page').should('exist');
    });
});
