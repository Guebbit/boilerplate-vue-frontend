// requires-module: account, cart, delivery, inventory, orders, payments, products
/**
 * @module
 * PS4 · The preorder board through a delay. A paid preorder is due in five days; the admin moves
 * the release date ten days later from the board's own link and confirms what the form says it
 * will do. The board shows the slip and the buyer is mailed. Once the new date has passed the
 * sweep asks the buyer to keep waiting (the row gains an answer-by day and the Late view lists
 * it); a month of silence later the sweep cancels, and the cash is owed back, and the row says why.
 *
 * Demo only: the dates are clock jumps and the sweeps are pulled with the job lever.
 */
import { byTemplate } from '../../../../scripts/e2e/mail-filters';
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

    it('shows the slip, asks after the new date, and cancels and refunds after silence', () => {
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

                cy.step('past the new date the sweep asks the buyer to keep waiting');
                cy.travel(16 * DAY_MS);
                cy.runJob('sweep-preorders');
                cy.loginAs('admin');
                cy.visit('/en/sales/preorders?tab=orders');
                cy.get(`[data-test=preorder-order-link][href*="${orderId}"]`)
                    .closest('tr')
                    .find('[data-test=preorder-answer-by]')
                    .should('exist');
                cy.get('[data-test=preorder-filter-late] input').check({ force: true });
                cy.get(`[data-test=preorder-order-link][href*="${orderId}"]`).should('exist');
                cy.get('[data-test=preorder-filter-late] input').uncheck({ force: true });
                cy.get('[data-test=preorder-filter-due-soon] input').check({ force: true });
                cy.get(`[data-test=preorder-order-link][href*="${orderId}"]`).should('not.exist');
                cy.get('[data-test=preorder-filter-due-soon] input').uncheck({ force: true });

                cy.step('a month of silence later the sweep cancels, and the cash is owed back');
                cy.travel(31 * DAY_MS);
                cy.runJob('sweep-preorders');
                cy.loginAs('admin');
                cy.visit('/en/sales/preorders?tab=orders');
                cy.get(`[data-test=preorder-order-link][href*="${orderId}"]`)
                    .closest('tr')
                    .find('[data-test=preorder-cancel-reason]')
                    .should('exist');
                cy.apiAs<{ status: string }>('admin', 'GET', `/orders/${orderId}`)
                    .its('status')
                    .should('equal', 'cancelled');
                // Paid in cash, so there is no provider to refund through: the money is owed by hand.
                cy.apiAs<{ items: { orderId: string; kind: string }[] }>(
                    'admin',
                    'GET',
                    '/payments/attention'
                ).should((attention) => {
                    expect(
                        attention?.items.some(
                            (item) => item.orderId === orderId && item.kind === 'manual_refund_owed'
                        ),
                        'a refund owed by hand'
                    ).to.equal(true);
                });
            });
        });
    });
});
