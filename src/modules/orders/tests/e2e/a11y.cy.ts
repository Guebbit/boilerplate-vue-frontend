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

/** The first seeded order — the admin's, pending, so every action button is on the page. */
const ORDER_ID = '65de73a69ca05739be2b5e85';

sweepA11y('orders — signed in', [['orders list', '/en/orders']], 'user');

// As the admin: the detail page is reachable by its owner only, and the edit page is admin-only.
sweepA11y(
    'orders — admin',
    [
        ['order detail', `/en/orders/${ORDER_ID}`],
        ['order edit', `/en/orders/${ORDER_ID}/edit`]
    ],
    'admin'
);
