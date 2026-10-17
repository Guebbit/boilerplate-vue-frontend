// requires-module: account, cart, delivery, orders, products
/**
 * @module
 * FR17 · I switched language in the middle of checkout. A customer picks a delivery method, adds
 * an address through the dialog and types a note, then switches the app to Italian. Every choice
 * is still there, the page speaks Italian, and the order that results carries the note as typed
 * and mails the customer in Italian.
 *
 * The address dialog is modal, so its scrim blocks the language switcher; the reachable form of
 * "switch while the address dialog is open" is "the address was added through it, then switch".
 */
import {
    addToCartFromStorefront,
    fillAddressDialog,
    idFromLocation
} from '../../../support/e2e/steps';
import { byTemplate, inLocale } from '../../../../scripts/e2e/mail-filters';

/** What the customer tells the shop about the delivery. */
const NOTE = 'Leave it with the concierge, ring twice.';

describe('FR17 · I switched language in the middle of checkout', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('keeps the delivery, the new address and the note across the switch, and mails in Italian', () => {
        cy.step('the customer chooses delivery, adds an address and writes a note, in English');
        cy.loginAs('user');
        addToCartFromStorefront('product.barebones');
        cy.goToCart();
        cy.get('[data-test=shipping-method-standard]').click();
        cy.get('[data-test=address-picker-add]').click();
        fillAddressDialog({
            label: 'Studio',
            fullName: 'Gino Pino',
            street: 'Via dei Coralli 12',
            zip: '00184',
            city: 'Roma',
            country: 'Italy'
        });
        cy.get('[data-test=address-dialog]').should('not.exist');
        cy.textareaIn('cart-notes').type(NOTE);

        cy.step('switching to Italian keeps the page, the language and every choice');
        cy.get('[data-test=language-switcher]').first().click();
        cy.get('[data-test=language-option-it]').click();
        cy.get('html').should('have.attr', 'lang', 'it');
        cy.location('pathname').should('equal', '/it/cart');
        cy.get('[data-test=shipping-method-standard] input').should('be.checked');
        cy.contains('[data-test^=address-picker-]', 'Via dei Coralli 12')
            .find('input')
            .should('be.checked');
        cy.get('[data-test=cart-notes] textarea').should('have.value', NOTE);

        cy.step('the order lands in Italian with the note as typed');
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
        cy.get('#order-target').should('exist');
        cy.location('pathname').should('match', /^\/it\/orders\//);
        cy.get('[data-test=order-notes]').should('contain.text', NOTE);

        idFromLocation().then(() => {
            cy.step('and the order mail is in Italian');
            cy.accountOf('user').then(({ email }) => {
                cy.emailTo(
                    email,
                    (mail) =>
                        byTemplate('orders.order-confirm')(mail) && inLocale('it', 'Ordine')(mail)
                );
            });
        });
    });
});
