/**
 * @module
 * Accessibility for this module's own routes.
 *
 * Co-located so that deleting the module deletes its a11y coverage with it — a central list would
 * be left naming routes the app no longer serves. `tests/cross-cutting/a11y-coverage.spec.ts`
 * asserts every routed module has one of these, so the split cannot quietly lose a domain.
 *
 * The sweep itself lives in `tests/support/e2e/a11y-sweep.ts`; this file is the route list.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11y-sweep';

/** iPhone 14-class portrait — the width `DataTable.vue`'s `mobile-breakpoint` stacks rows below. */
const PHONE = [390, 844] as const;

sweepA11y(
    'inventory',
    [
        ['inventory ledger', '/en/inventory'],
        // `StockBoard` and the 7-column `MovementLedger` stacked into cards below `sm`.
        { name: 'inventory ledger, phone viewport', route: '/en/inventory', viewport: PHONE }
    ],
    'admin'
);
