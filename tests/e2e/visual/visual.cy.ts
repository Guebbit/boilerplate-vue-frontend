/**
 * Visual regression for the screens that belong to no module — the shell.
 *
 * Every other screen's baseline lives with the module that owns it, at
 * `src/modules/<name>/tests/e2e/__snapshots__/`, so deleting a domain deletes its photographs.
 * What stays here is what has no owner: the landing page, the shop's own prose pages, and the
 * error page a bad URL lands on.
 *
 * Deliberately outside `npm run complete` — see `tests/support/e2e/visual-sweep.ts` for why a
 * pixel diff is a report rather than a gate, and `docs/tools/visual-regression.md` for the five
 * things that have to be frozen for it to mean anything.
 */
import { sweepVisual } from '../../support/e2e/visual-sweep';

sweepVisual('the shell', [
    ['home', '/en', '#home-page'],
    ['about', '/en/about', '#static-page-about'],
    ['faq', '/en/faq', '#static-page-faq'],
    ['not-found', '/en/this-route-does-not-exist', '#error-page']
]);

// The signed-in header: the cart pinned beside the account menu, count and total on it.
sweepVisual('the shell, signed in', [['home-signed-in', '/en', '#home-page']], 'user');
