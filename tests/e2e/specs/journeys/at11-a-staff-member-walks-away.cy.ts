// requires-module: account
/**
 * @module
 * AT11 · A staff member walks away. A shopper's session never idles out; a staff member's ends
 * after 30 minutes without a request. Two minutes before that the page asks "Still there?", and
 * "Stay signed in" keeps it. Ignoring it signs the tab out and sends it to login, remembering
 * where it was. The server is the authority, not the tab: a request after the limit is refused
 * with `SESSION_IDLE` whether or not the page noticed.
 *
 * Time moves on BOTH clocks (`cy.travelEverywhere`): the dialog counts on the browser's `Date`,
 * the server on the demo clock. Demo only. Not walked: the passive polls and the cross-tab
 * activity share, which unit and integration tests pin and which a test cannot compress.
 */
import { loginDevice, refreshDevice, requestAsDevice } from '../../../support/e2e/harness';

/** Just past the staff idle default (`NODE_SESSION_IDLE_TIME_STAFF`, 1800 s). */
const PAST_IDLE_MS = 31 * 60_000;

/** Inside the limit, outside the two-minute warning window. */
const BEFORE_WARNING_MS = 27 * 60_000;

/** Long enough to cross into the warning window from {@link BEFORE_WARNING_MS}. */
const INTO_WARNING_MS = 90_000;

/** The toast the page shows when it ends a session for inactivity. */
const ENDED = 'Your session ended after a period of inactivity. Please sign in again.';

/** The prompt itself. */
const DIALOG = '[data-test=idle-session-dialog]';

describe('AT11 · A staff member walks away', () => {
    beforeEach(() => {
        cy.skipUnlessDemo();
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('a shopper is never asked: the session does not idle out', () => {
        cy.step('the touch tells a shopper no idle limit');
        cy.intercept('POST', '**/account/session/touch').as('touch');
        cy.loginAs('user');
        cy.wait('@touch')
            .its('response.body')
            .should((body: { data?: { idleTimeoutSeconds?: number } }) => {
                expect(body.data?.idleTimeoutSeconds).to.equal(undefined);
            });

        cy.step('half an hour passes: no prompt, and the orders page still loads');
        cy.travelEverywhere(PAST_IDLE_MS);
        cy.get(DIALOG).should('not.exist');
        cy.navigateViaMenu('account', '/en/orders');
        cy.location('pathname').should('equal', '/en/orders');
        cy.get('[data-test=user-menu]').should('exist');
    });

    it('a staff member is asked, can stay, and is signed out when they ignore it', () => {
        cy.step('the touch gives a staff member the 30-minute limit');
        cy.intercept('POST', '**/account/session/touch').as('touch');
        cy.loginAs('warehouse');
        cy.wait('@touch')
            .its('response.body')
            .should((body: { data?: { idleTimeoutSeconds?: number } }) => {
                expect(body.data?.idleTimeoutSeconds).to.equal(1800);
            });

        cy.step('right after signing in there is no prompt; close to the limit there is');
        cy.get(DIALOG).should('not.exist');
        // One jump: a request made half way would count as activity and restart the clock.
        cy.travelEverywhere(BEFORE_WARNING_MS + INTO_WARNING_MS);
        cy.get(DIALOG).should('be.visible');
        cy.get('[role=alertdialog]').should('exist');
        cy.get('#idle-session-title').should('contain.text', 'Still there?');
        cy.get('#idle-session-message').should('contain.text', 'It ends in');

        cy.step('"Stay signed in" keeps the session, and the clock starts over');
        cy.get('[data-test=idle-session-stay]').click();
        cy.get(DIALOG).should('not.exist');
        cy.travelEverywhere(25 * 60_000);
        cy.get(DIALOG).should('not.exist');
        cy.get('[data-test=user-menu]').should('exist');

        cy.step('ignored, the tab is signed out and sent to login, remembering the page');
        cy.navigateViaMenu('account', '/en/orders');
        cy.travelEverywhere(PAST_IDLE_MS);
        cy.contains(ENDED).should('exist');
        cy.url().should('include', '/login').and('include', 'continue');
        cy.get('[data-test=user-menu]').should('not.exist');
        cy.accountOf('warehouse').then(({ email, password }) => {
            cy.get('[type=email]').should('not.be.disabled').type(email);
            cy.get('[type=password]').should('not.be.disabled').type(password);
            cy.get('form').submit();
        });
        cy.location('pathname').should('equal', '/en/orders');

        cy.step('the idled session is not listed, only this sign-in');
        cy.visit('/en/profile');
        cy.get('[data-test=sessions-list] [data-test=session-item]').should('have.length', 1);
    });

    it('the server decides: a request after the limit is refused whatever the tab shows', () => {
        cy.step('a staff member is signed in on this tab and on a second device');
        cy.loginAs('warehouse');
        loginDevice('warehouse').then((device) => {
            cy.step('only the server’s clock moves: the tab shows no prompt');
            cy.travel(PAST_IDLE_MS);
            cy.get(DIALOG).should('not.exist');

            cy.step('the next click is refused as idle, and the page says so');
            cy.navigateViaMenu('account', '/en/orders');
            cy.contains(ENDED).should('exist');
            cy.get('#login-page').should('exist');

            cy.step('the other device is refused the same way, by name');
            // A `jwt` device holds an access token that lapsed long ago, so its idle limit is
            // met at the refresh; a `cookie` device meets it on the request itself.
            cy.env(['sessionMode']).then(({ sessionMode }) => {
                (sessionMode === 'jwt'
                    ? refreshDevice(device)
                    : requestAsDevice(device, 'GET', '/account')
                ).then((response) => {
                    expect(response.status).to.equal(401);
                    expect(JSON.stringify(response.body)).to.contain('SESSION_IDLE');
                });
            });
        });
    });

    it('"Sign out" in the prompt leaves at once', () => {
        cy.loginAs('warehouse');
        cy.travelEverywhere(BEFORE_WARNING_MS + INTO_WARNING_MS);
        cy.get(DIALOG).should('be.visible');
        cy.get('[data-test=idle-session-leave]').click();
        cy.get('[data-test=nav-login-link]').should('exist');
        cy.get('[data-test=user-menu]').should('not.exist');
    });
});
