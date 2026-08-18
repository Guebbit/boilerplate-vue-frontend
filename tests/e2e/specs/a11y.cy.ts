/**
 * Accessibility for the routes that belong to no module — the shell.
 *
 * Every other route's sweep lives with the module that owns it, at
 * `src/modules/<name>/tests/e2e/a11y.cy.ts`, so that deleting a domain deletes its accessibility
 * coverage rather than leaving a central list naming routes the app no longer serves. What stays
 * here is what has no owner to move to: the landing page, and the error page a bad URL lands on.
 *
 * The guarantee the central list used to give — that the coverage is a list you can read — is now
 * `tests/cross-cutting/a11yCoverage.spec.ts`, which fails when a routed module has no sweep. A
 * checked list beats a readable one.
 *
 * WHAT FAILS A RUN: `serious` and `critical` only. Everything lighter is run and logged — see
 * `cy.checkPageA11y()` for why a gate that fires on advisory contrast findings is a gate somebody
 * disables.
 *
 * Vuetify does most of the heavy lifting (its inputs carry labels and ARIA state), so these sweeps
 * mostly guard OUR markup: a heading level skipped, an icon-only button with no accessible name,
 * an image added without alt text, a colour pair chosen in a hurry.
 *
 * Runs under the mock profile like every other spec in `ci.yml`, so it needs no backend.
 */
import { sweepA11y } from '../../support/e2e/a11ySweep';

sweepA11y('the shell', [
    ['home', '/en'],
    ['404', '/en/this-route-does-not-exist']
]);
