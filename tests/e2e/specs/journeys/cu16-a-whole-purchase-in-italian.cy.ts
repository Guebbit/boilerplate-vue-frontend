// requires-module: account, cart, delivery, inventory, orders, payments, products
/**
 * @module
 * CU16 · A whole purchase in Italian. The customer switches the app to Italian, then buys a basket
 * big enough to show a thousands separator: browses, fills the cart, checks out with standard
 * shipping, pays by card, reads the order, and finds the shop's mails in Italian too.
 *
 * The story is about nothing staying English half way: copy, money and VAT labels follow the
 * language, the amounts are the same amounts however they are spelled (compared in cents), and the
 * mails go out in the language the customer chose. Needs a mailbox: the demo outbox, or Mailpit on
 * live.
 */
import {
    addOpenProductToCart,
    openProductCard,
    shouldShowCents,
    sumCents
} from '../../../support/e2e/steps';
import { mailedLinkUrl } from '../../../support/e2e/commands';

/**
 * How many units make the basket clear a thousand. Whether a four-digit Italian amount is grouped
 * (`1.020,00`) or not (`1020,00`) depends on the browser's ICU version, so the spec accepts both.
 */
const UNITS = 15;

/**
 * A money element's text with every space — normal or not — dropped, so `1.020,00 €` compares as
 * `1.020,00€` whatever space the platform's formatter puts before the symbol.
 *
 * @param text - what the money element shows
 */
const unspaced = (text: string): string => text.replaceAll(/\s/g, '');

describe('CU16 · A whole purchase in Italian', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('copy, money, VAT and mails all speak Italian through a whole purchase', () => {
        cy.skipUnlessMailbox();

        cy.step('switches the app to Italian');
        cy.loginAs('user');
        cy.get('[data-test=language-switcher]').first().click();
        cy.get('[data-test=language-option-it]').click();
        cy.get('html').should('have.attr', 'lang', 'it');
        cy.location('pathname').should('match', /^\/it(\/|$)/);

        cy.step('browses to a product and finds its Italian page');
        cy.subjectProduct('product.rich').then((food) => {
            cy.navigateTo('/it/products');
            cy.filterByNarrowestCategoryOf('product.rich');
            openProductCard('product.rich');
            cy.get('#product-target').should('exist');
            // Translated: the page no longer carries the English title the API lists by default.
            cy.get('#product-target').should('not.contain.text', food.title);
            addOpenProductToCart();

            cy.step('the cart holds a thousand and more, spelled the Italian way');
            cy.goToCart();
            cy.contains('Riepilogo').should('exist');
            cy.get('[data-test=cart-item]').should('have.length', 1);
            for (let click = 1; click < UNITS; click += 1)
                cy.get('[data-test=cart-increase]').click();
            cy.get('[data-test=shipping-method-standard]').click();
            cy.get('[data-test=shipping-method-standard]')
                .should('contain.text', 'Standard')
                .and('contain.text', 'gratis oltre soglia');
            cy.get('[data-test=cart-total]').should(($total) => {
                expect(
                    unspaced($total.text()),
                    'comma for cents, the symbol after, a dot only for grouped thousands'
                ).to.match(/^\d+(\.\d{3})*,\d{2}€$/);
            });
            // The same amount however it is spelled: the basket, shipping free above the line.
            shouldShowCents('[data-test=cart-total]', (total) => {
                expect(total).to.equal(UNITS * Math.round(food.price * 100));
            });
            cy.get('[data-test=cart-checkout]').should('not.be.disabled').click();
            cy.get('#order-target').should('exist');
        });

        cy.step('pays by card, reading the statuses in Italian');
        cy.payWith('Carta che paga');
        cy.get('[data-test=payment-status]').should('contain.text', 'Pagato');
        cy.get('[data-test=order-payment-status]').should('contain.text', 'Pagato');

        cy.step('the VAT summary speaks Italian and adds up to the charge');
        cy.get('[data-test=order-tax-summary]')
            .should('contain.text', 'Riepilogo IVA')
            .and('contain.text', 'Imponibile');
        cy.get('[data-test=order-item-line-total]').then(($lines) => {
            const items = sumCents($lines.toArray().map((line) => line.textContent ?? ''));
            cy.get('[data-test=order-tax-row]').then(($rows) => {
                const cells = $rows
                    .toArray()
                    .flatMap((row) =>
                        ['order-tax-row-net', 'order-tax-row-tax'].map((cell) =>
                            row.querySelector(`[data-test=${cell}]`)
                        )
                    );
                const charged = sumCents(cells.map((cell) => cell?.textContent ?? ''));
                expect(charged, 'the VAT rows add up to what was charged').to.equal(items);
            });
        });

        cy.step('the shop’s mails arrive in Italian, and link to the Italian order page');
        cy.accountOf('user').then(({ email }) => {
            // Found BY the Italian subject: the mail only turns up if it was sent in Italian.
            cy.emailTo(email, (mail) => mail.subject.includes('Ordine ricevuto'));
            cy.emailTo(email, (mail) => mail.subject.includes('Pagamento ricevuto')).then(
                (paid) => {
                    expect(mailedLinkUrl(paid), 'the receipt mail points at /it').to.contain(
                        '/it/'
                    );
                }
            );
        });
    });
});
