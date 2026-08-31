/**
 * @module
 * Cypress a11y sweep route list for the feedback module, run through the shared `sweepA11y` helper
 * against both the public and the admin surface.
 *
 * Co-located so deleting the module deletes its a11y coverage with it — a central list would be
 * left naming routes the app no longer serves. `tests/cross-cutting/a11y-coverage.spec.ts` asserts
 * every routed module has one of these, so the split cannot quietly lose a domain.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11y-sweep';

sweepA11y('feedback — public', [['contact', '/en/contact']]);

sweepA11y('feedback — admin', [['feedback inbox', '/en/feedback']], 'admin');
