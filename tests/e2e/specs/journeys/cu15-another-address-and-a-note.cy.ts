// requires-module: account, cart, delivery, inventory, orders, products
/**
 * @module
 * CU15 · A different address, and a note for the shop. The customer already has one saved
 * address; at checkout they add a second, deliver there, leave a note, and the order carries both.
 * The admin opens the same order and reads the note.
 *
 * The story is about checkout not forcing the book's one entry on a customer with somewhere else
 * to be: the add button is there with an entry already saved, the new place becomes the choice,
 * and what the order froze is the place picked, not the default. The address book is read back
 * from the profile, which shares it. Nothing here pays.
 */
import {
    addToCartFromStorefront,
    fillAddressDialog,
    idFromLocation
} from '../../../support/e2e/steps';

/** What the customer tells the shop about the delivery. */
const NOTE = 'Leave it with the concierge, ring twice.';

describe('CU15 · A different address, and a note for the shop', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the customer adds a second address at checkout, delivers there with a note, and the admin reads the note', () => {
        cy.step('puts a product in the cart and chooses a delivered method');
        cy.loginAs('user');
        addToCartFromStorefront('product.barebones');
        cy.goToCart();
        cy.get('[data-test=shipping-method-standard]').click();

        cy.step('the book already has an entry, yet checkout still offers to add another');
        cy.get('[data-test=address-picker] input[type=radio]').should('have.length', 1);
        cy.get('[data-test=address-picker-empty]').should('not.exist');
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

        cy.step('the new place is the choice, not the default that was there');
        cy.get('[data-test=address-picker] input[type=radio]').should('have.length', 2);
        // A radio's own `data-test` is `address-picker-<id>`; the text picks the new one.
        cy.contains('[data-test^=address-picker-]', 'Via dei Coralli 12')
            .find('input')
            .should('be.checked');

        cy.step('leaves a note and checks out');
        cy.textareaIn('cart-notes').type(NOTE);
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
        cy.get('#order-target').should('exist');

        cy.step('the order froze the place picked, and the note');
        cy.get('[data-test=order-shipping-address]')
            .should('contain.text', 'Via dei Coralli 12')
            .and('contain.text', 'Roma');
        cy.get('[data-test=order-shipping-address]').should('not.contain.text', 'Via Pino 7');
        cy.get('[data-test=order-notes]').should('contain.text', NOTE);

        idFromLocation().then((orderId) => {
            cy.step('the profile shares the book: the second entry is there too');
            cy.navigateViaMenu('account', '/en/profile');
            cy.get('[data-test=address-item]').should('have.length', 2);

            cy.step('the admin opens the same order and reads the note and the address');
            cy.switchUser('admin');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=order-notes]').should('contain.text', NOTE);
            cy.get('[data-test=order-shipping-address]').should(
                'contain.text',
                'Via dei Coralli 12'
            );
        });
    });
});
