// requires-module: account, cart, delivery, feedback, inventory, orders, payments, products
/**
 * @module
 * CU24 · Prove you are human. A backend with a human-check provider on does not nag an honest
 * customer: the first card attempt goes through the ordinary way, and only a retry after a decline
 * carries the check. The visitor solves it, presses pay again and the order is paid. A guest's
 * contact form has no such grace: the check is on the page from the start, a send without its
 * token is refused (`ANTIBOT_VERIFICATION_FAILED`) and a send with it is accepted.
 *
 * Runs in the antibot shard only: the backend there boots the `altcha` provider with a low cost
 * (`scripts/e2e/antibot-backend.ts`), so a solve takes milliseconds.
 */
import {
    addToCartFromStorefront,
    idFromLocation,
    solveHumanCheck
} from '../../../support/e2e/steps';

/** One ticket as far as this story reads it. */
interface TicketLike {
    subject: string;
}

/**
 * The tickets the admin's inbox holds for a subject.
 *
 * @param subject - the unique subject
 */
const ticketsAbout = (subject: string): Cypress.Chainable<TicketLike[]> =>
    cy
        .apiAs<{ items: TicketLike[] }>('admin', 'POST', '/feedback/search', { text: subject })
        .then((found) => found?.items ?? []);

/**
 * Fills the contact form and presses send, without touching the human check.
 *
 * @param subject - the ticket's subject, unique to the story
 */
const writeToTheShop = (subject: string): void => {
    cy.get('[data-test=contact-email] input').type('cu24.guest@example.com');
    cy.get('[data-test=contact-subject] input').type(subject);
    cy.textareaIn('contact-message').type('Is the course still on sale next month? Thank you.');
    cy.get('[data-test=contact-submit]').click();
};

describe('CU24 · Prove you are human', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('shows the check only after a decline, and a guest cannot write without it', () => {
        cy.step('the customer checks out and the first card attempt is declined, check-free');
        cy.loginAs('user');
        addToCartFromStorefront('product.rich');
        cy.goToCart();
        // `pickup` needs no address, so the method alone enables the button.
        cy.get('[data-test=shipping-method-pickup]').click();
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
        cy.get('#order-target').should('exist');
        cy.get('[data-test=human-check-altcha]').should('not.exist');
        cy.payWith('Card the issuer declines');
        cy.get('[data-test=payment-panel-error]').should('exist');
        cy.get('[data-test=human-check-altcha]').should('not.exist');

        idFromLocation().then((orderId) => {
            cy.step('paying again is refused until the check is solved: the widget appears');
            cy.payWith('Card that pays');
            cy.get('[data-test=human-check-altcha]').should('exist');
            cy.get('[data-test=payment-status]').should('not.exist');
            cy.apiAs<{ status: string }>('user', 'GET', `/orders/${orderId}`).should((order) => {
                expect(order?.status, 'the refused attempt paid nothing').to.equal('pending');
            });

            cy.step('the visitor solves it and presses pay again: the order is paid');
            solveHumanCheck();
            cy.get('[data-test=payment-submit]').click();
            cy.get('[data-test=payment-status]').should('contain.text', 'Paid');
            cy.get('[data-test=human-check-altcha]').should('not.exist');
            cy.apiAs<{ status: string }>('user', 'GET', `/orders/${orderId}`).should((order) => {
                expect(order?.status).to.equal('paid');
            });
        });

        cy.step('a guest meets the check on the contact form from the start');
        cy.logout();
        cy.visit('/en/contact');
        cy.get('#contact-page').should('exist');
        cy.get('[data-test=human-check-altcha]').should('exist');

        cy.step('a send without its token is refused, and no ticket is made');
        const run = String(Date.now());
        const refused = `CU24 refused ${run}`;
        writeToTheShop(refused);
        cy.get('[data-test=contact-submit-error]').should('be.visible');
        cy.get('[data-test=contact-subject] input').should('have.value', refused);
        ticketsAbout(refused).should('have.length', 0);

        cy.step('solving the check lets the same send through');
        solveHumanCheck();
        cy.get('[data-test=contact-submit]').click();
        cy.get('[data-test=contact-subject] input').should('have.value', '');
        cy.get('[data-test=contact-submit-error]').should('not.exist');
        ticketsAbout(refused).should('have.length', 1);
    });
});
