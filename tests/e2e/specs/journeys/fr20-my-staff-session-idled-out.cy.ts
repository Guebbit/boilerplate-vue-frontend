// requires-module: account, products
/**
 * @module
 * FR20 · My staff session idled out with a form open. An editor types a price and walks away.
 * At 28.5 idle minutes the "still there?" dialog opens and holds focus; pressing Stay counts the
 * session as active and keeps what was typed, so the save after another ten minutes lands. Left
 * alone past the 30-minute staff limit the session ends with a notice and the login page, which
 * remembers the edit page. Typed values do not survive an idle sign-out (WCAG 2.2.1, level A, asks
 * for the warning and the extension; keeping data is 2.2.5, level AAA).
 *
 * Both clocks move together: the server's decides when the session ends, a Date-only browser
 * clock lets the page's countdown notice.
 */
import { skipUnlessSessionMode } from '../../../support/e2e/harness';
import { answerChallengePage } from '../../../support/e2e/login-challenge';

/** One minute, in milliseconds. */
const MINUTE_MS = 60_000;

/** The price typed before the first walk away, and saved after the extension. */
const FIRST_PRICE = '31.50';

/** The price typed before the walk away that ends the session. */
const LOST_PRICE = '99.00';

describe('FR20 · My staff session idled out with a form open', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    // A regular `function`, so Mocha's `this.skip()` works.
    it('warns, extends on Stay, and ends with the page remembered', function () {
        cy.skipUnlessDemo();
        skipUnlessSessionMode(this, 'jwt');

        cy.subjectId('product.inStock').then((productId) => {
            const editPath = `/en/products/${productId}/edit`;

            cy.step('the editor opens the edit form and types a price');
            cy.loginAs('editor');
            cy.visit(editPath);
            cy.get('[data-test=product-price-field] input').should('not.have.value', '');
            cy.get('[data-test=product-price-field] input').clear();
            cy.get('[data-test=product-price-field] input').type(FIRST_PRICE);

            cy.step('at 28.5 idle minutes the dialog opens and holds focus');
            cy.travelEverywhere(28.5 * MINUTE_MS);
            cy.get('[data-test=idle-session-dialog]').should('be.visible');
            // Vuetify moves focus to the overlay's content element, which carries the dialog's role
            // and wraps the card.
            cy.focused().closest('[role=alertdialog]').should('exist');

            cy.step('Stay counts the session active, closes the dialog and keeps the value');
            const touched: number[] = [];
            cy.intercept('POST', '**/account/session/touch', (request) => {
                request.continue((response) => {
                    touched.push(response.statusCode);
                });
            });
            cy.get('[data-test=idle-session-stay]').click();
            // The jump aged the access token too, so the first touch may be a 401 that the app
            // refreshes and repeats: one of the answers must be a success.
            cy.wrap(touched).should('satisfy', (codes: number[]) =>
                codes.some((code) => code >= 200 && code < 300)
            );
            cy.get('[data-test=idle-session-dialog]').should('not.exist');
            cy.get('[data-test=product-price-field] input').should('have.value', FIRST_PRICE);

            cy.step('ten minutes later the save still lands');
            cy.travelEverywhere(10 * MINUTE_MS);
            const saved: number[] = [];
            cy.intercept('PATCH', `**/products/${productId}`, (request) => {
                request.continue((response) => {
                    saved.push(response.statusCode);
                });
            });
            cy.get('form').first().submit();
            // Again the access token has aged: a 401 is refreshed and repeated, and the repeat saves.
            cy.wrap(saved).should('include', 200);

            cy.step('left alone past the staff limit the session ends and the page is remembered');
            cy.get('[data-test=product-price-field] input').clear();
            cy.get('[data-test=product-price-field] input').type(LOST_PRICE);
            cy.travelEverywhere(31 * MINUTE_MS);
            cy.get('#login-page').should('exist');
            cy.location('search').then((search) => {
                expect(decodeURIComponent(search)).to.include(`continue=${editPath}`);
            });

            cy.step('signing in again lands on the same edit page');
            cy.accountOf('editor').then(({ email, password, totpSecret }) => {
                cy.get('[type=email]').should('not.be.disabled').clear();
                cy.get('[type=email]').type(email);
                cy.get('[type=password]').clear();
                cy.get('[type=password]').type(password);
                cy.get('form').submit();
                // A staff account asks the code of its authenticator app next.
                if (totpSecret) answerChallengePage(totpSecret);
            });
            cy.location('pathname').should('equal', editPath);
        });
    });
});
