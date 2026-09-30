// requires-module: account, cart, delivery, inventory, products
/**
 * @module
 * AC11 · I moved house. The customer edits the address they have, adds a new one and makes it the
 * default from the dialog, and goes to checkout: the picker pre-selects the new default and shows
 * the edited text. Then the book is emptied, the profile and checkout both say so, and an address
 * added from checkout is the choice.
 *
 * The story is about the book having one home for its state: what the profile changes is what the
 * picker reads, in both directions. Nothing here pays.
 */
import { addToCartFromStorefront, fillAddressDialog } from '../../../support/e2e/steps';

/** The street the existing address is edited to. */
const EDITED_STREET = 'Via Nuova 99';

describe('AC11 · I moved house', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('an edit and a new default reach checkout, and an emptied book can be refilled from there', () => {
        cy.step('edits the address they have');
        cy.loginAs('user');
        cy.navigateViaMenu('account', '/en/profile');
        cy.get('[data-test=address-item]').should('have.length', 1);
        cy.get('[data-test=address-edit]').click();
        fillAddressDialog({
            label: 'casa',
            fullName: 'Gino Pino',
            street: EDITED_STREET,
            zip: '80121',
            city: 'Napoli',
            country: 'Italy'
        });
        cy.get('[data-test=address-dialog]').should('not.exist');
        cy.get('[data-test=address-item]')
            .should('have.length', 1)
            .and('contain.text', EDITED_STREET);

        cy.step('adds a second address and makes it the default from the dialog');
        cy.get('[data-test=address-add]').click();
        cy.get('[data-test=address-set-default] input').check();
        fillAddressDialog({
            label: 'ufficio',
            fullName: 'Gino Pino',
            street: 'Via del Lavoro 3',
            zip: '40121',
            city: 'Bologna',
            country: 'Italy'
        });
        cy.get('[data-test=address-dialog]').should('not.exist');
        cy.get('[data-test=address-item]').should('have.length', 2);
        cy.get('[data-test=address-default]').should('have.length', 1);
        cy.contains('[data-test=address-item]', 'ufficio')
            .find('[data-test=address-default]')
            .should('exist');

        cy.step('checkout pre-selects the new default and shows the edited text');
        addToCartFromStorefront('product.barebones');
        cy.goToCart();
        cy.get('[data-test=shipping-method-standard]').click();
        cy.contains('[data-test^=address-picker-]', 'Via del Lavoro 3')
            .find('input')
            .should('be.checked');
        cy.contains('[data-test^=address-picker-]', EDITED_STREET)
            .find('input')
            .should('not.be.checked');

        cy.step('empties the book: the profile says so');
        cy.navigateViaMenu('account', '/en/profile');
        cy.get('[data-test=address-item]').should('have.length', 2);
        for (const remaining of [1, 0]) {
            cy.get('[data-test=address-remove]').first().click();
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.get('[data-test=address-item]').should('have.length', remaining);
        }
        cy.get('[data-test=addresses-empty]').should('exist');

        cy.step('checkout says so too, and an address added there is the choice');
        cy.goToCart();
        cy.get('[data-test=address-picker-empty]').should('exist');
        cy.get('[data-test=cart-checkout]').should('be.disabled');
        cy.get('[data-test=address-picker-add]').click();
        fillAddressDialog({
            label: 'nuova',
            fullName: 'Gino Pino',
            street: 'Via Appia 1',
            zip: '00181',
            city: 'Roma',
            country: 'Italy'
        });
        cy.get('[data-test=address-dialog]').should('not.exist');
        cy.contains('[data-test^=address-picker-]', 'Via Appia 1')
            .find('input')
            .should('be.checked');
        cy.get('[data-test=cart-checkout]').should('not.be.disabled');
    });
});
