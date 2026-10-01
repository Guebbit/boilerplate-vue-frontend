// requires-module: account, cart, delivery, inventory, orders, payments, products
/**
 * @module
 * CU3 · Bank transfer, both sides. The customer checks out by bank transfer and is shown where to
 * send the money; the admin finds the order by that reference and records the money arriving; the
 * customer reloads and the order is paid.
 *
 * The story is about the reference being the one handle all three people share, so it is read off
 * the customer's screen, pasted into the admin's search, and read back in the mail. Card budgets
 * are untouched: nothing here confirms a card.
 */
import { addToCartFromStorefront, idFromLocation } from '../../../support/e2e/steps';
import { mailMentions } from '../../../../scripts/e2e/mail-message';

/** A bank reference the admin types when recording the transfer. */
const BANK_REFERENCE = 'E2E-CU3-0001';

/**
 * Reads what `data-test` element shows, squeezed of whitespace — an IBAN and an RF reference are
 * shown grouped, and what matters is the characters.
 *
 * @param selector - a `data-test` selector
 */
const shownWithoutSpaces = (selector: string): Cypress.Chainable<string> =>
    cy
        .get(selector)
        .invoke('text')
        .then((text) => text.replaceAll(/\s+/g, ''));

describe('CU3 · Bank transfer, both sides', { tags: '@smoke' }, () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the customer is told where to pay, the admin records it by reference, and the order is paid', () => {
        cy.step('the customer checks out by bank transfer');
        cy.loginAs('user');
        addToCartFromStorefront('product.rich');
        cy.goToCart();
        // `pickup` needs no address, so the method alone enables the button.
        cy.get('[data-test=shipping-method-pickup]').click();
        cy.get('[data-test=payment-method-bank_transfer]').click();
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
        cy.get('#order-target').should('exist');

        cy.step('reads the instructions, and the copy buttons copy them');
        cy.get('[data-test=transfer-instructions-panel]').should('exist');
        cy.get('[data-test=transfer-iban]').invoke('text').should('not.be.empty');
        cy.get('[data-test=transfer-reference]').invoke('text').should('not.be.empty');
        cy.get('[data-test=transfer-deadline]').invoke('text').should('not.be.empty');
        cy.grantClipboard();
        cy.get('[data-test=transfer-copy-iban]').click();
        shownWithoutSpaces('[data-test=transfer-iban]').then((iban) => {
            cy.window()
                .then((win) => win.navigator.clipboard.readText())
                .should((copied) => {
                    expect(copied.replaceAll(/\s+/g, '')).to.equal(iban);
                });
        });
        cy.get('[data-test=transfer-copy-reference]').click();
        shownWithoutSpaces('[data-test=transfer-reference]').then((reference) => {
            cy.window()
                .then((win) => win.navigator.clipboard.readText())
                .should((copied) => {
                    expect(copied.replaceAll(/\s+/g, '')).to.equal(reference);
                });

            cy.step('the instructions mail carries the same reference');
            cy.accountOf('user').then(({ email }) => {
                cy.emailTo(email, (mail) => mailMentions(mail, reference));
            });

            cy.step('the admin finds the order by the reference and records the money');
            idFromLocation().then((orderId) => {
                cy.switchUser('admin');
                cy.visit('/en/orders');
                cy.get('[data-test=filter-awaiting-transfer] input').check();
                cy.get('form button[type=submit]').click();
                cy.get(`[data-test=row-view][href$="/orders/${orderId}"]`).should('exist');

                cy.get('[data-test=order-reference-search-input] input').type(reference);
                cy.get('[data-test=order-reference-search-submit]').click();
                cy.url().should('match', new RegExp(`/orders/${orderId}/edit$`));

                cy.get('[data-test=record-offline-reference] input').type(BANK_REFERENCE);
                cy.get('[data-test=record-offline-submit]').click();
                cy.get('[data-test=record-offline-payment-error]').should('not.exist');

                cy.step('the order has left the awaiting-transfer list');
                cy.visit('/en/orders');
                cy.get('[data-test=filter-awaiting-transfer] input').check();
                cy.get('form button[type=submit]').click();
                // The seeded transfer still waiting proves the list loaded and the filter held.
                cy.subjectId('order.awaitingTransfer').then((waiting) => {
                    cy.get(`[data-test=row-view][href$="/orders/${waiting}"]`).should('exist');
                });
                cy.get(`[data-test=row-view][href$="/orders/${orderId}"]`).should('not.exist');

                cy.step('the customer reloads the order and it is paid');
                cy.logout();
                cy.loginAs('user');
                cy.visit(`/en/orders/${orderId}`);
                cy.get('[data-test=transfer-instructions-panel]').should('not.exist');
                cy.get('[data-test=payment-offline-detail]').should('contain.text', BANK_REFERENCE);
                cy.get('[data-test=order-download-invoice]').should('exist');
                cy.apiAs<{ status: string }>('user', 'GET', `/orders/${orderId}`).should(
                    (order) => {
                        expect(order?.status).to.equal('paid');
                    }
                );
            });
        });
    });
});
