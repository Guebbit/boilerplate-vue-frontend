// requires-module: account, delivery, observability, orders, users
/**
 * @module
 * OP14 · The audit trail follows the action. An admin changes an order's email and cancels it,
 * forces a parcel through ship and deliver with a reason each time, corrects a status by hand,
 * and then opens "history" on the order: the shop's audit page, narrowed to that one order.
 * The same button on a user's page narrows it to that user.
 *
 * What the page shows is the ACTION, the actor's role and the outcome — `AdminAuditTab` has no
 * column for the reason. The reason lives in the row's `metadata`, so it is read off
 * `GET /audit?target=` beside the page (the page itself does not show it).
 *
 * Forced ship is offered only on an order with no parcel that cannot be started the ordinary
 * way, so the admin's own unpaid `order.ownerPending` is the subject. The status-only override
 * (OrderEdit) and the forced delivery door both carry `stepUp: critical`: the admin signs in
 * seconds before, so no re-auth dialog is expected.
 */
import { eventually } from '../../../support/e2e/steps';

/** One audit row, as far as this story reads it. */
interface AuditRowLike {
    action: string;
    outcome: string;
    actor_role: string;
    target_id?: string;
    metadata?: { reason?: string; mode?: string; from?: string; to?: string };
}

/** A page of the shop's audit trail. */
interface AuditListLike {
    items: AuditRowLike[];
}

/** The reasons the admin types, chosen here so the audit rows can be searched for them. */
const REASONS = {
    ship: 'Courier collected it before the payment cleared',
    deliver: 'The customer confirmed the parcel arrived',
    status: 'Fixing a status the warehouse keyed in wrong'
};

/**
 * Every audit row the shop holds for one target, newest first.
 *
 * @param targetId - the order or user the rows were written against
 */
const auditRowsFor = (targetId: string): Cypress.Chainable<AuditRowLike[]> =>
    cy
        .apiAs<AuditListLike>('admin', 'GET', `/audit?target=${targetId}&pageSize=100`)
        .then((list) => list?.items ?? []);

/**
 * Whether a row for `action` exists yet — the audit write follows the request, not inside it.
 *
 * @param targetId - the order or user
 * @param action - the dotted action name
 */
const auditHas = (targetId: string, action: string): Cypress.Chainable<AuditRowLike[]> =>
    eventually(
        () => auditRowsFor(targetId),
        (rows) => rows.some((row) => row.action === action)
    );

describe('OP14 · The audit trail follows the action', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('an order and a user each have a history, filtered to them, with the reasons on record', () => {
        cy.subjectId('order.awaitingTransfer').then((editedId) => {
            cy.subjectId('order.ownerPending').then((forcedId) => {
                cy.subjectId('order.paid').then((correctedId) => {
                    cy.loginAs('admin');

                    cy.step('change the order email, then cancel it');
                    cy.visit(`/en/orders/${editedId}/edit`);
                    cy.get('[data-test=order-edit-email] input').should('not.be.disabled').clear();
                    cy.get('[data-test=order-edit-email] input').type('changed@example.com');
                    cy.get('[data-test=order-edit-email]').closest('form').submit();
                    auditHas(editedId, 'order.updated');
                    cy.get('[data-test=button-cancel-only]').should('not.be.disabled').click();
                    cy.get('[data-test=button-cancel-only]').should('be.disabled');
                    auditHas(editedId, 'order.cancelled');

                    cy.step('"history" opens the audit page narrowed to that order');
                    cy.visit(`/en/orders/${editedId}`);
                    cy.get('[data-test=order-history]').click();
                    cy.location('pathname').should('equal', '/en/audit');
                    cy.location('search').should('contain', `target=${editedId}`);
                    auditRowsFor(editedId).then((rows) => {
                        const actions = rows.map((row) => row.action);
                        expect(actions).to.include('order.updated');
                        expect(actions).to.include('order.cancelled');
                        // One row on the page per row the API holds for this order, no more.
                        cy.get('[data-test=list-row]').should('have.length', rows.length);
                        // The order's own creation row is the customer's; the two edits are the admin's.
                        for (const row of rows.filter((found) =>
                            ['order.updated', 'order.cancelled'].includes(found.action)
                        )) {
                            expect(row.actor_role).to.equal('admin');
                            expect(row.outcome).to.equal('success');
                        }
                    });
                    cy.get('[data-test=list-row]').should('contain.text', 'order.cancelled');
                    cy.get('[data-test=list-row]').should('contain.text', 'order.updated');

                    cy.step('a forced ship needs a reason, and writes an override row');
                    cy.visit(`/en/orders/${forcedId}`);
                    cy.get('[data-test=mark-started]').should('not.exist');
                    cy.get('[data-test=force-ship-toggle] input').check();
                    cy.get('[data-test=mark-shipped]').should('be.disabled');
                    cy.get('[data-test=force-ship-reason] textarea').type(REASONS.ship);
                    cy.get('[data-test=tracking-code-input] input').type('TRK-E2E-OP14');
                    cy.get('[data-test=mark-shipped]').should('not.be.disabled').click();
                    cy.get('[data-test=shipment-tracking]').should('contain.text', 'TRK-E2E-OP14');

                    cy.step('a forced delivery needs a reason too');
                    cy.get('[data-test=force-deliver-toggle] input').check();
                    cy.get('[data-test=mark-delivered]').should('be.disabled');
                    cy.get('[data-test=force-deliver-reason] textarea').type(REASONS.deliver);
                    cy.get('[data-test=mark-delivered]').should('not.be.disabled').click();
                    cy.get('[data-test=mark-delivered]').should('not.exist');
                    eventually(
                        () => auditRowsFor(forcedId),
                        (rows) =>
                            rows.filter((row) => row.action === 'order.status_overridden')
                                .length === 2
                    ).should((rows) => {
                        const overrides = rows.filter(
                            (row) => row.action === 'order.status_overridden'
                        );
                        const movedTo = (state: string) =>
                            overrides.find((row) => row.metadata?.to === state)?.metadata;
                        expect(movedTo('shipped')?.reason).to.equal(REASONS.ship);
                        expect(movedTo('shipped')?.mode).to.equal('forced');
                        expect(movedTo('delivered')?.reason).to.equal(REASONS.deliver);
                        expect(movedTo('delivered')?.mode).to.equal('forced');
                        expect(rows.map((row) => row.action)).to.include.members([
                            'admin.order.shipped',
                            'admin.order.delivered'
                        ]);
                    });

                    cy.step('the status-only override offers only later states and needs a reason');
                    cy.visit(`/en/orders/${correctedId}/edit`);
                    cy.get('[data-test=button-override]').should('be.disabled');
                    cy.get('[data-test=override-status-select]').click();
                    // `order.paid` is paid: only what lies ahead of it is on offer.
                    cy.get('[role=listbox] [role=option]').then(($options) => {
                        const labels = $options
                            .toArray()
                            .map((option) => option.textContent?.trim());
                        expect(labels).to.have.length(3);
                        expect(labels).to.not.include('Paid');
                        expect(labels).to.not.include('Pending');
                    });
                    cy.get('[role=listbox] [role=option]').contains('Processing').click();
                    cy.get('[data-test=button-override]').should('be.disabled');
                    cy.get('[data-test=override-reason] textarea').type(REASONS.status);
                    cy.get('[data-test=button-override]').should('not.be.disabled').click();
                    auditHas(correctedId, 'order.status_overridden').should((rows) => {
                        const row = rows.find(
                            (entry) => entry.action === 'order.status_overridden'
                        );
                        expect(row?.metadata).to.include({
                            mode: 'status',
                            from: 'paid',
                            to: 'processing',
                            reason: REASONS.status
                        });
                    });

                    cy.step('a user has a history as well, filtered to them');
                    cy.accountOf('user').then(({ email }) => {
                        cy.apiAs<{ items: { id: string }[] }>('admin', 'POST', '/users/search', {
                            email
                        }).then((found) => {
                            const userId = String(found?.items[0]?.id);
                            cy.apiAs('admin', 'PATCH', `/users/${userId}`, {
                                phone: '+390000000014'
                            });
                            auditHas(userId, 'admin.user.updated');
                            cy.visit(`/en/users/${userId}`);
                            cy.get('[data-test=user-history]').click();
                            cy.location('search').should('contain', `target=${userId}`);
                            cy.get('[data-test=list-row]').should(
                                'contain.text',
                                'admin.user.updated'
                            );
                            // The order's rows are not this user's.
                            cy.get('[data-test=list-row]').should(
                                'not.contain.text',
                                'order.cancelled'
                            );
                        });
                    });
                });
            });
        });
    });
});
