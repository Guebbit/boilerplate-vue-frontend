/**
 * Accessibility for this module's own routes.
 *
 * Co-located so that deleting the module deletes its a11y coverage with it — a central list would
 * be left naming routes the app no longer serves. `tests/cross-cutting/a11y-coverage.spec.ts`
 * asserts every routed module has one of these, so the split cannot quietly lose a domain.
 *
 * The sweep itself lives in `tests/support/e2e/a11y-sweep.ts`; this file is the route list.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11y-sweep';

/*
 * The order is named by ROLE, resolved inside the test off whichever backend the profile started.
 * `cancellable` is the admin's own pending one, and pending is the status that puts every action
 * button on the page — which is the state worth auditing, since a disabled control and a missing
 * one fail accessibility differently.
 */
const orderDetail = () => cy.orderInRole('cancellable').then((order) => `/en/orders/${order.id}`);

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
