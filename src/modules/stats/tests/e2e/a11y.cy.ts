/**
 * @module
 * Accessibility for this module's own routes.
 *
 * Co-located so that deleting the module deletes its a11y coverage with it. The sweep itself lives
 * in `tests/support/e2e/a11y-sweep.ts`; this file is the route list.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11y-sweep';

/** iPhone 14-class portrait — the width the dashboard's tables must still fit. */
const PHONE = [390, 844] as const;

sweepA11y(
    'stats',
    [
        ['sales dashboard', '/en/sales/stats'],
        { name: 'sales dashboard, phone viewport', route: '/en/sales/stats', viewport: PHONE },
        ['product sales', '/en/sales/stats/products/demo-product']
    ],
    'admin'
);
