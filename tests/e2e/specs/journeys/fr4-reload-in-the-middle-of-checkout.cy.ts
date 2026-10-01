// requires-module: account, cart, delivery, orders, products
/**
 * @module
 * FR4 · Reload in the middle of checkout. A customer has chosen how the parcel travels and where it
 * goes, then the tab reloads (a refresh, a crashed tab, a phone waking up). What the server already
 * knows must still be on the screen, and nothing has to be chosen twice: the delivery method is saved
 * the moment it is picked, the address book pre-selects the default, and the cart's lines are the
 * server's. Checkout then places exactly one order, with the method and the address the customer saw.
 *
 * The second story is what only the browser knows: the note, the payment choice and a picked
 * (non-default) address, and a quantity click still inside its 400 ms debounce. A reload must give
 * all of it back and lose none of it; logging out must not leave it for the next person.
 */
import { eventually } from '../../../support/e2e/steps';

/** The slice of an order this story reads: the frozen method, address, note and payment choice. */
interface OrderLike {
    id: string;
    notes?: string;
    paymentMethod?: string;
    shippingMethod?: { id?: string } | string;
    shippingAddress?: { city?: string };
}

/** The slice of an order search this story reads: how many orders the customer has. */
interface OrdersPage {
    items: OrderLike[];
    meta?: { totalItems?: number };
}

/**
 * How many orders the customer has right now.
 */
const orderCount = (): Cypress.Chainable<number> =>
    cy
        .apiAs<OrdersPage>('user', 'POST', '/orders/search', { page: 1, pageSize: 1 })
        .then((page) => page?.meta?.totalItems ?? page?.items.length ?? 0);

describe('FR4 · Reload in the middle of checkout', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        // The customer's own cart may hold lines already; start from empty so the one line is ours.
        cy.apiAs('user', 'DELETE', '/cart/all');
        cy.visit('/en');
    });

    it('keeps the delivery method, the address and the lines across a reload, and places one order', () => {
        const before = { orders: 0 };
        orderCount().then((count) => {
            before.orders = count;
        });

        cy.step('the customer fills the cart and picks standard delivery to their address');
        cy.loginAs('user');
        cy.subjectId('product.inStock').then((productId) => {
            cy.apiAs('user', 'POST', '/cart', { productId, quantity: 1 });
        });
        cy.goToCart();
        cy.get('[data-test=cart-item]').should('have.length', 1);
        cy.intercept('PUT', '**/cart/shipping-method').as('saveMethod');
        cy.get('[data-test=shipping-method-standard]').click();
        cy.wait('@saveMethod').its('response.statusCode').should('be.within', 200, 299);
        cy.get('[data-test=address-picker] input[type=radio]:checked').should('have.length', 1);
        cy.get('[data-test=cart-checkout]').should('not.be.disabled');

        cy.step('the tab reloads: the method, the address and the line are all still there');
        cy.reload();
        cy.get('[data-test=cart-item]').should('have.length', 1);
        cy.get('[data-test=shipping-method-standard] input').should('be.checked');
        cy.get('[data-test=address-picker] input[type=radio]:checked').should('have.length', 1);

        cy.step('checking out needs no further choice, and places exactly one order');
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
        cy.get('#order-target').should('exist');
        cy.location('pathname').then((path) => {
            const orderId = String(path.split('/').at(-1));
            cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`).should((order) => {
                const method = order?.shippingMethod;
                expect(typeof method === 'string' ? method : method?.id).to.equal('standard');
                expect(order?.shippingAddress?.city, 'the address the customer saw').to.be.a(
                    'string'
                );
            });
        });
        orderCount().should((count) => {
            expect(count).to.equal(before.orders + 1);
        });
        cy.get('[data-test=cart-item]').should('not.exist');
    });

    it('gives back the note, the payment choice, a picked address and a last quantity click, and hands nothing to the next person', () => {
        const NOTE = 'Please ring twice and leave it with the neighbour';

        cy.step('the customer has a second address, and fills the checkout');
        cy.apiAs<{ id: string }>('user', 'POST', '/account/addresses', {
            label: 'Work',
            fullName: 'Ada Lovelace',
            street: 'Via Roma 2',
            city: 'Bologna',
            zip: '40121',
            country: 'IT'
        }).then((work) => {
            cy.subjectId('product.inStock').then((productId) => {
                cy.apiAs('user', 'POST', '/cart', { productId, quantity: 1 });
            });
            cy.loginAs('user');
            cy.goToCart();
            cy.intercept('PUT', '**/cart/shipping-method').as('saveMethod');
            cy.get('[data-test=shipping-method-standard]').click();
            cy.wait('@saveMethod');
            // Not the default one: the picker would hand that back by itself.
            cy.get(`[data-test=address-picker-${String(work?.id)}] input`).check({ force: true });
            cy.get('[data-test=payment-method-bank_transfer] input').check({ force: true });
            cy.textareaIn('cart-notes').type(NOTE);

            cy.step('a quantity click is still in its debounce when the tab reloads');
            // One tick, so the reload cannot wait out the 400 ms: what reaches the server is what
            // the page hands over as it goes.
            cy.window().then((win) => {
                win.document.querySelector<HTMLElement>('[data-test=cart-increase]')?.click();
                win.location.reload();
            });
            cy.get('[data-test=cart-item]').should('have.length', 1);
            // The keepalive request lands a beat after the reload starts, so the cart is read until it has.
            eventually(
                () => cy.apiAs<{ items: { quantity: number }[] }>('user', 'GET', '/cart'),
                (cart) => cart?.items[0]?.quantity === 2
            ).should((cart) => {
                expect(cart?.items[0]?.quantity, 'the step sent on pagehide').to.equal(2);
            });

            cy.step('everything typed and picked is back on the screen');
            cy.textareaIn('cart-notes').should('have.value', NOTE);
            cy.get('[data-test=payment-method-bank_transfer] input').should('be.checked');
            cy.get(`[data-test=address-picker-${String(work?.id)}] input`).should('be.checked');
            cy.get('[data-test=shipping-method-standard] input').should('be.checked');

            cy.step('logging out leaves nothing for the next person on this tab');
            cy.logout();
            cy.window().then((win) => {
                expect(
                    Object.keys(win.sessionStorage).filter((key) =>
                        key.startsWith('checkout-draft:')
                    )
                ).to.have.length(0);
            });
            cy.loginAs('user');
            cy.goToCart();
            cy.textareaIn('cart-notes').should('have.value', '');

            cy.step('checking out again sends the choices made, and the draft is dropped');
            cy.textareaIn('cart-notes').type(NOTE);
            cy.get(`[data-test=address-picker-${String(work?.id)}] input`).check({ force: true });
            cy.get('[data-test=payment-method-bank_transfer] input').check({ force: true });
            cy.reload();
            cy.textareaIn('cart-notes').should('have.value', NOTE);
            cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
            cy.get('#order-target').should('exist');
            cy.location('pathname').then((path) => {
                cy.apiAs<OrderLike>(
                    'user',
                    'GET',
                    `/orders/${String(path.split('/').at(-1))}`
                ).should((order) => {
                    expect(order?.notes).to.equal(NOTE);
                    expect(order?.paymentMethod).to.equal('bank_transfer');
                    expect(order?.shippingAddress?.city, 'the picked address').to.equal('Bologna');
                });
            });
            cy.window().then((win) => {
                expect(
                    Object.keys(win.sessionStorage).filter((key) =>
                        key.startsWith('checkout-draft:')
                    )
                ).to.have.length(0);
            });
        });
    });
});
