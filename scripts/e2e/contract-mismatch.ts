/**
 * Decides whether one console call is the app's contract diagnostic, the line the global
 * Cypress hook (`tests/support/e2e/commands.ts`) turns into a failed test.
 *
 * Pure on purpose: no Cypress, no window, so a unit test can pin the four cases that matter.
 */

/** The console methods a page call can arrive through. */
export type ConsoleLevel = 'error' | 'warn';

/**
 * Whether a console call is a contract mismatch.
 *
 * Three conditions, all required:
 * - level is `error`: `[contract] no response schema mapped` is a benign `warn`;
 * - text carries `[contract]`: any other error is not this hook's business;
 * - text carries `does not match the`: other `[contract]` notes must never fail a test.
 *
 * @param level - The console method that was called.
 * @param parameters - The arguments that call carried; only the first is read.
 */
export const isContractMismatch = (level: ConsoleLevel, parameters: unknown[]): boolean => {
    const [message] = parameters;
    return (
        level === 'error' &&
        typeof message === 'string' &&
        message.includes('[contract]') &&
        message.includes('does not match the')
    );
};
