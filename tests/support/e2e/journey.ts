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

            /**
             * Runs one declared background job now — the backend's `POST /__test/jobs/:name` —
             * and yields `{ job, result }`, where `result` is the job's own count of what it swept.
             * A name the backend does not carry fails the test and lists the ones it does.
             *
             * Demo only: open the test with `cy.skipUnlessDemo()`. Names are the declared job
             * names with `:` spelled `-` (`sweep:reservations` is `sweep-reservations`).
             *
             * @param name - the job, e.g. `reap-orders`
             */
            runJob(name: string): Chainable<{ job: string; result: number }>;

            /**
             * Moves BOTH clocks forward: the backend's ({@link Chainable.travel}) and the
             * browser's, so a countdown or an expiry the page works out itself moves with the
             * server's.
             *
             * The browser clock is Date-only (`cy.clock(now, ['Date'])`), installed on first use;
             * install it BEFORE `cy.visit` for the page to start on it, as `freezeForVisual` does.
             * Limits: the server clock only goes forward, a staff session idles out at 30 minutes,
             * TTL indexes never move, and a jump past 7 days ends the session.
             *
             * Demo only: open the test with `cy.skipUnlessDemo()`.
             *
             * @param ms - how far forward, in milliseconds
             */
            travelEverywhere(ms: number): Chainable<void>;

            /**
             * Lets the page read and write the clipboard, so a copy button can be proved by reading
             * back what it copied (`cy.window().then((w) => w.navigator.clipboard.readText())`).
             * Without the grant the browser refuses the read in an automated run.
             *
             * Granted over the Chrome DevTools Protocol, so it needs a Chromium-family browser
             * (Electron, Chrome, Chromium); call it after `cy.visit()` — the grant is for the
             * app's origin.
             */
            grantClipboard(): Chainable<void>;

            /**
             * Replaces `window.open` with a stub aliased `@windowOpen`, so a "view invoice" button
             * can be proved by what it asked to open (`cy.get('@windowOpen').should('be.calledWith', …)`)
             * instead of spawning a tab Cypress cannot follow.
             *
             * The stub lives on the current `window`: call it after `cy.visit()`, and again after a
             * full page reload.
             */
            stubWindowOpen(): Chainable<void>;
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

Cypress.Commands.add(
    'grantClipboard',
    asStub<Cypress.CommandFn<'grantClipboard'>>(() => {
        Cypress.log({ name: 'grantClipboard', displayName: 'CLIPBOARD', message: 'read + write' });
        // `Browser.grantPermissions`: https://chromedevtools.github.io/devtools-protocol/tot/Browser/#method-grantPermissions
        // Sent through Cypress' own CDP channel: https://docs.cypress.io/api/cypress-api/automation
        return cy.wrap(
            Cypress.automation('remote:debugger:protocol', {
                command: 'Browser.grantPermissions',
                params: {
                    permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
                    // The origin the page runs on, as the browser names it.
                    origin: new URL(String(Cypress.config('baseUrl'))).origin
                }
            }),
            { log: false }
        );
    })
);

Cypress.Commands.add(
    'stubWindowOpen',
    asStub<Cypress.CommandFn<'stubWindowOpen'>>(() =>
        cy.window({ log: false }).then((win) => {
            cy.stub(win, 'open').as('windowOpen');
        })
    )
);

/**
 * The names `GET /__test/jobs` lists, to put in a failure message; empty when the backend lists
 * none (an older one, or the answer has a shape this does not know).
 *
 * @param apiUrl - the backend origin
 */
const listedJobs = (apiUrl: string): Cypress.Chainable<string[]> =>
    cy.request({ url: `${apiUrl}/__test/jobs`, failOnStatusCode: false }).then((response) => {
        const { jobs } = (response.body ?? {}) as { jobs?: unknown };
        return Array.isArray(jobs)
            ? jobs.filter((job): job is string => typeof job === 'string')
            : [];
    });

Cypress.Commands.add(
    'runJob',
    asStub<Cypress.CommandFn<'runJob'>>((name: string) => {
        Cypress.log({ name: 'runJob', displayName: 'JOB', message: name });
        return cy.env(['liveProfile', 'apiUrl']).then(({ liveProfile, apiUrl }) => {
            if (liveProfile === true)
                throw new Error(
                    'cy.runJob(): only the demo backend has job levers. Open this test with cy.skipUnlessDemo().'
                );
            const origin = String(apiUrl);
            return cy
                .request({
                    method: 'POST',
                    url: `${origin}/__test/jobs/${encodeURIComponent(name)}`,
                    failOnStatusCode: false
                })
                .then((response) => {
                    if (response.status === 404)
                        return listedJobs(origin).then((jobs) => {
                            throw new Error(
                                `cy.runJob("${name}"): the backend carries no such job.` +
                                    (jobs.length > 0 ? ` It carries: ${jobs.join(', ')}.` : '')
                            );
                        });
                    expect(response.status, `POST /__test/jobs/${name}`).to.equal(200);
                    return cy.wrap(response.body as { job: string; result: number });
                });
        });
    })
);

/** The Date-only browser clock {@link Cypress.Chainable.travelEverywhere} installed, for this test. */
let browserClock: Cypress.Clock | undefined;

// A clock never leaks into the next test (Cypress restores the real one on its own).
beforeEach(() => {
    browserClock = undefined;
});

Cypress.Commands.add(
    'travelEverywhere',
    asStub<Cypress.CommandFn<'travelEverywhere'>>((ms: number) => {
        Cypress.log({
            name: 'travelEverywhere',
            displayName: 'TRAVEL',
            message: `+${String(ms)} ms (both clocks)`
        });
        // The server first: it is the clock that ends sessions and expires holds.
        cy.travel(ms);
        if (browserClock) return cy.then(() => browserClock?.tick(ms));
        // Date only, like `freezeForVisual`: timers keep running, so the page still renders.
        return cy.clock(Date.now() + ms, ['Date']).then((clock) => {
            browserClock = clock;
        });
    })
);
