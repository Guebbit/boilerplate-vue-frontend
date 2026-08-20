/**
 * Visual regression for this module's own screen.
 *
 * Baselines live in `__snapshots__/` beside this file, so deleting the module deletes its
 * photographs too — a central folder would keep PNGs of a screen the app no longer serves.
 *
 * Not part of `npm run complete`: run it with `npm run test:e2e:visual`, and re-record with
 * `npm run test:e2e:visual:update` only after LOOKING at the diff image. Re-recording without
 * looking is the one thing that makes this suite worthless.
 *
 * The sweep itself lives in `tests/support/e2e/visual-sweep.ts`; this file is the screen list.
 */
import { sweepVisual } from '../../../../../tests/support/e2e/visual-sweep';

sweepVisual('feedback', [['contact', '/en/contact', '#contact-page']]);
