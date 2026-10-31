// requires-module: account, cart, notifications, products, tickets
/**
 * @module
 * SB1 · Clearing one bell tab keeps the other. A staff member holds messages on both bell tabs:
 * "Mine" (a pulled product left their cart) and "Work" (a customer opened a ticket). "Clear all"
 * on one tab empties only that tab, and a reload proves it is the server that agrees.
 *
 * - **Mine cleared**: after a reload the Work tab still lists the ticket notice.
 * - **Work cleared**: after a reload the tabs are gone (no work notice is left) and the cart
 *   message is still there.
 *
 * The editor and the customer work through the API: they are the cause, the admin's bell is the
 * subject. The admin is the staff member, so the ticket is opened by someone else (an actor never
 * hears their own act).
 */
import { addOpenProductToCart, searchAndOpenProduct } from '../../../support/e2e/steps';

/** The bell's button. */
const BELL = '[data-test=notifications-bell]';

/** The bell's rows. */
const ROWS = '[data-test=notifications-panel] .v-list-item';

/** One bell tab's button. */
const TAB = (name: 'mine' | 'work') => `[data-test=notifications-tab-${name}]`;

/** Marks the ticket this spec opens, so the work row can be told from any other. */
const SUBJECT = 'SB1 a question about the cats';

/**
 * Leaves the admin with one message on each tab, and the bell open on its panel.
 *
 * @returns the product id, so the caller can put the shop back as found.
 */
const holdOneOnEachTab = () => {
    cy.step('the admin has a product in the cart, then a pulled product leaves a message');
    cy.loginAs('admin');
    return cy.subjectId('product.inStock').then((productId) => {
        cy.visit('/en/products');
        searchAndOpenProduct('product.inStock');
        addOpenProductToCart();
        cy.visit('/en');
        cy.get(BELL).should('exist');
        cy.apiAs('editor', 'DELETE', `/products/${productId}`);
        cy.contains('no longer available').should('exist');

        cy.step('a customer opens a ticket, and the admin gets a work notice for it');
        cy.apiAs('user', 'POST', '/tickets', {
            email: 'sb1-customer@example.com',
            subject: SUBJECT,
            message: 'Are they really illegal in 400 countries?'
        });

        cy.step('the bell splits into Mine and Work, one message on each');
        cy.get(BELL).click();
        cy.get(TAB('work')).should('exist');
        cy.get(TAB('mine')).click();
        cy.get(ROWS).should('have.length', 1);
        cy.get('[data-test=notifications-panel]').should('contain.text', 'Removed from your cart');
        cy.get(TAB('work')).click();
        cy.get(ROWS).should('have.length', 1);
        return cy.wrap(productId);
    });
};

describe('SB1 · Clearing one bell tab keeps the other', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('clearing Mine leaves the work notice, even after a reload', () => {
        holdOneOnEachTab().then((productId) => {
            cy.step('"Clear all" on Mine');
            cy.get(TAB('mine')).click();
            cy.get('[data-test=notifications-clear-all]').click();
            cy.get('[data-test=notifications-empty]').should('exist');

            cy.step('after a reload Mine is empty and Work still has its row');
            cy.reload();
            cy.get(BELL).click();
            cy.get(TAB('mine')).click();
            cy.get('[data-test=notifications-empty]').should('exist');
            cy.get(TAB('work')).click();
            cy.get(ROWS).should('have.length', 1);

            // Leave the shop as found.
            cy.apiAs('editor', 'POST', `/products/${productId}/restore`);
        });
    });

    it('clearing Work leaves the cart message, even after a reload', () => {
        holdOneOnEachTab().then((productId) => {
            cy.step('"Clear all" on Work');
            cy.get(TAB('work')).click();
            cy.get('[data-test=notifications-clear-all]').click();

            cy.step('the last work notice is gone, so the tabs go and the cart message stays');
            cy.get(TAB('work')).should('not.exist');
            cy.get(ROWS).should('have.length', 1);

            cy.step('after a reload the server agrees');
            cy.reload();
            cy.get(BELL).click();
            cy.get(TAB('work')).should('not.exist');
            cy.get(ROWS).should('have.length', 1);
            cy.get('[data-test=notifications-panel]').should(
                'contain.text',
                'Removed from your cart'
            );

            cy.apiAs('editor', 'POST', `/products/${productId}/restore`);
        });
    });
});
