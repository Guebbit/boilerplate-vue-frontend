/**
 * Decides whether one console call is the app's contract diagnostic, the line the global
 * Cypress hook (`tests/support/e2e/commands.ts`) turns into a failed test.
 *
 * Pure on purpose: no Cypress, no window, so a unit test can pin the cases that matter.
 */

import { CONTRACT_MISMATCH_TEXT } from '../../src/infrastructure/http/contract-mismatch-text';

/**
 * Whether a `console.error` call is a contract mismatch.
 *
 * Two conditions, both required:
 * - text carries `[contract]`: any other error is not this hook's business;
 * - text carries {@link CONTRACT_MISMATCH_TEXT}: other `[contract]` notes must never fail a test.
 *
 * @param parameters - The arguments that call carried; only the first is read.
 */
export const isContractMismatch = (parameters: unknown[]): boolean => {
    const [message] = parameters;
    return (
        typeof message === 'string' &&
        message.includes('[contract]') &&
        message.includes(CONTRACT_MISMATCH_TEXT)
    );
};
