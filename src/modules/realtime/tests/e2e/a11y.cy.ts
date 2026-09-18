/**
 * @module
 * Declares this module's route to the shared `sweepA11y` runner, which visits it and asserts
 * against axe.
 *
 * Co-located so deleting the module deletes its a11y coverage with it; a central list would be
 * left naming routes the app no longer serves. `tests/cross-cutting/a11y-coverage.spec.ts` asserts
 * every routed module has one of these, so the split cannot quietly lose a domain.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11y-sweep';

sweepA11y('realtime', [['realtime playground', '/en/playground/realtime']], 'admin');
