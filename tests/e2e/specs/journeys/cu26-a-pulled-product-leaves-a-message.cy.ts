// requires-module: account, cart, notifications, products, wishlist
/**
 * @module
 * CU26 · A product is pulled and I am told, in a message that stays. The editor takes a product off
 * sale under a customer who has it in the cart and the wishlist. The customer is told at once,
 * without reloading, by a toast, and the bell keeps one message per list until they delete it.
 *
 * - **Live**: the toast and the badge arrive over the notifications stream.
 * - **Read**: opening the bell lists both and clears the badge, and the messages stay.
 * - **Kept**: a reload brings them back; a deleted one stays deleted; "Clear all" empties the bell.
 *
 * The editor works through the API: it is the cause, and the customer's bell is the subject.
 */
import { addOpenProductToCart, searchAndOpenProduct } from '../../../support/e2e/steps';

/** The bell's button. */
const BELL = '[data-test=notifications-bell]';

/** The bell's unread count, present only while something is unread. */
const BADGE = '[data-test=notifications-badge]';

/** The bell's rows. */
const ROWS = '[data-test=notifications-panel] .v-list-item';

describe('CU26 · A product is pulled and I am told, in a message that stays', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('tells the customer at once, keeps the messages until they are deleted, and lets them clear them all', () => {
        cy.step('the customer has a product in both the cart and the wishlist');
        cy.loginAs('user');
        cy.subjectId('product.inStock').then((productId) => {
            cy.subjectProduct('product.inStock').then(({ title }) => {
                // The seeded customer already saves this product; the cart is the half to add.
                cy.visit('/en/products');
                searchAndOpenProduct('product.inStock');
                addOpenProductToCart();
                cy.visit('/en/wishlist');
                cy.contains('[data-test=wishlist-item]', title).should('exist');
                cy.visit('/en');
                cy.get(BELL).should('exist');
                cy.get(BADGE).should('not.exist');

                cy.step('the editor soft-deletes it: the customer is told without reloading');
                cy.apiAs('editor', 'DELETE', `/products/${productId}`);
                cy.contains('no longer available').should('exist');
                cy.get(BADGE).should('contain.text', '2');

                cy.step(
                    'opening the bell lists both messages, names the product, and clears the badge'
                );
                cy.get(BELL).click();
                cy.get(ROWS).should('have.length', 2);
                cy.get('[data-test=notifications-panel]').should('contain.text', title);
                cy.get('[data-test=notifications-panel]').should(
                    'contain.text',
                    'Removed from your cart'
                );
                cy.get('[data-test=notifications-panel]').should(
                    'contain.text',
                    'Removed from your wishlist'
                );
                cy.get(BADGE).should('not.exist');

                cy.step('a reload brings them back, already read');
                cy.reload();
                cy.get(BELL).should('exist');
                cy.get(BADGE).should('not.exist');
                cy.get(BELL).click();
                cy.get(ROWS).should('have.length', 2);

                cy.step('deleting one removes it for good');
                cy.get('[data-test=notification-delete]').first().click();
                cy.get(ROWS).should('have.length', 1);
                cy.reload();
                cy.get(BELL).click();
                cy.get(ROWS).should('have.length', 1);

                cy.step('"Clear all" empties the bell, and it stays empty after a reload');
                cy.get('[data-test=notifications-clear-all]').click();
                cy.get('[data-test=notifications-empty]').should('exist');
                cy.reload();
                cy.get(BELL).click();
                cy.get('[data-test=notifications-empty]').should('exist');

                // Leave the shop as found.
                cy.apiAs('editor', 'POST', `/products/${productId}/restore`);
            });
        });
    });
});
