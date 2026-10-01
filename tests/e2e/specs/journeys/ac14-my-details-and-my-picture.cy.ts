// requires-module: account
/**
 * @module
 * AC14 · My details and my picture. The customer edits username, phone and website and finds them
 * after a reload; clears a field and the record holds nothing rather than an empty string;
 * uploads an avatar, sees it after a reload, removes it and gets the placeholder back; loses a
 * save to another device and is offered the latest record instead of overwriting it; and can
 * throw away what they typed with "reset".
 *
 * The other device is a second real login (`loginDevice`), so its write changes the record's
 * version behind the page's back — the 412 path, which only two writers can reach.
 */
import { loginDevice, requestAsDevice } from '../../../support/e2e/harness';
import { pollForImageSource, UPLOAD_PATH } from '../../../support/e2e/images';
import { eventually } from '../../../support/e2e/steps';

/** What the customer types, chosen here: the values are read back from screens and the API. */
const DETAILS = {
    username: 'Ada Lovelace',
    phone: '+390591234567',
    website: 'https://example.org/ada'
};

/** The other device's username — different from anything typed here. */
const OTHER_DEVICE_USERNAME = 'Typed On Device Two';

/** The slice of the account record this story reads. */
interface AccountLike {
    username: string;
    phone?: string | null;
    website?: string | null;
    imageUrl?: string | null;
}

/**
 * Replaces a text field's content, waiting for the field to be live first.
 *
 * @param testId - the field's `data-test`
 * @param value - what to type; empty clears it
 */
const setField = (testId: string, value: string): void => {
    cy.get(`[data-test=${testId}] input`).should('not.be.disabled').clear();
    if (value !== '') cy.get(`[data-test=${testId}] input`).type(value);
};

/**
 * Presses the form's save button and waits for the save to settle: a saved form is clean again,
 * which is what disables the button.
 *
 * Deliberately no `cy.intercept` on the PATCH: an intercept lives to the end of the test, and one
 * left on `PATCH /account` buffers the avatar's binary multipart body later and corrupts it.
 */
const saveDetails = (): void => {
    cy.get('#profile-page form button[type=submit]').first().should('not.be.disabled').click();
    cy.get('#profile-page form button[type=submit]').first().should('be.disabled');
};

/**
 * The account record as the API holds it, read as the customer.
 */
const accountNow = (): Cypress.Chainable<AccountLike> =>
    cy.apiAs<AccountLike>('user', 'GET', '/account').then((account) => account!);

describe('AC14 · My details and my picture', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.loginAs('user');
        cy.visit('/en/profile');
        cy.get('#profile-page').should('exist');
    });

    it('details survive a reload and clear to nothing, the avatar comes and goes, a stale save is refused, and reset discards', () => {
        cy.step('saves a username, a phone and a website, and finds them after a reload');
        setField('profile-username', DETAILS.username);
        setField('profile-phone', DETAILS.phone);
        setField('profile-website', DETAILS.website);
        saveDetails();
        cy.reload();
        cy.get('[data-test=profile-username] input').should('have.value', DETAILS.username);
        cy.get('[data-test=profile-phone] input').should('have.value', DETAILS.phone);
        cy.get('[data-test=profile-website] input').should('have.value', DETAILS.website);

        cy.step('clearing the phone leaves the record with nothing, not an empty string');
        setField('profile-phone', '');
        saveDetails();
        accountNow().should((account) => {
            expect(account.phone ?? null, 'the stored phone').to.equal(null);
            expect(account.website, 'the website kept').to.equal(DETAILS.website);
        });

        cy.step('uploads an avatar: it is served from the upload path, also after a reload');
        // The seeded customer already has a picture, so the remove button is no sign the upload
        // finished: the API holding an uploaded path is.
        cy.get('[data-test=profile-avatar-input] input[type=file]').selectFile(
            'tests/e2e/fixtures/sample-image.png',
            { force: true }
        );
        eventually(accountNow, (account) => UPLOAD_PATH.test(account.imageUrl ?? '')).should(
            (account) => {
                expect(account.imageUrl, 'the stored image').to.match(UPLOAD_PATH);
            }
        );
        cy.reload();
        pollForImageSource('img[alt="Image preview"]', UPLOAD_PATH).should('match', UPLOAD_PATH);

        cy.step('removes it after confirming: the placeholder is back and the API holds no image');
        cy.get('[data-test=profile-avatar-remove]').click();
        cy.get('[data-test=app-dialog-confirm]').click();
        cy.get('[data-test=profile-avatar-remove]').should('not.exist');
        cy.get('img[alt="Image preview"]').should('not.exist');
        accountNow().should((account) => {
            expect(account.imageUrl ?? null, 'the stored image').to.equal(null);
        });

        cy.step('another device saves first: this save is refused and offers the latest record');
        loginDevice('user').then((device) => {
            requestAsDevice(device, 'PATCH', '/account', { username: OTHER_DEVICE_USERNAME })
                .its('status')
                .should('equal', 200);
        });
        setField('profile-username', 'Typed On Device One');
        cy.intercept('PATCH', '**/account').as('staleSave');
        cy.get('#profile-page form button[type=submit]').first().click();
        cy.wait('@staleSave').its('response.statusCode').should('equal', 412);
        cy.get('[data-test=profile-form-error]').should('not.be.empty');

        cy.step('"reload latest" shows the other device’s value in the form');
        cy.get('[data-test=profile-reload-latest]').click();
        cy.get('[data-test=profile-username] input').should('have.value', OTHER_DEVICE_USERNAME);
        cy.get('[data-test=profile-reload-latest]').should('not.exist');

        cy.step('"reset form" throws away what was typed');
        setField('profile-phone', '+390000000000');
        cy.get('[data-test=profile-reset-form]').click();
        cy.get('[data-test=profile-phone] input').should('have.value', '');
        cy.get('[data-test=profile-username] input').should('have.value', OTHER_DEVICE_USERNAME);
    });
});
