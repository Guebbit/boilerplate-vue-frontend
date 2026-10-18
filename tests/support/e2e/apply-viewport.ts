/// <reference types="cypress" />

import { VIEWPORTS, type ViewportName } from '../../../scripts/e2e/viewports';

/**
 * Lays the app out at a named device size, and as that device's input.
 *
 * The one seam for size: sets the viewport, asserts the page really got it (a clamped window
 * would otherwise fail far from here), and turns touch emulation on or off by the entry's
 * `touch` flag.
 *
 * @param name - an entry of `VIEWPORTS`
 */
export const applyViewport = (name: ViewportName): void => {
    const { width, height, touch } = VIEWPORTS[name];

    cy.viewport(width, height);
    if (touch) cy.enableTouch();
    else cy.resetTouch();

    // Cypress scales the app iframe when the window is smaller than the viewport, but the page
    // still reports the viewport's size; a mismatch here means the viewport did not apply.
    cy.window({ log: false }).then((win) => {
        expect([win.innerWidth, win.innerHeight], `viewport ${name}`).to.deep.equal([
            width,
            height
        ]);
    });
};
