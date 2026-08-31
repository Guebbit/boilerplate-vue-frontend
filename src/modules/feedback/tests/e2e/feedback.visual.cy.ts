/**
 * @module
 * Cypress visual-regression route list for the feedback module, run through the shared
 * `sweepVisual` helper.
 *
 * Not part of `npm run complete`: run with `npm run test:e2e:visual`, and re-record with
 * `npm run test:e2e:visual:update` only after LOOKING at the diff image.
 */
import { sweepVisual } from '../../../../../tests/support/e2e/visual-sweep';

sweepVisual('feedback', [['contact', '/en/contact', '#contact-page']]);
