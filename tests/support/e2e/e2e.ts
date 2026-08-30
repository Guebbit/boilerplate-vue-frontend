// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:

import 'cypress-axe';
/*
 * `cy.realPress()` and friends: keystrokes through the Chrome DevTools Protocol, so a Tab moves
 * focus the way the visitor's Tab does. Cypress' own `.type('{tab}')` is simulated and does not
 * — which is why `keyboard.cy.ts` could not be written without this.
 */
import 'cypress-real-events';
import './commands';
import './fixtures';

beforeEach(() => {
    cy.clearCookies();
    cy.clearAllSessionStorage();

    /*
     * The missing-image placeholder is a RANDOM dog from placedog.net (see
     * `src/infrastructure/utils/images.ts`), which is two problems for a test run and one fixture
     * solves both: the suite otherwise reaches the public internet on every page that shows a
     * record without a picture, and the visual baselines would compare a different animal each
     * time. Answering with the sample image makes the placeholder deterministic without the app
     * knowing it is under test.
     *
     * `middleware: true` so a spec that wants to assert something of its own about placeholder
     * requests can still register its own intercept and have it win.
     */
    cy.intercept({ hostname: 'placedog.net', middleware: true }, (request) => {
        request.reply({ fixture: 'sample-image.png' });
    });
});

// Alternatively you can use CommonJS syntax:
// require('./commands')
