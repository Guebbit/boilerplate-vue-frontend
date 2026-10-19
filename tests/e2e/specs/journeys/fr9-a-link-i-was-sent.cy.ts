// requires-module: account, orders, returns
/**
 * @module
 * FR9 · I was sent a link, but I'm not logged in. A customer opens an order link from a mail with no
 * session: they are asked to log in, log in on the very page they are shown, and land on THAT order,
 * not on the home page. Someone else's order, or someone else's return, is a not-found page — never
 * a page stuck loading, and never a crash.
 *
 * The API answers 404, not 403, for a record another customer owns, so the visitor learns nothing
 * about whether it exists; the page says so through the shell's Error page.
 */
import { answerChallengePage } from '../../../support/e2e/login-challenge';

/**
 * Fills the login form on the page it is shown and submits it.
 *
 * @param role - the seeded persona to sign in as
 */
const signIn = (role: 'user' | 'manager') => {
    cy.accountOf(role).then(({ email, password, totpSecret }) => {
        cy.get('[type=email]').should('not.be.disabled').clear();
        cy.get('[type=email]').type(email);
        cy.get('[type=password]').clear();
        cy.get('[type=password]').type(password);
        cy.get('form').submit();
        // A staff sign-in answers its authenticator code next.
        if (totpSecret) answerChallengePage(totpSecret);
    });
};

describe('FR9 · I was sent a link, but I am not logged in', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('logging in lands on the order that was linked, and a stranger’s order or return is not found', () => {
        cy.subjectId('order.paid').then((orderId) => {
            cy.step('a guest opens the link and is asked to log in, with the order remembered');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('#login-page').should('exist');
            cy.location('search').should('include', 'continue=');
            cy.location('search').then((search) => {
                expect(decodeURIComponent(search)).to.include(`/en/orders/${orderId}`);
            });

            cy.step('logging in on that very page lands on the linked order, not the home page');
            cy.accountOf('user').then(({ email, password }) => {
                cy.get('[type=email]').should('not.be.disabled').clear();
                cy.get('[type=email]').type(email);
                cy.get('[type=password]').clear();
                cy.get('[type=password]').type(password);
                cy.get('form').submit();
            });
            cy.location('pathname').should('equal', `/en/orders/${orderId}`);
            cy.get('#order-target').should('exist');
            cy.get('[data-test=order-number]').should('exist');
            cy.get('#home-page').should('not.exist');
        });

        cy.step("someone else's order is a not-found page, not a page stuck loading");
        cy.subjectId('order.otherPending').then((strangersOrder) => {
            cy.visit(`/en/orders/${strangersOrder}`);
        });
        cy.get('#error-page').should('exist');
        cy.location('pathname').should('equal', '/en/error/404/error-page.not-found');
        cy.get('#order-target').should('not.exist');

        cy.step("someone else's return is the same: the customer's own return, read by a stranger");
        cy.switchUser('editor');
        cy.subjectId('return.requested').then((strangersReturn) => {
            cy.visit(`/en/returns/${strangersReturn}`);
        });
        cy.get('#error-page').should('exist');
        cy.get('#return-target').should('not.exist');
    });

    it('a staff link sent to a customer turns back with a notice, and to the right staff opens', () => {
        cy.subjectId('order.paid').then((orderId) => {
            const staffLink = `/en/orders/${orderId}/edit`;
            cy.step('a guest opens a staff link and is asked to log in');
            cy.visit(staffLink);
            cy.get('#login-page').should('exist');
            cy.location('search').should('include', 'continue=');

            cy.step('a customer signing in is turned back to Home with a notice, with no loop');
            signIn('user');
            cy.get('#home-page').should('exist');
            cy.location('pathname').should('equal', '/en');
            cy.get('.v-alert').should('exist');

            cy.step('the same link, opened by a guest who is staff, lands on the edit page');
            cy.restore();
            cy.visit(staffLink);
            cy.get('#login-page').should('exist');
            signIn('manager');
            cy.location('pathname').should('equal', staffLink);
        });
    });
});
