/// <reference types="cypress" />

import { asStub } from '../stub';
import { prefixWithStep } from '../../../scripts/e2e/step-prefix';

/**
 * Commands a journey spec is built from: naming its steps, and moving the demo backend's clock.
 *
 * Journeys are long — one `it` walks a whole story — so a bare "expected X to exist" tells nobody
 * WHERE in the story it broke. `cy.step()` names each phase, and the name is stamped onto a
 * failure's message, which is the only place CI output reliably carries it (`cy.log` never reaches
 * the terminal).
 */

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace -- Cypress's own typing contract: custom commands merge into its global namespace
    namespace Cypress {
        // The name belongs to the library being augmented, not to this codebase.
        interface Chainable {
            /**
             * Starts a named phase of a journey: a bold line in the command log, and the prefix
             * `[step: <name>]` on any failure until the next step or the end of the test.
             *
             * @param name - short phase name, e.g. `pays with the declined card`
             */
            step(name: string): Chainable<void>;

            /**
             * Moves the demo backend's clock forward — the backend's `POST /__test/clock`. Then
             * trigger whatever should react through its own door (e.g. the reservation sweep);
             * the clock alone runs no job.
             *
             * Demo only: open the test with `cy.skipUnlessDemo()`. The browser's own clock is
             * NOT moved — use `cy.clock` for a screen that compares against it. A jump past the
             * refresh-token lifetime (7 days) ends the session, so log in again.
             *
             * @param ms - how far forward, in milliseconds; never negative
             */
            travel(ms: number): Chainable<void>;
        }
    }
}

/** The step the running test is in, or `undefined` before its first `cy.step()`. */
let currentStep: string | undefined;

/**
 * Sets {@link currentStep} when the command RUNS. Queued through `cy.then` rather than assigned at
 * call time: Cypress builds the whole command queue first, so a plain assignment would leave every
 * step named after the last one.
 *
 * @param name - the phase name
 */
const enterStep = (name: string): Cypress.Chainable<undefined> =>
    cy.then(() => {
        currentStep = name;
    });

// `asStub`: a `.then()` whose callback returns nothing types as "subject unchanged", not
// `Chainable<void>` — the seam `commands.ts` uses for the same reason.
Cypress.Commands.add(
    'step',
    asStub<Cypress.CommandFn<'step'>>((name: string) => {
        Cypress.log({ name: 'step', displayName: 'STEP', message: `**${name}**` });
        return enterStep(name);
    })
);

// A step never leaks into the next test.
beforeEach(() => {
    currentStep = undefined;
});

/*
 * Cypress `fail` event: the last chance to change an error before it is reported. It must rethrow
 * or the failure is swallowed. The message is prefixed once; the stack keeps the original.
 * https://docs.cypress.io/api/cypress-api/catalog-of-events#Cypress-Events
 */
Cypress.on('fail', (error: Error) => {
    error.message = prefixWithStep(error.message, currentStep);
    throw error;
});

Cypress.Commands.add(
    'travel',
    asStub<Cypress.CommandFn<'travel'>>((ms: number) => {
        Cypress.log({ name: 'travel', displayName: 'TRAVEL', message: `+${String(ms)} ms` });
        return cy.env(['liveProfile', 'apiUrl']).then(({ liveProfile, apiUrl }) => {
            if (liveProfile === true)
                throw new Error(
                    'cy.travel(): only the demo backend has a movable clock. Open this test with cy.skipUnlessDemo().'
                );
            // A non-2xx already fails the test. Body: the backend's `advanceMs`, forward only.
            cy.request('POST', `${String(apiUrl)}/__test/clock`, { advanceMs: ms });
        });
    })
);
