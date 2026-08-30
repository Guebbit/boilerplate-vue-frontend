/**
 * @module
 * Declares this module's screens (and their ready selectors) to the shared `sweepVisual` runner,
 * which visits each and diffs a screenshot against its stored baseline.
 *
 * Not part of `npm run complete`: run with `npm run test:e2e:visual`, and re-record with
 * `npm run test:e2e:visual:update` only after LOOKING at the diff image.
 */
import { sweepVisual } from '../../../../../tests/support/e2e/visual-sweep';

sweepVisual(
    'locales',
    [
        // Ready selectors are DATA rows, not the page shell: the shell exists before the API
        // answers, and a baseline of the loading state is stable, meaningless, and never fails.
        ['locales-list', '/en/locales', '[data-test=list-row]'],
        // The board's header counts arrive with the LAST language's baselines, well after the
        // first row: a row-ready baseline photographs the counts half-computed.
        ['locales-dictionary', '/en/locales/dictionary', '[data-test=dictionary-missing-count]'],
        ['locale-entries', '/en/locales/it', '[data-test=list-row]']
    ],
    'admin'
);
