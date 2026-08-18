/**
 * Visual regression for the screens that belong to no module — the shell.
 *
 * Every other screen's baseline lives with the module that owns it, at
 * `src/modules/<name>/tests/e2e/__snapshots__/`, so deleting a domain deletes its photographs.
 * What stays here is what has no owner: the landing page, and the error page a bad URL lands on.
 *
 * Deliberately outside `npm run complete` — see `tests/support/e2e/visualSweep.ts` for why a
 * pixel diff is a report rather than a gate, and `docs/tools/visual-regression.md` for the five
 * things that have to be frozen for it to mean anything.
 */
import { sweepVisual } from '../../support/e2e/visualSweep';

sweepVisual('the shell', [
    ['home', '/en', '#home-page'],
    ['not-found', '/en/this-route-does-not-exist', '#error-page']
]);
