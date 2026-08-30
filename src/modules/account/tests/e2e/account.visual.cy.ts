/**
 * @module
 * Screen list for this module's own visual-regression sweep — the mechanism lives in
 * `tests/support/e2e/visual-sweep.ts`; this file only names the screen(s) to snapshot.
 *
 * Baselines live in `__snapshots__/` beside this file, so deleting the module deletes its
 * photographs too. Not part of `npm run complete`: run with `npm run test:e2e:visual`, and
 * re-record with `npm run test:e2e:visual:update` only after LOOKING at the diff image.
 */
import { sweepVisual } from '../../../../../tests/support/e2e/visual-sweep';

sweepVisual('account', [['login', '/en/login', '#login-page']]);
