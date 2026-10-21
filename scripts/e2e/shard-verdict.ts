/**
 * The pure half of "did this shard really pass": exit code, signal, silence and the number of
 * specs Cypress reported finishing, folded into one verdict.
 *
 * Why: a shard killed from outside, or hung until a wrapper gave up, can exit 0 with most of its
 * specs never run. Trusting the exit code alone turned that into a green gate.
 */

/** What the runner knows about a finished shard process. */
export interface ShardOutcome {
    /** Exit code; `null` when a signal ended the process. */
    code: number | null;
    /** The signal that ended the process, if any. */
    signal: NodeJS.Signals | null;
    /** Whether the watchdog killed it for printing nothing. */
    hung: boolean;
    /** The longest allowed silence, in minutes (for the message). */
    quietMinutes: number;
    /** Specs the shard was given. */
    assigned: number;
    /** Specs Cypress reported finishing. */
    ran: number;
}

/** A shard's verdict; `reason` says why it failed. */
export type ShardVerdict = { ok: true } | { ok: false; reason: string };

/** A row of Cypress' final summary table: `✔  login.cy.ts   00:05   3   3   -   -   -`. */
const SUMMARY_ROW = /^\s*[│|]?\s*[✔✖−-]\s+(\S+\.cy\.[cm]?[jt]sx?)\s+\d{2}:\d{2}/gmu;

/**
 * Counts the distinct specs in a Cypress run's final summary table.
 *
 * @param output - the shard's whole captured output
 * @returns how many specs Cypress reported as finished
 */
export const countFinishedSpecs = (output: string): number =>
    new Set([...output.matchAll(SUMMARY_ROW)].map((match) => match[1])).size;

/**
 * Judges a finished shard. Order matters: the most specific cause is named first.
 *
 * @param outcome - what the runner observed
 * @returns ok, or the reason the shard cannot count as passed
 */
export const judgeShard = (outcome: ShardOutcome): ShardVerdict => {
    if (outcome.hung)
        return {
            ok: false,
            reason: `HUNG: no output for ${outcome.quietMinutes} min, process group killed`
        };
    if (outcome.signal !== null) return { ok: false, reason: `ended by signal ${outcome.signal}` };
    if (outcome.code !== 0) return { ok: false, reason: `exit code ${outcome.code}` };
    if (outcome.ran < outcome.assigned)
        return {
            ok: false,
            reason: `only ${outcome.ran} of ${outcome.assigned} specs ran (exit code 0 is not enough)`
        };
    return { ok: true };
};
