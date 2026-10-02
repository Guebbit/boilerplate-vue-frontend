// requires-module: account, feedback, observability, returns, users
/**
 * @module
 * OP18 · The support desk. A visitor writes through the contact form; support works the inbox
 * (filters it, annotates, resolves), fixes a customer's phone number, and declines a return with
 * a reason the customer then reads. Support may update an account and may not create or erase
 * one, and the screens show it neither button. The admin finds every one of those actions in
 * the audit trail, under the support role.
 *
 * What is not here: clearing a customer's two-factor and banning an account are decided
 * differently once the privilege work lands, so neither is pinned yet.
 */
import { eventually } from '../../../support/e2e/steps';

/** The visitor, and the subject of the ticket they write. */
const VISITOR = { email: 'op18.visitor@example.com', subject: 'OP18 where is my parcel' };

/** The note support keeps on the ticket, and the phone they fix on the customer. */
const NOTE = 'Rang the courier, parcel is at the depot.';
const NEW_PHONE = '+39 055 7654321';

/** The reason support gives for declining, which the customer must be able to read. */
const DECLINE_REASON = 'The photos show ordinary wear, not a fault.';

/** One audit row, as far as this story reads it. */
interface AuditRowLike {
    action: string;
    actor_role: string;
}

/** A ticket, as far as this story reads it. */
interface TicketLike {
    id: string;
}

/**
 * The hrefs of the open administration menu, then closes it.
 *
 * @returns a chain yielding the hrefs
 */
const adminMenuLinks = (): Cypress.Chainable<string[]> => {
    cy.get('[data-test=admin-menu]').click();
    return cy
        .get('[role=menu] a')
        .then(($links) => $links.toArray().map((link) => link.getAttribute('href') ?? ''))
        .then((hrefs) => {
            cy.get('body').type('{esc}');
            return cy.wrap(hrefs, { log: false });
        });
};

/**
 * The visitor fills the contact form and sends it.
 */
const writeToTheShop = (): void => {
    cy.visit('/en/contact');
    cy.get('[data-test=contact-email] input').type(VISITOR.email);
    cy.get('[data-test=contact-subject] input').type(VISITOR.subject);
    cy.textareaIn('contact-message').type('It was meant to arrive on Tuesday. Thank you.');
    cy.get('[data-test=contact-submit]').click();
    cy.get('[data-test=contact-submit-error]').should('not.exist');
};

/**
 * Presses search on the inbox and waits for it to answer.
 */
const search = (): void => {
    cy.get('[data-test=search-submit]').click();
    cy.settleNetwork();
};

/**
 * Waits until the admin's audit trail holds a row of one action against a target, written by the
 * support role.
 *
 * @param targetId - the ticket, user or return the row names
 * @param action - the dotted action
 */
const auditedAsSupport = (targetId: string, action: string): void => {
    eventually(
        () =>
            cy
                .apiAs<{ items: AuditRowLike[] }>(
                    'admin',
                    'GET',
                    `/audit?target=${targetId}&pageSize=100`
                )
                .then((list) => list?.items ?? []),
        (rows) => rows.some((row) => row.action === action && row.actor_role === 'support')
    );
};

describe('OP18 · The support desk', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('support works the inbox, fixes an account and declines a return, and every action is on record', () => {
        cy.step('a visitor writes to the shop, and two more tickets are waiting');
        writeToTheShop();
        cy.apiAs('admin', 'POST', '/feedback/contact', {
            email: 'op18.other@example.com',
            subject: 'OP18 invoice question',
            message: 'Please resend my invoice.'
        });
        cy.apiAs('admin', 'POST', '/feedback/contact', {
            email: 'op18.third@example.com',
            subject: 'OP18 kennel question',
            message: 'Does the kennel come flat-packed?'
        });

        cy.step('support’s menu is the people and the paperwork, not the stock or the keys');
        cy.loginAs('support');
        adminMenuLinks().should((links) => {
            expect(links).to.include('/en/users');
            expect(links).to.include('/en/feedback');
            for (const page of ['/inventory', '/locales', '/admin', '/api-keys']) {
                expect(links, page).to.not.include(`/en${page}`);
            }
        });

        cy.step('the inbox filters by text and by status, and a note sticks');
        cy.trackNetwork();
        cy.visit('/en/feedback');
        cy.settleNetwork();
        cy.get('[data-test=feedback-item]').should('have.length', 3);
        cy.get('[data-test=filter-text] input').type('parcel');
        search();
        cy.get('[data-test=feedback-item]').should('have.length', 1);
        cy.get('[data-test=feedback-item]').should('contain.text', VISITOR.subject);
        cy.get('[data-test=feedback-notes] textarea').first().type(NOTE);
        cy.get('[data-test=feedback-notes-save]').click();
        cy.settleNetwork();
        // The filter lives in the address, so the reload keeps the narrowed list.
        cy.reload();
        cy.settleNetwork();
        cy.get('[data-test=feedback-item]').should('have.length', 1);
        cy.get('[data-test=feedback-notes] textarea').first().should('have.value', NOTE);

        cy.step('resolving it moves it out of New and into Resolved');
        cy.get('[data-test=feedback-status]').first().click();
        cy.get('[role=listbox] [role=option]').contains('Resolved').click();
        cy.settleNetwork();
        cy.get('[data-test=search-reset]').click();
        cy.settleNetwork();
        cy.pickOption('[data-test=filter-status]', 'Resolved');
        search();
        cy.get('[data-test=feedback-item]').should('have.length', 1);
        cy.get('[data-test=feedback-item]').should('contain.text', VISITOR.subject);
        cy.get('[data-test=feedback-responded-at]').should('exist');

        cy.step('the customer’s phone is fixed in the user form; support has no create or erase');
        cy.accountInRole('user').then(({ id: customerId }) => {
            cy.visit('/en/users');
            cy.get('[data-test=row-edit]').should('exist');
            cy.get('[data-test=row-access]').should('exist');
            cy.get('[data-test=row-delete]').should('not.exist');
            cy.get('[data-test=row-hard-delete]').should('not.exist');
            cy.get('a[href$="/users/create"]').should('not.exist');

            cy.visit(`/en/users/${customerId}/edit`);
            cy.get('[data-test=user-edit-username] input').should('not.have.value', '');
            cy.get('[data-test=user-edit-phone] input').clear();
            cy.get('[data-test=user-edit-phone] input').type(NEW_PHONE);
            cy.get('#user-edit-page form').submit();
            cy.contains('User updated successfully').should('exist');
            cy.visit(`/en/users/${customerId}/edit`);
            cy.get('[data-test=user-edit-phone] input').should('have.value', NEW_PHONE);
            auditedAsSupport(customerId, 'admin.user.updated');
        });

        cy.step('a return request is declined with a reason');
        cy.subjectId('return.requestedSecond').then((returnId) => {
            cy.visit(`/en/returns/${returnId}`);
            cy.get('[data-test=return-decline-reason] input').type(DECLINE_REASON);
            cy.get('[data-test=return-decline]').click();
            cy.get('[data-test=return-decline-reason-text]').should('contain.text', DECLINE_REASON);
            auditedAsSupport(returnId, 'admin.return.declined');

            cy.step('the customer reads the reason');
            cy.switchUser('user');
            cy.visit(`/en/returns/${returnId}`);
            cy.get('[data-test=return-decline-reason-text]').should('contain.text', DECLINE_REASON);
        });

        cy.step('the ticket’s status change is on record under the support role');
        cy.apiAs<{ items: TicketLike[] }>('admin', 'POST', '/feedback/search', {
            text: VISITOR.subject
        }).then((found) => {
            auditedAsSupport(String(found?.items[0]?.id), 'admin.feedback.status_updated');
        });
    });

    it('the inbox is paged, and the second page holds the rest', () => {
        cy.skipUnlessDemo();

        cy.step('twelve tickets, ten to a page');
        for (let ticket = 1; ticket <= 12; ticket += 1) {
            cy.apiAs('admin', 'POST', '/feedback/contact', {
                email: `op18.page${String(ticket)}@example.com`,
                subject: `OP18 page ticket ${String(ticket)}`,
                message: 'Filling the inbox.'
            });
        }
        cy.loginAs('support');
        cy.visit('/en/feedback');
        cy.get('[data-test=feedback-item]').should('have.length', 10);

        cy.step('the second page has the other two');
        cy.get('[data-test=pagination]').contains('button', '2').click();
        cy.get('[data-test=feedback-item]').should('have.length', 2);
    });
});
