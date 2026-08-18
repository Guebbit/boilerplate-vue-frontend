/**
 * Visual regression for this module's own screens.
 *
 * Baselines live in `__snapshots__/` beside this file, so deleting the module deletes its
 * photographs too — a central folder would keep PNGs of a screen the app no longer serves.
 *
 * Not part of `npm run complete`: run it with `npm run test:e2e:visual`, and re-record with
 * `npm run test:e2e:visual:update` only after LOOKING at the diff image. Re-recording without
 * looking is the one thing that makes this suite worthless.
 */
import { sweepVisual } from '../../../../../tests/support/e2e/visualSweep';

sweepVisual(
    'locales',
    [
        // Ready selectors are DATA rows, not the page shell: the shell exists before the mock
        // answers, and a baseline of the loading state is stable, meaningless, and never fails.
        ['locales-list', '/en/locales', '[data-test=language-row]'],
        ['locale-entries', '/en/locales/it', '[data-test=entry-row]']
    ],
    'admin'
);
