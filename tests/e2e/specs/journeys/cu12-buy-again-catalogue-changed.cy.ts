// requires-module: cart, orders, products
/**
 * @module
 * CU12 · Buy again after the catalogue changed. The customer opens an old order whose three
 * products have met three different fates — one untouched, one with a new picture, one deleted
 * for good — reads the pictures, then buys it again. The cart takes what can still be bought, and
 * the notice says what it left out.
 *
 * The story is about the order page and the cart telling the truth about a catalogue that moved
 * under them: the order's pictures follow the live catalogue (never a frozen copy, never a broken
 * image), and buy-again names the line it dropped instead of toasting plain success. Nothing here
 * pays, so card budgets are untouched.
 */
import { UPLOAD_PATH } from '../../../support/e2e/images';

/** One order line as the API serves it: `current` is the live product, `null` once it is gone. */
interface OrderLine {
    product: { id: string; title: string };
    current: { imageUrl?: string } | null;
}

/** What happened to a line's product after it was bought. */
type Fate = 'untouched' | 'replaced' | 'deleted';

/**
 * Which fate a line's live product met. A seeded picture lives under `/images/seed/`; an uploaded
 * replacement is a content-hashed file, which is what {@link UPLOAD_PATH} matches.
 *
 * @param line - an order line as the API serves it
 */
const fateOf = (line: OrderLine): Fate => {
    if (line.current === null) return 'deleted';
    return UPLOAD_PATH.test(line.current.imageUrl ?? '') ? 'replaced' : 'untouched';
};

describe('CU12 · Buy again after the catalogue changed', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the order page keeps its pictures honest, and buy-again names the line it could not bring back', () => {
        cy.step('opens the order whose products changed, and reads each line’s fate off the API');
        cy.loginAs('user');
        cy.subjectId('order.mixedImageStates').then((orderId) => {
            cy.visit(`/en/orders/${orderId}`);
            cy.apiAs<{ items: OrderLine[] }>('user', 'GET', `/orders/${orderId}`).then((order) => {
                const lines = order?.items ?? [];
                expect(
                    lines.map((line) => fateOf(line)).toSorted(),
                    'one line of each fate'
                ).to.deep.equal(['deleted', 'replaced', 'untouched']);

                cy.step(
                    'every picture is the live one: the new upload, the seeded one, or the app’s own stand-in'
                );
                cy.get('[data-test=order-item]').should('have.length', lines.length);
                for (const line of lines) {
                    cy.contains('[data-test=order-item]', line.product.id).within(() => {
                        cy.get('[data-test=lazy-image]').scrollIntoView();
                        if (fateOf(line) === 'deleted') {
                            cy.get('[data-test=lazy-image]').should(
                                'have.attr',
                                'data-placeholder',
                                'true'
                            );
                        } else {
                            cy.get('[data-test=lazy-image]').should(
                                'not.have.attr',
                                'data-placeholder'
                            );
                            cy.get('[data-test=lazy-image] img:not([aria-hidden])')
                                .should('have.attr', 'src')
                                .and('contain', line.current?.imageUrl);
                        }
                        // Decoded, not merely addressed: a 404 would leave a zero-width image.
                        cy.get('[data-test=lazy-image] img:not([aria-hidden])').should(($image) => {
                            expect(
                                ($image[0] as HTMLImageElement).naturalWidth,
                                'the picture decoded'
                            ).to.be.greaterThan(0);
                        });
                    });
                }

                cy.step('buys the order again');
                cy.get('[data-test=order-reorder]').click();
                const gone = lines.find((line) => fateOf(line) === 'deleted');
                cy.contains('no longer sold').should('contain.text', gone?.product.title ?? '');
                cy.location('pathname').should('match', /\/cart$/);

                cy.step('the cart holds what can still be bought, and only that');
                cy.get('[data-test=cart-item]').should('have.length', lines.length - 1);
                cy.apiAs<{ items: { productId: string }[] }>('user', 'GET', '/cart').should(
                    (cart) => {
                        const held = (cart?.items ?? []).map((item) => item.productId).toSorted();
                        const expected = lines
                            .filter((line) => fateOf(line) !== 'deleted')
                            .map((line) => line.product.id)
                            .toSorted();
                        expect(held).to.deep.equal(expected);
                    }
                );
            });
        });
    });
});
