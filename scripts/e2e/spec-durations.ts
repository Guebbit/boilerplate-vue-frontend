/**
 * Per-file measured durations for the e2e shard balancer — the other half of the fix for FA126.
 *
 * `shard-balancer.ts`'s `SECONDS` table is keyed by a spec's basename, so all 15 `a11y.cy.ts`
 * files (one per module) shared a single measured weight even though their real costs differ.
 * `run-shards.ts` now keys weight lookups by the spec's full relative path instead, and this
 * module is where those real per-path numbers come from: `cypress.config.ts`'s `after:spec` hook
 * records `results.stats.duration` here every run, so the balancer's numbers improve on their own
 * as real runs accumulate, instead of staying frozen at whatever was measured once by hand.
 *
 * One JSON object per line, appended — same reason as `flaky-report.ts`: several shards write to
 * the same file at once, and a short `appendFileSync` is the one write that cannot interleave
 * another shard's half-line.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Where every Cypress process appends its measured spec durations. Gitignored under `reports/`. */
export const SPEC_DURATIONS_FILE = path.resolve(
    import.meta.dirname,
    '..',
    '..',
    'reports',
    'e2e',
    'durations.jsonl'
);

/** One spec's measured wall-clock time for a single run. */
export interface SpecDuration {
    /** The spec file, relative to the repo root, as Cypress names it in `after:spec`. */
    spec: string;
    /** How long the whole file took, in seconds. */
    seconds: number;
}

/**
 * Appends one spec's measured duration to the report.
 *
 * @param entry - the spec and how long it took
 * @param file - the report file, {@link SPEC_DURATIONS_FILE} unless a test points elsewhere
 */
export const recordSpecDuration = (entry: SpecDuration, file = SPEC_DURATIONS_FILE): void => {
    mkdirSync(path.dirname(file), { recursive: true });
    appendFileSync(file, `${JSON.stringify(entry)}\n`);
};

/**
 * Reads every recorded duration back into a lookup the balancer can weigh specs with.
 *
 * Later entries win over earlier ones for the same spec — the report accumulates across many
 * runs, and the most recent measurement is the one worth trusting. A line that does not parse is
 * skipped rather than thrown on, the same as `flaky-report.ts`: a stale or truncated line about
 * shard timing is not worth failing a run over.
 *
 * @param file - the report file
 * @returns the most recent measured seconds per spec path
 */
export const readSpecDurations = (file = SPEC_DURATIONS_FILE): Record<string, number> => {
    if (!existsSync(file)) return {};
    const durations: Record<string, number> = {};
    for (const line of readFileSync(file, 'utf8').split('\n')) {
        if (line.trim() === '') continue;
        try {
            // This module is the file's only writer, so a line that parses is a SpecDuration.
            const entry = JSON.parse(line) as SpecDuration;
            durations[entry.spec] = entry.seconds;
        } catch {
            /* skipped, see docstring */
        }
    }
    return durations;
};
