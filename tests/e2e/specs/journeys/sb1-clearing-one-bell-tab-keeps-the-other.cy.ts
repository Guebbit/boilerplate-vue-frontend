// requires-module: account, cart, notifications, products, tickets
/**
 * @module
 * SB1 · Clearing one bell tab keeps the other. A staff member holds messages on both bell tabs:
 * "Mine" (a pulled product left their cart) and "Work" (a customer opened a ticket). "Clear all"
 * on one tab empties only that tab, and a reload proves it is the server that agrees.
 *
 * - **Mine cleared**: Mine reads empty, and after a reload the Work tab still holds this spec's
 *   ticket notice, told apart by the ticket its "Open it" link points at.
 * - **Work cleared**: "Clear all" empties the whole tab, seeded notices included, so after a
 *   reload the tabs are gone and the cart message is still there.
 *
 * The editor and the customer work through the API: they are the cause, the admin's bell is the
 * subject. The admin's cart is filled through the API too: the bell is under test, not the cart
 * screen (staff see the product table, not the storefront cards). The admin is the staff member,
 * so the ticket is opened by someone else (an actor never hears their own act).
 */

/** The bell's button. */
const BELL = '[data-test=notifications-bell]';

/** The bell's panel. */
const PANEL = '[data-test=notifications-panel]';

/** The cart message's text. */
const CART_MESSAGE = 'Removed from your cart';

/**
 * This spec's own work notice: the row whose "Open it" link goes to its ticket. Its text is the
 * ticket's kind, shared with any other contact message, so the link is what tells it apart.
 *
 * @param ticketId - the ticket the spec opened
 */
const WORK_ROW = (ticketId: string) =>
    `${PANEL} [data-test=notification-target-link][href$="/tickets/${ticketId}"]`;

/** One bell tab's button. */
const TAB = (name: 'mine' | 'work') => `[data-test=notifications-tab-${name}]`;

/** Marks the ticket this spec opens, so the work row can be told from any other. */
const SUBJECT = 'SB1 a question about the cats';

/**
 * The id of the ticket this spec opened, read the way staff would: from the list, by the subject
 * only this spec uses. Asserts there is exactly one, so a second match cannot pass unnoticed.
 */
const openedTicketId = () =>
    cy
        .apiAs<{ items: { id: string; subject: string }[] }>(
            'admin',
            'GET',
            `/tickets?text=${encodeURIComponent(SUBJECT)}`
        )
        .then((list) => {
            const mine = (list?.items ?? []).filter((ticket) => ticket.subject === SUBJECT);
            expect(mine, 'tickets with the spec subject').to.have.length(1);
            return mine[0]?.id ?? '';
        });

/**
 * Leaves the admin with one message on each tab, and the bell open on its panel.
 *
 * @returns the product id (to put the shop back as found) and the ticket id (to find its notice).
 */
const holdOneOnEachTab = () => {
    cy.step('the admin has a product in the cart, then a pulled product leaves a message');
    cy.loginAs('admin');
    return cy.subjectId('product.inStock').then((productId) => {
        cy.apiAs('admin', 'POST', '/cart/items', { productId, quantity: 1 });
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
        cy.get(PANEL).should('contain.text', CART_MESSAGE);
        cy.get(TAB('work')).click();
        return openedTicketId().then((ticketId) => {
            cy.get(WORK_ROW(ticketId)).should('exist');
            return cy.wrap({ productId, ticketId });
        });
    });
};

describe('SB1 · Clearing one bell tab keeps the other', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('clearing Mine leaves the work notice, even after a reload', () => {
        holdOneOnEachTab().then(({ productId, ticketId }) => {
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
            cy.get(WORK_ROW(ticketId)).should('exist');

            // Leave the shop as found.
            cy.apiAs('editor', 'POST', `/products/${productId}/restore`);
        });
    });

    it('clearing Work leaves the cart message, even after a reload', () => {
        holdOneOnEachTab().then(({ productId }) => {
            cy.step('"Clear all" on Work');
            cy.get(TAB('work')).click();
            cy.get('[data-test=notifications-clear-all]').click();

            cy.step('the last work notice is gone, so the tabs go and the cart message stays');
            cy.get(TAB('work')).should('not.exist');
            cy.get(PANEL).should('contain.text', CART_MESSAGE);

            cy.step('after a reload the server agrees');
            cy.reload();
            cy.get(BELL).click();
            cy.get(TAB('work')).should('not.exist');
            cy.get(PANEL).should('contain.text', CART_MESSAGE);

            cy.apiAs('editor', 'POST', `/products/${productId}/restore`);
        });
    });
});
