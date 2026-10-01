// requires-module: account, cart, delivery, inventory, orders, payments, products
/**
 * @module
 * CU1 · First purchase, from nothing. A visitor with no account signs up, proves the address
 * through the mailed link, browses a category, puts two products in the cart, adds their first
 * address in the dialog at checkout, pays by card and walks away with an order page, an invoice
 * and a mail.
 *
 * The story is about the money staying the same from the cart to the order, and the paper the
 * shop owes afterwards — so every amount is compared in cents, never as spelled. Needs a mailbox:
 * the demo outbox, or Mailpit on live.
 */
import {
    addOpenProductToCart,
    centsOf,
    fillAddressDialog,
    openProductCard,
    searchAndOpenProduct,
    signInWith,
    signUp,
    sumCents
} from '../../../support/e2e/steps';
import { mailedLinkUrl } from '../../../support/e2e/commands';
import { mailMentions } from '../../../../scripts/e2e/mail-message';

/** The address the new visitor signs up with. */
const EMAIL = 'first.purchase@example.com';

/** A password that clears the strength rule. */
const PASSWORD = 'First_Purchase1!';

describe('CU1 · First purchase, from nothing', { tags: '@smoke' }, () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('a new visitor signs up, verifies, buys two products by card and reads the same amounts everywhere', () => {
        cy.skipUnlessMailbox();

        cy.step('signs up and proves the address through the mailed link');
        signUp(EMAIL, PASSWORD);
        cy.get('[data-test=verify-banner]').should('exist');
        cy.logout();
        cy.emailTo(EMAIL).then((email) => {
            cy.visit(mailedLinkUrl(email));
        });
        cy.get('[data-test=verify-submit]').click();
        cy.get('#home-page').should('exist');
        signInWith(EMAIL, PASSWORD);

        cy.step('browses a category and adds two products');
        cy.navigateTo('/en/products');
        cy.filterByNarrowestCategoryOf('product.rich');
        openProductCard('product.rich');
        addOpenProductToCart();
        // A fresh list, so the category filter is gone and the search box finds the second one.
        cy.visit('/en/products');
        searchAndOpenProduct('product.barebones');
        addOpenProductToCart();

        cy.step('checks out with standard shipping, adding the first address in the dialog');
        cy.goToCart();
        cy.get('[data-test=cart-item]').should('have.length', 2);
        cy.get('[data-test=shipping-method-standard]').click();
        cy.get('[data-test=address-picker-empty]').should('exist');
        // Billing is offered beside it and defaults to the shipping address.
        cy.get('[data-test=billing-address-picker-same] input').should('be.checked');
        cy.get('[data-test=address-picker-add]').click();
        fillAddressDialog({
            label: 'Home',
            fullName: 'Ada Lovelace',
            street: 'Via Emilia 1',
            zip: '41121',
            city: 'Modena',
            country: 'Italy'
        });
        cy.get('[data-test=address-dialog]').should('not.exist');

        cy.step('reads the cart: the total is the items plus the shipping');
        // Two cheap lines on purpose: standard shipping is free from 100 up, and a total with
        // nothing added for shipping would prove nothing about the sum.
        const cart = { items: 0, shipping: 0 };
        centsOf('[data-test=cart-items-total]').then((items) => {
            cart.items = items;
        });
        centsOf('[data-test=cart-shipping-cost]').then((shipping) => {
            cart.shipping = shipping;
            expect(shipping, 'shipping costs something on this basket').to.be.greaterThan(0);
        });
        centsOf('[data-test=cart-total]').should((total) => {
            expect(total).to.equal(cart.items + cart.shipping);
        });
        cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();

        cy.step('pays by card');
        cy.get('#order-target').should('exist');
        cy.payWith('Card that pays');
        cy.get('[data-test=payment-status]').should('contain.text', 'Paid');

        cy.step('reads the order page against the cart');
        cy.get('[data-test=order-number]').invoke('text').should('match', /\d/);
        cy.get('[data-test=order-item-line-total]').should('have.length', 2);
        // Billing was left on "same as the shipping address", so the order carries the one
        // address twice: shipped to it and invoiced to it.
        cy.get('[data-test=order-shipping-address]').should('contain.text', 'Via Emilia 1');
        cy.get('[data-test=order-billing-address]').should('contain.text', 'Via Emilia 1');
        cy.get('[data-test=order-item-line-total]').then(($lines) => {
            const sum = sumCents($lines.toArray().map((line) => line.textContent ?? ''));
            expect(sum, 'the order lines add up to the cart items').to.equal(cart.items);
        });
        // Callbacks, not bare arguments: Cypress queues the whole body before the cart reads above
        // have run, so a value written here would be the zero they start as.
        centsOf('[data-test=order-shipping]').should((shipping) => {
            expect(shipping, 'the order froze the cart’s shipping').to.equal(cart.shipping);
        });
        cy.get('[data-test=order-tax-summary]').should('exist');
        // Each rate's row folds shipping in, so net plus tax over every row is the whole charge.
        cy.get('[data-test=order-tax-row]').then(($rows) => {
            const cells = $rows
                .toArray()
                .flatMap((row) =>
                    ['order-tax-row-net', 'order-tax-row-tax'].map((cell) =>
                        row.querySelector(`[data-test=${cell}]`)
                    )
                );
            const charged = sumCents(cells.map((cell) => cell?.textContent ?? ''));
            expect(charged, 'the VAT rows add up to what was charged').to.equal(
                cart.items + cart.shipping
            );
        });

        cy.step('downloads the invoice, and it is a PDF');
        cy.intercept('GET', '**/orders/*/invoice').as('invoice');
        cy.get('[data-test=order-download-invoice]').click();
        cy.wait('@invoice').then(({ response }) => {
            expect(response?.statusCode).to.equal(200);
            expect(response?.headers['content-type']).to.contain('application/pdf');
        });

        cy.step('finds the order mail, which points at this order');
        // The shop mails a link to the order and its receipt, never the invoice itself: the PDF
        // is issued on payment and fetched from the order page above.
        cy.location('pathname').then((path) => {
            const orderId = String(path.split('/').at(-1));
            cy.emailTo(EMAIL, (mail) => mailMentions(mail, `/orders/${orderId}`));
        });
    });
});
