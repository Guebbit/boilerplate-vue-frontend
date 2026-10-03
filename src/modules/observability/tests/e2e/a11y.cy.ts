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
import { refuseALogin } from '../../../../../tests/support/e2e/steps';

/** iPhone 14-class portrait — the width `DataTable.vue`'s `mobile-breakpoint` stacks rows below. */
const PHONE = [390, 844] as const;

sweepA11y(
    'observability',
    [
        ['admin dashboard', '/en/admin'],
        // The shop's own audit trail — a different route and a different rule (`audit.any.read`)
        // from the dashboard's platform-only tab above, see `AuditLog.vue`.
        ['audit log', '/en/audit'],
        {
            // The audit tab's table, stacked into cards below `sm` — the layout the desktop
            // sweep never sees, and a tab the default sweep never opens.
            name: 'admin dashboard, audit tab, phone viewport',
            route: '/en/admin',
            viewport: PHONE,
            prepare: () => {
                // The platform trail lists incidents only, so one is made for the table to show.
                refuseALogin();
                cy.contains('[role=tab]', 'Audit Log').click();
                cy.get('[data-test=list-row]').should('exist');
            }
        },
        ['realtime playground', '/en/playground/realtime']
    ],
    'admin'
);
