// requires-module: account, delivery, orders, products
/**
 * @module
 * OP40 · The shop in two languages. The customer's saved language is Italian; the warehouse works
 * in English and ships their order, so the shipped mail is written in Italian, the buyer's language,
 * not the sender's. The editor works in Italian: a price typed on the edit form survives two language
 * switches, a stale save is refused in Italian, and the shop manager's order list speaks Italian too.
 */
import { byTemplate, inLocale } from '../../../../scripts/e2e/mail-filters';

/** The tracking code the express parcel needs. */
const TRACKING_CODE = 'OP40-TRACK-001';

/** The price the editor types and then carries through the language switches. */
const TYPED_PRICE_EN = '41.50';

/** The same price as the Italian form writes it. */
const TYPED_PRICE_IT = '41,50';

/**
 * Switches the app's language through the app bar's switcher.
 *
 * @param tag - `en` or `it`
 */
const switchTo = (tag: 'en' | 'it'): void => {
    cy.get('[data-test=language-switcher]').first().click();
    cy.get(`[data-test=language-option-${tag}]`).click();
    cy.get('html').should('have.attr', 'lang', tag);
};

describe('OP40 · The shop in two languages', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('mails the buyer in their language, and the editor works in Italian without losing a thing', () => {
        cy.step('the customer saves Italian as their language');
        cy.loginAs('user');
        switchTo('it');
        cy.logout();

        cy.step('the warehouse, in English, ships their paid order');
        cy.subjectId('order.paidExpress').then((orderId) => {
            cy.loginAs('warehouse');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=mark-started]').click();
            cy.get('[data-test=open-ship]').click();
            cy.get('[data-test=ship-tracking-code] input').type(TRACKING_CODE);
            cy.get('[data-test=ship-submit]').should('not.be.disabled').click();
            cy.get('[data-test=shipment-tracking]').should('contain.text', TRACKING_CODE);

            cy.step('the shipped mail is in Italian, the buyer’s language');
            cy.accountOf('user').then(({ email }) => {
                cy.emailTo(
                    email,
                    (mail) => byTemplate('delivery.shipment-shipped')(mail) && inLocale('it')(mail)
                );
            });
        });

        cy.step('the editor works in Italian: a typed price survives two switches');
        cy.subjectId('product.inStock').then((productId) => {
            cy.switchUser('editor');
            cy.visit(`/it/products/${productId}/edit`);
            cy.get('[data-test=product-price-field] input').should('not.have.value', '');
            cy.get('[data-test=product-price-field] input').clear();
            cy.get('[data-test=product-price-field] input').type(TYPED_PRICE_IT);
            switchTo('en');
            cy.get('[data-test=product-price-field] input').should('have.value', TYPED_PRICE_EN);
            switchTo('it');
            cy.get('[data-test=product-price-field] input').should('have.value', TYPED_PRICE_IT);

            cy.step('a stale save is refused with an Italian sentence');
            cy.apiAs('admin', 'PATCH', `/products/${productId}`, { price: 123.45 });
            cy.get('form').first().submit();
            cy.get('[data-test=product-edit-submit-error]')
                .should('be.visible')
                .and('contain.text', 'Qualcun altro');
        });

        cy.step('the shop manager’s order list speaks Italian too');
        // The editor leaves the stale form by loading another page: the browser's own prompt is
        // accepted by the runner, and the menu sign-out would ask first with a form still dirty.
        cy.visit('/en');
        cy.switchUser('manager');
        cy.visit('/it/sales/orders');
        cy.get('[data-test=row-fulfillment-status]').first().should('exist');
        cy.get('[data-test=row-fulfillment-status]').each(($chip) => {
            expect($chip.text().trim()).not.to.match(/^(Shipped|Not started|Delivered|On hold)$/);
        });
    });
});
