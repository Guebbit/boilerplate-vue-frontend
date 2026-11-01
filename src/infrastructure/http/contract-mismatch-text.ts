/**
 * @module
 * The words every `[contract] … does not match the …` diagnostic shares. Three producers write
 * it (the response and request validators, the SSE client) and the Cypress hook matches it, so
 * a rewording lives here once instead of silencing the hook.
 *
 * Kept free of imports: the Cypress hook pulls this file in, and nothing else of the app.
 */

/** What a contract diagnostic says between the subject and the schema it was checked against. */
export const CONTRACT_MISMATCH_TEXT = 'does not match the';
