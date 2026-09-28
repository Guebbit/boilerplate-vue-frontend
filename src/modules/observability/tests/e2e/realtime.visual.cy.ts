/**
 * @module
 * Declares this module's screen (and its ready selector) to the shared `sweepVisual` runner, which
 * visits it and diffs a screenshot against its stored baseline.
 *
 * Not part of `npm run complete`: run with `npm run test:e2e:visual`, and re-record with
 * `npm run test:e2e:visual:update` only after LOOKING at the diff image.
 */
import { sweepVisual } from '../../../../../tests/support/e2e/visual-sweep';

sweepVisual(
    'realtime',
    [['realtime-playground', '/en/playground/realtime', '#realtime-playground-page']],
    'admin'
);
