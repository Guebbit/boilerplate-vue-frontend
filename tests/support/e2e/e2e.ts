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

beforeEach(() => {
    cy.clearCookies();
    cy.clearAllSessionStorage();
});

// Alternatively you can use CommonJS syntax:
// require('./commands')
