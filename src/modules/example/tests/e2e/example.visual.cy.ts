/**
 * @module
 * Cypress visual-regression route list for the example module, run through the shared
 * `sweepVisual` helper: the list and the detail as the demo editor, and the public page as a guest.
 * The backend's demo scenario seeds the pinned ids below.
 *
 * Not part of `npm run complete`: run with `npm run test:e2e:visual`, and re-record with
 * `npm run test:e2e:visual:update` only after LOOKING at the diff image. Baselines are recorded
 * inside the pinned image only (`docs/tools/visual-regression.md`).
 */
import { sweepVisual } from '../../../../../tests/support/e2e/visual-sweep';

/** The editor's seeded published example. */
const EDITOR_PUBLISHED = '65e1a0000000000000000e01';

/** The admin's seeded published example, which the public page reads. */
const ADMIN_PUBLISHED = '65e1a0000000000000000e04';

sweepVisual(
    'example',
    [
        ['list', '/en/examples', '#examples-list-page'],
        ['detail', `/en/examples/${EDITOR_PUBLISHED}`, '#example-target']
    ],
    'editor'
);

sweepVisual('example-public', [
    ['published', `/en/examples/published/${ADMIN_PUBLISHED}`, '#example-published-page']
]);
