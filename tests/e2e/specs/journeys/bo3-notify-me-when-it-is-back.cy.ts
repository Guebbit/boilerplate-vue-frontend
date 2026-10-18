// requires-module: account, inventory, products, stock-alerts
/**
 * @module
 * BO3 · Notify me when it is back. A signed-in shopper asks to be told about a sold-out product:
 * the button reads "You'll be told". The shelf is restocked and the shopper gets one mail with a
 * link to the product, and one inbox row. The request is gone afterwards.
 *
 * Written against the live pages and not yet run in a browser: the first run may need its
 * selectors nudged.
 */
import { eventually } from '../../../support/e2e/steps';

/** A value unique per run, so two specs on one backend cannot collide. */
const unique = (): string => `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

/** The slice of the inbox this story reads. */
interface InboxLike {
    items: { code: string }[];
}

describe('BO3 · Notify me when it is back', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('is told once, by mail and in the inbox, when the product is restocked', () => {
        cy.step('a product with no stock');
        cy.apiAs<{ id: string }>('editor', 'POST', '/products', {
            price: 19.9,
            translations: { en: { title: `BO3 sold out ${unique()}` } }
        }).then((product) => {
            const id = String(product?.id);

            cy.step('the shopper asks to be told');
            cy.loginAs('user');
            cy.visit(`/en/products/${id}`);
            cy.get('[data-test=notify-me]').should('contain.text', 'Notify me').click();
            cy.get('[data-test=notify-me]').should('contain.text', "You'll be told");

            cy.step('the shelf is restocked');
            cy.apiAs('admin', 'POST', '/inventory/receipts', { productId: id, quantity: 3 });

            cy.step('one mail arrives, linking to the product');
            cy.accountOf('user').then(({ email }) => {
                cy.emailTo(email, (mail) => mail.subject.includes('is back')).then((mail) => {
                    expect(mail.text ?? (mail.lines ?? []).join('\n')).to.contain(
                        `/products/${id}`
                    );
                });
            });

            cy.step('one inbox row, and the request is gone');
            eventually(
                () => cy.apiAs<InboxLike>('user', 'GET', '/notifications'),
                (inbox) =>
                    inbox?.items.some(({ code }) => code === 'notifications.stock-alert') ?? false
            );
            cy.visit('/en/stock-alerts');
            cy.get('[data-test=stock-alert-row]').should('not.exist');
        });
    });
});
