/**
 * Accessibility for this module's own routes.
 *
 * Co-located so that deleting the module deletes its a11y coverage with it — a central list would
 * be left naming routes the app no longer serves. `tests/cross-cutting/a11y-coverage.spec.ts`
 * asserts every routed module has one of these, so the split cannot quietly lose a domain.
 *
 * `it` rather than `es` for the entries page: both are seeded, but `it` has exactly one entry, so
 * the sweep sees the table populated without depending on the bigger fixture's row count.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11y-sweep';

sweepA11y(
    'locales',
    [
        ['languages board', '/en/locales'],
        ['translation entries', '/en/locales/it']
    ],
    'admin'
);
