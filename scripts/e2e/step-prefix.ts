/**
 * @module
 * How `cy.step()` names a failure: `[step: <name>]` on the first line of its message.
 *
 * Pure so it can be tested without Cypress — the `fail` event that calls it cannot be asserted on
 * from inside a spec, since a global handler that rethrows also ends the test.
 */

/** The marker every prefixed message starts with — also how a second pass knows to leave it alone. */
const STEP_MARKER = '[step: ';

/**
 * Prefix a failure message with the step it happened in.
 *
 * @param message - the failure's own message
 * @param step - the step the test was in, or `undefined` before its first `cy.step()`
 * @returns the message, prefixed once; unchanged with no step or when already prefixed
 */
export const prefixWithStep = (message: string, step: string | undefined): string =>
    step === undefined || message.startsWith(STEP_MARKER)
        ? message
        : `${STEP_MARKER}${step}]\n${message}`;
