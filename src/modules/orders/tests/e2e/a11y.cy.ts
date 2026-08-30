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

/*
 * The order is named by ROLE, resolved inside the test off whichever backend the profile started.
 * `cancellable` is the admin's own pending one, and pending is the status that puts every action
 * button on the page — which is the state worth auditing, since a disabled control and a missing
 * one fail accessibility differently.
 */
/**
 * Resolves the detail-page URL of a pending order owned by the current backend profile.
 */
const orderDetail = () => cy.orderInRole('cancellable').then((order) => `/en/orders/${order.id}`);

/**
 * Resolves the edit-page URL of a pending order owned by the current backend profile.
 */
const orderEdit = () =>
    cy.orderInRole('cancellable').then((order) => `/en/orders/${order.id}/edit`);

sweepA11y('orders — signed in', [['orders list', '/en/orders']], 'user');

// As the admin: the detail page is reachable by its owner only, and the edit page is admin-only.
sweepA11y(
    'orders — admin',
    [
        ['order detail', orderDetail],
        ['order edit', orderEdit]
    ],
    'admin'
);
