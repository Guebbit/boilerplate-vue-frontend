// requires-module: account, cart, delivery, inventory, orders, payments, products
/**
 * @module
 * FR5 · Shopping on a phone. At a 390 × 844 viewport a guest opens the drawer menu, signs in
 * through it, buys a product by card — adding a second address in the dialog on the way — and logs
 * out through the drawer.
 *
 * The story is about every step being reachable on a small screen: no page scrolls sideways, the
 * address dialog fits inside the viewport, and the drawer carries the links the bar drops (its
 * sections, login and signup for a guest, logout for a customer). The same purchase as CU1's,
 * with a seeded customer so it needs no mailbox.
 */
import {
    addOpenProductToCart,
    fillAddressDialog,
    openProductCard
} from '../../../support/e2e/steps';

/** iPhone 14-class portrait: the breakpoint below which the bar collapses into the drawer. */
const PHONE = { width: 390, height: 844 } as const;

/** The drawer's own id (`AppNavigation.vue`), which the hamburger names in `aria-controls`. */
const DRAWER = '#app-drawer';

/** Opens the drawer with the hamburger and waits for it to be on screen. */
const openDrawer = (): void => {
    cy.get('[aria-controls=app-drawer]').click();
    cy.get(DRAWER).should('be.visible');
};

/**
 * Closes every toast, the way a person does. They stay until dismissed, and on a phone they stack
 * over the drawer's last entries.
 */
const dismissToasts = (): void => {
    cy.get('.v-alert').each((alert) => {
        cy.wrap(alert).find('.v-alert__close button').click();
    });
    cy.get('.v-alert').should('not.exist');
};

/** Fails when the page is wider than the screen, i.e. it would scroll sideways. */
const fitsTheScreen = (): void => {
    cy.document().should((document_) => {
        expect(
            document_.documentElement.scrollWidth,
            'the page is no wider than the viewport'
        ).to.be.at.most(PHONE.width);
    });
};

describe('FR5 · Shopping on a phone', () => {
    beforeEach(() => {
        cy.viewport(PHONE.width, PHONE.height);
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('a guest signs in through the drawer, buys by card with a new address, and logs out through it', () => {
        cy.step('a guest’s drawer offers login and signup');
        fitsTheScreen();
        openDrawer();
        cy.get(`${DRAWER} [data-test=nav-login-link-mobile]`).should('be.visible');
        cy.get(`${DRAWER} a[href^="/en/signup"]`).should('be.visible');

        cy.step('signs in through it');
        cy.get(`${DRAWER} [data-test=nav-login-link-mobile]`).click();
        cy.get('#login-page').should('exist');
        fitsTheScreen();
        cy.accountOf('user').then(({ email, password }) => {
            cy.get('[type=email]').should('not.be.disabled').clear();
            cy.get('[type=email]').type(email);
            cy.get('[type=password]').clear();
            cy.get('[type=password]').type(password);
            cy.get('form').submit();
        });
        cy.url().should('not.include', '/login');

        cy.step('the customer’s drawer has its sections and its own pages');
        openDrawer();
        cy.get(`${DRAWER} [data-test^=drawer-section-]`).should('have.length.at.least', 1);
        cy.get(`${DRAWER} a[href="/en/orders"]`).should('exist');
        cy.get(`${DRAWER} a[href="/en/products"]`).click();
        cy.get(DRAWER).should('not.be.visible');

        cy.step('finds a product and puts it in the cart');
        cy.get('#products-list-page').should('exist');
        fitsTheScreen();
        cy.filterByNarrowestCategoryOf('product.rich');
        openProductCard('product.rich');
        cy.get('#product-target').should('exist');
        fitsTheScreen();
        addOpenProductToCart();

        cy.step('the cart and checkout fit, and the address dialog fits inside the screen');
        cy.goToCart();
        cy.get('[data-test=cart-item]').should('have.length', 1);
        fitsTheScreen();
        cy.get('[data-test=shipping-method-standard]').click();
        cy.get('[data-test=address-picker-add]').click();
        cy.get('[data-test=address-dialog]').should(($dialog) => {
            const box = $dialog[0]?.getBoundingClientRect();
            expect(box?.left, 'inside on the left').to.be.at.least(0);
            expect(box?.right, 'inside on the right').to.be.at.most(PHONE.width);
        });
        fillAddressDialog({
            label: 'Phone',
            fullName: 'Gino Pino',
            street: 'Via Mobile 5',
            zip: '00184',
            city: 'Roma',
            country: 'Italy'
        });
        cy.get('[data-test=address-dialog]').should('not.exist');
        fitsTheScreen();
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();

        cy.step('pays by card on the order page');
        cy.get('#order-target').should('exist');
        cy.payWith('Card that pays');
        cy.get('[data-test=payment-status]').should('contain.text', 'Paid');
        cy.get('[data-test=order-shipping-address]').should('contain.text', 'Via Mobile 5');
        fitsTheScreen();

        cy.step('logs out through the drawer, which then offers login again');
        dismissToasts();
        openDrawer();
        cy.contains(`${DRAWER} [role=button]`, 'Logout').click();
        openDrawer();
        cy.get(`${DRAWER} [data-test=nav-login-link-mobile]`).should('be.visible');
    });
});
