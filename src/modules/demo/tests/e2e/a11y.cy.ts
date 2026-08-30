/**
 * @module
 * Cypress a11y sweep route list for the demo module, run through the shared
 * `sweepA11y` helper.
 */

/**
 * Accessibility for this module's own routes.
 *
 * Co-located so that deleting the module deletes its a11y coverage with it.
 * `tests/cross-cutting/a11y-coverage.spec.ts` asserts every routed module has one of these.
 *
 * The sweep itself lives in `tests/support/e2e/a11y-sweep.ts`; this file is the route list.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11y-sweep';

sweepA11y('demo', [['playground', '/en/playground']]);
