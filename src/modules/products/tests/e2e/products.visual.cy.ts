/**
 * @module
 * Screen list for the module's visual-regression sweep — see `tests/support/e2e/visual-sweep.ts`
 * for the mechanism.
 *
 * Not part of `npm run complete`: run with `npm run test:e2e:visual`, and re-record with
 * `npm run test:e2e:visual:update` only after LOOKING at the diff image.
 */
import { sweepVisual } from '../../../../../tests/support/e2e/visual-sweep';

sweepVisual('products', [['products-list', '/en/products', '#products-list-page']]);
