// requires-module: account
/**
 * @module
 * FR8 · My session expired while I was typing. A customer fills in the address form, the access
 * token lapses while it sits open, and the save still goes through: the client renews the session
 * silently and replays the very request, so nothing typed is lost and no login appears.
 *
 * The token lapses by moving the demo backend's clock past its 600 s life (the refresh token
 * lasts days), so this is a demo-only journey. The save is asserted as the sequence it is: a 401,
 * one refresh, then the same request again answered 201. In `cookie` mode there is no access token
 * to lapse: the same save is answered 201 at once, with no 401 and no refresh request.
 */

/** Past the access token's 600 s life, inside the refresh token's 7 days. */
const PAST_ACCESS_TOKEN_MS = 610_000;

/** The street typed before the session lapsed, and looked for afterwards. */
const STREET = 'Via Lenta 12';

describe('FR8 · My session expired while I was typing', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('a form left open past the access token’s life still saves, through a silent refresh in jwt mode', () => {
        cy.skipUnlessDemo();

        cy.step('the customer opens the address form and fills every field');
        cy.loginAs('user');
        cy.visit('/en/profile');
        cy.get('[data-test=address-add]').click();
        cy.get('[data-test=address-dialog]').within(() => {
            const values = ['Slow typist', 'Ada Lovelace', STREET, '41121', 'Modena'];
            for (const [index, value] of values.entries()) {
                cy.get('input').eq(index).should('not.be.disabled').clear();
                cy.get('input').eq(index).type(value);
            }
            cy.get('[data-test=address-country]').click();
            cy.get('[data-test=address-country]').type('Italy');
        });
        cy.get('.v-overlay-container').contains('.v-list-item', 'Italy').click();

        cy.step('the access token lapses while the form sits open');
        cy.travel(PAST_ACCESS_TOKEN_MS);

        cy.step('saving is renewed silently and replayed (jwt), or just answered (cookie)');
        cy.intercept('POST', '**/account/addresses').as('save');
        cy.intercept('POST', '**/account/refresh').as('refresh');
        cy.get('[data-test=address-save]').click();
        cy.env(['sessionMode']).then(({ sessionMode }) => {
            if (sessionMode === 'cookie') {
                cy.wait('@save').its('response.statusCode').should('equal', 201);
                cy.get('@refresh.all').should('have.length', 0);
                return;
            }
            cy.wait('@save').its('response.statusCode').should('equal', 401);
            cy.wait('@refresh').its('response.statusCode').should('equal', 200);
            cy.wait('@save').its('response.statusCode').should('equal', 201);
        });

        cy.step('nothing typed was lost, and I was never sent to login');
        cy.get('[data-test=address-dialog]').should('not.exist');
        cy.contains('[data-test=address-item]', STREET).should('exist');
        cy.contains('Your session has expired').should('not.exist');
        cy.url().should('include', '/profile');
    });
});
