/**
 * @module
 * Accessibility for this module's own routes: the staff payments page, each tab, and the drawer.
 *
 * Co-located so that deleting the module deletes its a11y coverage with it. The sweep itself lives
 * in `tests/support/e2e/a11y-sweep.ts`; this file is the route list.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11y-sweep';

sweepA11y(
    'payments',
    [
        ['payments, all', '/en/sales/payments'],
        ['payments, refunds', '/en/sales/payments?tab=refunds'],
        ['payments, needs attention', '/en/sales/payments?tab=attention'],
        ['payments, awaiting transfer', '/en/sales/payments?tab=awaiting'],
        {
            name: 'payments, drawer open',
            route: '/en/sales/payments',
            prepare: () => {
                cy.get('[data-test=payment-row]').first().click();
                cy.get('[data-test=payment-drawer]').should('be.visible');
            }
        }
    ],
    'admin'
);
