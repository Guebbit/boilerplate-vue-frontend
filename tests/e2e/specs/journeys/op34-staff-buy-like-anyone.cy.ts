// requires-module: account, cart, orders, payments
/**
 * @module
 * OP34 · A staff member buys for themselves. Every signed-in account is a customer of the shop, so
 * a warehouse worker fills a basket from the storefront, checks out and pays by card like anyone,
 * and reads their own order. A moderator may refund their own order, since the refund rule asks
 * for the permission and not whose order it is; the refund is audited as the moderator's own.
 */
import { addToCartFromStorefront, eventually, fillAddressDialog } from '../../../support/e2e/steps';

/** One audit row, as far as this story reads it. */
interface AuditRowLike {
    metadata?: { ownOrder?: boolean };
}

/**
 * From a basket holding one product, ships to a freshly added address and pays by card.
 *
 * @param product - the `product.*` guarantee name to buy
 * @returns a chain yielding the new order's id
 */
const buyByCard = (product: string): Cypress.Chainable<string> => {
    addToCartFromStorefront(product);
    cy.goToCart();
    cy.get('[data-test=cart-item]').should('have.length', 1);
    cy.get('[data-test=shipping-method-standard]').click();
    cy.get('[data-test=address-picker-add]').click();
    fillAddressDialog({
        label: 'Work',
        fullName: 'Staff Buyer',
        street: 'Via Emilia 2',
        zip: '41121',
        city: 'Modena',
        country: 'Italy'
    });
    cy.get('[data-test=address-dialog]').should('not.exist');
    cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
    cy.get('#order-target').should('exist');
    cy.payWith('Card that pays');
    cy.get('[data-test=payment-status]').should('contain.text', 'Succeeded');
    return cy.location('pathname').then((path) => String(path.split('/').at(-1)));
};

describe('OP34 · Staff buy like anyone', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('a warehouse worker buys by card and reads their own order', () => {
        cy.step('the worker shops from the storefront and pays');
        cy.loginAs('warehouse');
        buyByCard('product.rich').then((orderId) => {
            cy.step('their own order is in their order list and opens');
            cy.visit('/en/orders');
            cy.get(`[data-test=row-view][href$="/orders/${orderId}"]`).should('exist');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=order-number]').invoke('text').should('match', /\d/);
        });
    });

    it('a moderator refunds their own order, and the audit row says it was their own', () => {
        cy.step('the moderator buys and pays');
        cy.loginAs('moderator');
        buyByCard('product.rich').then((orderId) => {
            cy.step('on the edit page the refund is theirs to press (the session is fresh)');
            cy.visit(`/en/orders/${orderId}/edit`);
            cy.get('[data-test=button-refund-only]').should('not.be.disabled').click();
            cy.get('[data-test=reauth-dialog]').should('not.exist');

            cy.step('the administrator reads the refund as the moderator’s own');
            eventually(
                () =>
                    cy
                        .apiAs<{ items: AuditRowLike[] }>(
                            'admin',
                            'GET',
                            `/audit?target=${orderId}&pageSize=100`
                        )
                        .then((list) => list?.items ?? []),
                (rows) => rows.some((row) => row.metadata?.ownOrder === true)
            );
        });
    });
});
