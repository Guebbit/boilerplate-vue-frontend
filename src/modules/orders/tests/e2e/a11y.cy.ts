/**
 * @module
 * Cypress a11y sweep route list for the orders module, run through the shared `sweepA11y` helper
 * against both a signed-in user and an admin.
 *
 * Co-located so deleting the module deletes its a11y coverage with it — a central list would be
 * left naming routes the app no longer serves. `tests/cross-cutting/a11y-coverage.spec.ts` asserts
 * every routed module has one of these, so the split cannot quietly lose a domain.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11y-sweep';

/** iPhone 14-class portrait — the width `DataTable.vue`'s `mobile-breakpoint` stacks rows below. */
const PHONE = [390, 844] as const;

/*
 * The order is named by ROLE, resolved inside the test off whichever backend the profile started.
 * `cancellable` is the admin's own pending one, and pending is the status that puts every action
 * button on the page — which is the state worth auditing, since a disabled control and a missing
 * one fail accessibility differently.
 */
/**
 * Resolves the detail-page URL of a pending order owned by the current backend profile.
 */
const orderDetail = () => cy.subjectId('order.otherPending').then((id) => `/en/orders/${id}`);

/**
 * Resolves the edit-page URL of a pending order owned by the current backend profile.
 */
const orderEdit = () => cy.subjectId('order.otherPending').then((id) => `/en/orders/${id}/edit`);

sweepA11y(
    'orders — signed in',
    [
        ['orders list', '/en/orders'],
        // The 7-column ledger stacked into cards below `sm` — the layout the desktop sweep never sees.
        { name: 'orders list, phone viewport', route: '/en/orders', viewport: PHONE }
    ],
    'user'
);

// As the admin: the staff list over every order, then the detail page is reachable by its owner only, and the edit page is admin-only.
sweepA11y(
    'orders — admin',
    [
        ['sales orders', '/en/sales/orders'],
        { name: 'sales orders, phone viewport', route: '/en/sales/orders', viewport: PHONE },
        ['order detail', orderDetail],
        ['order edit', orderEdit]
    ],
    'admin'
);

// The order page hosts the delivery module's dialogs; an unopened dialog is never audited.
/** The paid express order, as the page for it. */
const paidExpressOrder = () => cy.subjectId('order.paidExpress').then((id) => `/en/orders/${id}`);

sweepA11y(
    'orders — delivery dialogs',
    [
        {
            name: 'order, ship dialog',
            route: paidExpressOrder,
            prepare: () => {
                cy.get('[data-test=mark-started]').click();
                cy.get('[data-test=open-ship]').click();
                cy.get('[data-test=ship-submit]').should('be.visible');
            }
        },
        {
            name: 'order, hold dialog',
            route: paidExpressOrder,
            prepare: () => {
                cy.get('[data-test=open-hold]').click();
                cy.get('[data-test=hold-dialog]').should('be.visible');
            }
        }
    ],
    'admin'
);

// The order page hosts the returns module's cancel-the-rest dialog.
sweepA11y(
    'orders — cancel the rest dialog',
    [
        {
            name: 'order, cancel the rest dialog',
            route: () => cy.subjectId('order.partiallyFulfilled').then((id) => `/en/orders/${id}`),
            prepare: () => {
                cy.get('[data-test=cancel-remainder-open]').click();
                cy.get('[data-test=cancel-remainder-dialog]').should('be.visible');
            }
        }
    ],
    'user'
);
