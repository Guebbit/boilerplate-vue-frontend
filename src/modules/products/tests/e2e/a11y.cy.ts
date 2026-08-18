/**
 * Accessibility for this module's own routes.
 *
 * Co-located so that deleting the module deletes its a11y coverage with it — a central list would
 * be left naming routes the app no longer serves. `tests/cross-cutting/a11yCoverage.spec.ts`
 * asserts every routed module has one of these, so the split cannot quietly lose a domain.
 *
 * The sweep itself lives in `tests/support/e2e/a11ySweep.ts`; this file is the route list.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11ySweep';

sweepA11y('products — public', [['products list', '/en/products']]);

sweepA11y('products — admin', [['product create', '/en/products/create']], 'admin');
