// requires-module: account, cart, delivery, inventory, orders, payments, products
/**
 * @module
 * PS4 · The preorder board through a delay. A paid preorder is due in five days; the admin moves
 * the release date ten days later from the board's own link and confirms what the form says it
 * will do. The board shows the slip and the buyer is mailed. Once the new date has passed the
 * sweep tells the buyer once more (the Late view lists the row). A month of silence later nothing
 * has been cancelled: the shop tells and a person decides, so the order is still waiting.
 *
 * Demo only: the dates are clock jumps and the sweeps are pulled with the job lever.
 */
import { byTemplate } from '../../../../scripts/e2e/mail-filters';
import { mailMentions } from '../../../../scripts/e2e/mail-message';
import { paidPreorderBy, preorderOnSale, releaseDateIn } from '../../../support/e2e/steps';

/** One day in milliseconds, for the clock jumps. */
const DAY_MS = 86_400_000;

describe('PS4 · The preorder board through a delay', () => {
    beforeEach(() => {
        cy.skipUnlessDemo();
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('shows the slip, tells the buyer once the date passes, and cancels nothing on its own', () => {
        const title = `PS4 preorder ${String(Date.now())}`;
        preorderOnSale({ releaseInDays: 5, limit: 2, title }).then((productId) => {
            paidPreorderBy(productId).then((orderId) => {
                cy.step('the admin follows the board’s link and moves the date ten days later');
                cy.loginAs('admin');
                cy.visit('/en/sales/preorders');
                cy.contains('[data-test=preorder-products] tr', title)
                    .find('[data-test=preorder-move-date]')
                    .click();
                cy.get('[data-test=product-release-date-field] input').should('not.have.value', '');
                cy.get('[data-test=product-release-date-field] input').clear();
                cy.get('[data-test=product-release-date-field] input').type(releaseDateIn(15));
                cy.get('form').first().submit();
                cy.get('[data-test=app-dialog-confirm]').click();
                cy.contains('Product updated successfully').should('exist');

                cy.step('the board shows the slip, and the buyer is mailed');
                cy.visit('/en/sales/preorders?tab=orders');
                cy.get(`[data-test=preorder-order-link][href*="${orderId}"]`)
                    .closest('tr')
                    .find('[data-test=preorder-slipped]')
                    .should('exist');
                cy.accountOf('user').then(({ email }) => {
                    cy.emailTo(email, byTemplate('delivery.fulfillment-delayed'));
                });

                cy.step('past the new date the sweep tells the buyer once more');
                cy.travel(16 * DAY_MS);
                cy.runJob('sweep-preorders');
                cy.accountOf('user').then(({ email }) => {
                    cy.emailTo(email, (mail) => mailMentions(mail, 'Part of your order is late'));
                });
                cy.loginAs('admin');
                cy.visit('/en/sales/preorders?tab=orders');
                cy.get(`[data-test=preorder-order-link][href*="${orderId}"]`)
                    .closest('tr')
                    .find('[data-test=preorder-answer-by]')
                    .should('not.exist');
                cy.get('[data-test=preorder-filter-late] input').check({ force: true });
                cy.get(`[data-test=preorder-order-link][href*="${orderId}"]`).should('exist');
                cy.get('[data-test=preorder-filter-late] input').uncheck({ force: true });
                cy.get('[data-test=preorder-filter-due-soon] input').check({ force: true });
                cy.get(`[data-test=preorder-order-link][href*="${orderId}"]`).should('not.exist');
                cy.get('[data-test=preorder-filter-due-soon] input').uncheck({ force: true });

                cy.step('a month of silence later nothing was cancelled: a person decides');
                cy.travel(31 * DAY_MS);
                cy.runJob('sweep-preorders');
                cy.loginAs('admin');
                cy.visit('/en/sales/preorders?tab=orders');
                cy.get(`[data-test=preorder-order-link][href*="${orderId}"]`)
                    .closest('tr')
                    .find('[data-test=preorder-cancel-reason]')
                    .should('not.exist');
                cy.apiAs<{ status: string }>('admin', 'GET', `/orders/${orderId}`)
                    .its('status')
                    .should('not.equal', 'cancelled');
            });
        });
    });
});
