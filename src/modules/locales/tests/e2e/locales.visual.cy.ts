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
        ['locale-entries', '/en/locales/it', '[data-test=list-row]'],
        {
            // The generic translation door has no static path — it needs a real product's id —
            // so `route`/`readySelector` only get the sweep past its own list-row wait; `prepare`
            // re-navigates to the real target and repeats the ready/settle wait against IT,
            // before the freeze and the snapshot below run.
            name: 'entity-translations',
            route: '/en/locales',
            readySelector: '[data-test=list-row]',
            prepare: () => {
                cy.productInRole('inStock').then((product) => {
                    cy.visit(`/en/locales/translations/product/${product.id}`);
                });
                cy.get('[data-test=translation-tabs]').should('exist');
                cy.get('h1').should('be.visible');
                cy.settleNetwork();
            }
        }
    ],
    'owner'
);
