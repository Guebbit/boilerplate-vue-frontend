// requires-module: account, cart, products
/**
 * @module
 * AC12 · My privacy choices stick. A new visitor signs up and leaves analytics unticked: the
 * account holds no consent, no Umami tag loads and the backend records nothing about them. They
 * turn it on in the profile: the tag loads and the backend starts recording. Logging out silences
 * the tag (a guest who never answered has said nothing), and signing back in finds the choice
 * where they left it, the switch on and the tag loaded again.
 *
 * While signed in, the account's own answer rules, over the guest cookie
 * (`docs/tools/umami.md#consent`). The rows are read from Umami on the live profile; on demo the
 * tag, the switch and the account's own record are the evidence. The consent build only: with no
 * Umami configured the story skips, like `consent.cy.ts`.
 *
 * The backend's side is probed through a second device of the account, one new cart line at a time:
 * a new line is a `cart_item_added` row, and a line added while consent was off must leave none.
 */
import { loginDeviceWith, requestAsDevice } from '../../../support/e2e/harness';
import type { Device } from '../../../support/e2e/harness';
import { signInWith, signUp } from '../../../support/e2e/steps';
import { eventCounts, waitForEvent, withUmami } from '../../../support/e2e/umami';

/** The tag Umami's loader injects, matched by the attribute only it sets. */
const TRACKER = 'script[data-website-id]';

/** The story's account. */
const VISITOR = {
    email: `ac12-visitor-${String(Date.now())}@example.com`,
    password: 'Visitor-Passw0rd!x'
};

/** The key the tracker checks before every send: truthy silences it. */
const OPT_OUT_KEY = 'umami.disabled';

/**
 * Whether the tracker's own opt-out switch is set, as the page sees it.
 *
 * @param silenced - the answer the story expects
 */
const trackerIsSilenced = (silenced: boolean): void => {
    cy.window().should((win) => {
        expect(Boolean(win.localStorage.getItem(OPT_OUT_KEY)), 'the opt-out switch').to.equal(
            silenced
        );
    });
};

/**
 * The account record's consent as the API holds it, read through the second device.
 *
 * @param device - the account's second device
 */
const storedConsent = (device: Device): Cypress.Chainable<unknown> =>
    requestAsDevice(device, 'GET', '/account').then(
        (response) =>
            (response.body as { data: { analyticsConsent?: boolean } }).data.analyticsConsent
    );

/**
 * Adds a seeded product to the account's cart through the second device: a new line, hence one
 * `cart_item_added` event if the account consents.
 *
 * @param device - the account's second device
 * @param name - a `product.*` guarantee name
 */
const addLine = (device: Device, name: string): void => {
    cy.subjectId(name).then((productId) => {
        requestAsDevice(device, 'POST', '/cart', { productId, quantity: 1 })
            .its('status')
            .should('be.within', 200, 299);
    });
};

describe('AC12 · My privacy choices stick', () => {
    beforeEach(function () {
        cy.visit('/en');
        cy.restore();
        // The global hook answered "denied" for every spec; this one starts as a first-time visitor.
        cy.clearCookies();
        cy.clearAllLocalStorage();
        cy.visit('/en');
        cy.get('#home-page').should('exist');
        cy.get('body').then(($body) => {
            if ($body.find('[data-test=analytics-consent-banner]').length === 0) this.skip();
        });
    });

    it('is off after a signup that left it unticked, on after the profile, and still on after a new login', () => {
        const since = Date.now() - 60 * 1000;
        let before: Record<string, number> = {};
        withUmami((session) => {
            eventCounts(session, since).then((counts) => {
                before = counts;
            });
        });

        cy.step('a new visitor signs up and leaves analytics unticked');
        signUp(VISITOR.email, VISITOR.password);
        loginDeviceWith(VISITOR.email, VISITOR.password).then((device) => {
            storedConsent(device).should('not.equal', true);
            cy.get(TRACKER).should('not.exist');
            trackerIsSilenced(true);

            cy.step('a cart line added without consent is not recorded (checked at the end)');
            addLine(device, 'product.rich');

            cy.step('the profile switch is off; turning it on and saving writes the account');
            cy.visit('/en/profile');
            // Interact only once the form has hydrated: the email field carries the record.
            cy.get('#profile-page [type=email]').should('have.value', VISITOR.email);
            cy.get('[data-test=profile-analytics-consent] input').should('not.be.checked');
            cy.get('[data-test=profile-analytics-consent] input').check({ force: true });
            cy.get('#profile-page form button[type=submit]')
                .first()
                .should('not.be.disabled')
                .click();
            cy.get('#profile-page form button[type=submit]').first().should('be.disabled');
            storedConsent(device).should('equal', true);

            cy.step('the tag loads now, and stays loaded after a reload');
            cy.get(TRACKER).should('exist');
            trackerIsSilenced(false);
            cy.reload();
            cy.get('[data-test=profile-analytics-consent] input').should('be.checked');
            cy.get(TRACKER).should('exist');

            cy.step('a cart line added with consent is recorded');
            addLine(device, 'product.inStock');

            cy.step('logging out silences the tag: a guest who never answered has said nothing');
            cy.logout();
            trackerIsSilenced(true);

            cy.step('logging back in, the choice is where it was left');
            signInWith(VISITOR.email, VISITOR.password);
            cy.visit('/en/profile');
            cy.get('[data-test=profile-analytics-consent] input').should('be.checked');
            cy.get(TRACKER).should('exist');
            trackerIsSilenced(false);
            storedConsent(device).should('equal', true);

            cy.step('a cart line added after the new login is recorded too');
            addLine(device, 'product.lowStock');
        });

        cy.step('Umami holds two rows for the story, not three: the unconsenting line left none');
        withUmami((session) => {
            waitForEvent(session, since, 'cart_item_added', (before.cart_item_added ?? 0) + 2).then(
                () => {
                    eventCounts(session, since).then((after) => {
                        expect(
                            (after.cart_item_added ?? 0) - (before.cart_item_added ?? 0),
                            'cart lines recorded: the two that were consented'
                        ).to.equal(2);
                    });
                }
            );
        });
    });
});
