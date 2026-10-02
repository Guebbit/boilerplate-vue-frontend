/// <reference types="cypress" />

import { cents } from '../../../scripts/e2e/cents';
import type { E2ERole } from './scenario';
import type { MailedEmail } from '../../../scripts/e2e/mail-message';

export { cents, sumCents } from '../../../scripts/e2e/cents';

/**
 * Steps several journeys walk the same way: putting a seeded product in the cart through the
 * storefront, filling the address dialog, and reading money off the screen.
 *
 * Plain functions over `cy`, not commands: they name no state of their own, and a journey reads
 * `addToCart('product.rich')` where a command would hide that the storefront is being driven. A
 * story's own steps stay in its spec; only what two stories do identically lands here.
 */

/**
 * The cents an element shows.
 *
 * @param selector - a `data-test` selector for one money element
 */
export const centsOf = (selector: string): Cypress.Chainable<number> =>
    cy.get(selector).invoke('text').then(cents);

/**
 * Waits until an element's money, read in cents, satisfies `check` — retried, unlike
 * {@link centsOf}, which reads once. For a total that moves after a click the page debounces.
 *
 * @param selector - a `data-test` selector for one money element
 * @param check - an assertion over the cents; it throws (an `expect`) while the page is not there yet
 */
export const shouldShowCents = (selector: string, check: (amount: number) => void): void => {
    cy.get(selector).should(($element) => {
        check(cents($element.text()));
    });
};

/**
 * From the storefront's list, opens the card of a seeded product — by the link's own address, so
 * no title is copied into the spec. The list must already show it (filter first).
 *
 * @param name - a `product.*` guarantee name
 */
export const openProductCard = (name: string): Cypress.Chainable<JQuery> =>
    cy
        .subjectId(name)
        .then((id) => cy.get(`[data-test=product-card-link][href$="/${id}"]`).click());

/**
 * From the storefront's list, narrows it by typing a seeded product's own title into the search
 * box, then opens its card. The title is read from the API, never written into the spec.
 *
 * @param name - a `product.*` guarantee name
 */
export const searchAndOpenProduct = (name: string): Cypress.Chainable<JQuery> =>
    cy.subjectProduct(name).then(({ title }) => {
        cy.get('[data-test=filter-text] input').clear();
        // Enter submits the search form — the box filters only on submit.
        cy.get('[data-test=filter-text] input').type(`${title}{enter}`);
        return openProductCard(name);
    });

/**
 * On a product page, adds it to the cart and waits for the API to have taken it — the request is
 * the signal, since the toast is copy and the cart's own count is a second read.
 */
export const addOpenProductToCart = (): Cypress.Chainable<unknown> => {
    cy.intercept('POST', '**/cart').as('addToCart');
    cy.get('[data-test=add-to-cart]').click();
    return cy.wait('@addToCart').its('response.statusCode').should('be.within', 200, 299);
};

/**
 * Fills the address dialog's inputs and saves. The country is a `v-autocomplete` over ~249 codes:
 * typed into to filter, then the first option it offers is taken.
 *
 * @param address - the recipient's details; the country is typed as its English name
 */
export const fillAddressDialog = (address: {
    label: string;
    fullName: string;
    street: string;
    zip: string;
    city: string;
    country: string;
}): void => {
    cy.get('[data-test=address-dialog]').within(() => {
        // The five text inputs come in the form's own order; they carry no `data-test` of their
        // own because the dialog is also the profile's, and its specs address them the same way.
        const values = [address.label, address.fullName, address.street, address.zip, address.city];
        for (const [index, value] of values.entries()) {
            cy.get('input').eq(index).should('not.be.disabled').clear();
            cy.get('input').eq(index).type(value);
        }
        cy.get('[data-test=address-country]').click();
        cy.get('[data-test=address-country]').type(address.country);
    });
    cy.get('.v-overlay-container .v-list-item').first().click();
    cy.get('[data-test=address-save]').click();
};

/**
 * Gives a seeded persona one saved address through the API. Every order carries a billing address
 * for its invoice, so a persona whose book is empty cannot check out; the seeded customer keeps
 * one already, the staff accounts do not.
 *
 * @param role - the persona whose book gets the entry
 */
export const giveAnAddress = (role: E2ERole): Cypress.Chainable<unknown> =>
    cy.apiAs(role, 'POST', '/account/addresses', {
        label: 'Home',
        fullName: 'Ada Lovelace',
        street: 'Via Emilia 1',
        zip: '41121',
        city: 'Modena',
        country: 'IT'
    });

/**
 * Fills the signup form already on screen and submits it — the half `signUp` shares with a story
 * that reached the form by clicking through to it.
 *
 * @param email - the new account's address
 * @param password - a password that clears the strength rule
 */
export const fillSignupForm = (email: string, password: string): void => {
    cy.get('[type=email]').should('not.be.disabled').clear();
    cy.get('[type=email]').type(email);
    cy.get('[type=password]').eq(0).type(password);
    cy.get('[type=password]').eq(1).type(password);
    // Specifically the required one: the optional analytics checkbox shares the form.
    cy.get('[data-test=signup-terms-accepted] input[type=checkbox]').check();
    cy.get('#signup-page button[type="submit"]').click();
};

/**
 * Creates an account through the signup form and leaves the page on Home, signed in and
 * unverified — `POST /account/signup` sets the session itself.
 *
 * @param email - the new account's address
 * @param password - a password that clears the strength rule
 */
export const signUp = (email: string, password: string): void => {
    cy.visit('/en/signup');
    fillSignupForm(email, password);
    cy.get('#home-page').should('exist');
};

/**
 * Signs in through the login form with credentials the seed does not know — an account a journey
 * made itself. `cy.loginAs` covers the seeded ones.
 *
 * @param email - the account's address
 * @param password - its password
 */
export const signInWith = (email: string, password: string): void => {
    cy.visit('/en/login');
    cy.get('[type=email]').should('not.be.disabled').clear();
    cy.get('[type=email]').type(email);
    cy.get('[type=password]').clear();
    cy.get('[type=password]').type(password);
    cy.get('form').submit();
    cy.url().should('not.include', '/login');
};

/**
 * Puts a seeded product in the cart the way a shopper does: the products page, the category
 * chip that narrows to it (or, for a product with no category, its own title in the search box),
 * its card, "add to cart". The caller must already be on a page with the app bar.
 *
 * @param name - a `product.*` guarantee name
 */
export const addToCartFromStorefront = (name: string): void => {
    cy.navigateTo('/en/products');
    cy.subjectProduct(name).then((product) => {
        if (product.categories?.length) {
            cy.filterByNarrowestCategoryOf(name);
            openProductCard(name);
        } else searchAndOpenProduct(name);
    });
    addOpenProductToCart();
};

/**
 * The id at the end of the current address — the order a checkout just landed on.
 *
 * @returns a chain yielding the last path segment
 */
export const idFromLocation = (): Cypress.Chainable<string> =>
    cy.location('pathname').then((path) => String(path.split('/').at(-1)));

/**
 * The order number the order page shows, without its label: the last word of the `order-number`
 * text. Mails and invoices cite this, not the id.
 *
 * @returns a chain yielding the number
 */
export const orderNumberShown = (): Cypress.Chainable<string> =>
    cy
        .get('[data-test=order-number]')
        .invoke('text')
        .then((text) => String(text.trim().split(/\s+/).at(-1)));

/** How many times {@link eventually} reads before it gives up. */
const EVENTUALLY_ATTEMPTS = 20;

/**
 * Reads until `isDone` likes what came back, half a second apart — for a consequence the backend
 * reaches through an event rather than inside the request that caused it (a refund after a
 * cancel). The last read is yielded either way, so the caller's own assertion reports the state
 * it gave up on.
 *
 * @param read - one read of the thing
 * @param isDone - whether the read shows the consequence
 * @param attemptsLeft - how many reads remain, this one included
 */
export const eventually = <T>(
    read: () => Cypress.Chainable<T>,
    isDone: (value: T) => boolean,
    attemptsLeft = EVENTUALLY_ATTEMPTS
): Cypress.Chainable<T> =>
    read().then((value) => {
        if (isDone(value) || attemptsLeft <= 1) return cy.wrap(value, { log: false });
        // eslint-disable-next-line cypress/no-unnecessary-waiting -- the consequence has no event the browser can wait on
        return cy.wait(500).then(() => eventually(read, isDone, attemptsLeft - 1));
    });

/**
 * Whether a mail carries a confirmation link other than `known` — how the spec tells the second
 * mail from the first when both sit in one inbox.
 *
 * @param known - the link already seen
 */
export const carriesAnotherLink =
    (known: string) =>
    (email: MailedEmail): boolean =>
        email.lines?.some(
            (line) => line.startsWith('linkUrl: ') && line !== `linkUrl: ${known}`
        ) === true;

/**
 * The ids of the rows a staff list shows right now, in order — read off each row's "view" link, so
 * no title or email is copied into a spec.
 *
 * @returns a chain yielding the ids
 */
export const listedIds = (): Cypress.Chainable<string[]> =>
    cy.get('body').then(($body) =>
        $body
            .find('[data-test=row-view]')
            .toArray()
            .map((link) => String(link.getAttribute('href')).split('/').at(-1) ?? '')
    );

/**
 * Presses "search" and waits until the list has finished answering. Needs `cy.trackNetwork()`
 * to have been called before the visit.
 */
export const submitSearch = (): void => {
    cy.get('[data-test=search-submit]').click();
    cy.settleNetwork();
};

/**
 * Presses "reset" and waits until the list has finished answering.
 */
export const resetSearch = (): void => {
    cy.get('[data-test=search-reset]').click();
    cy.settleNetwork();
};

/**
 * Solves the human check the page is showing, the way a visitor does: ticks the box and waits for
 * the proof-of-work to finish. Only the antibot run has one to solve (`*.antibot.cy.ts`).
 *
 * The widget is the `altcha` package's custom element, which renders into the light DOM: its box is
 * a plain checkbox, and the element flags itself `data-state="verified"` once the token is ready.
 * The hosting form reads that token on its next submit, so the caller presses its own button after.
 *
 * `force`: the widget draws its own tick (an svg) over the real input, which Cypress reads as the
 * input being covered.
 */
export const solveHumanCheck = (): void => {
    cy.get('[data-test=human-check-altcha] input[type=checkbox]').check({ force: true });
    cy.get('[data-test=human-check-altcha] [data-state=verified]').should('exist');
};
