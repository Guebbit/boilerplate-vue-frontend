/**
 * Per-file measured durations for the e2e shard balancer, so a spec is weighed by what
 * it actually costs.
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
import { SECONDS } from './shard-balancer';

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

/** Where the committed median seconds per spec path live, so a CI runner with no history still balances. */
export const SPEC_SECONDS_FILE = `${import.meta.dirname}/spec-seconds.json`;

/**
 * The median recorded seconds per spec path, over every run in the report.
 *
 * A median, not the latest: one slow run (a cold runner, a retry) must not move a spec's weight.
 *
 * @param file - a durations report, one JSON entry per line
 * @param only - when given, specs outside it are left out
 * @returns spec path to median seconds, rounded to whole seconds, keys sorted for a stable diff
 */
export const medianSpecSeconds = (
    file = SPEC_DURATIONS_FILE,
    only?: ReadonlySet<string>
): Record<string, number> => {
    const runs: Record<string, number[]> = {};
    for (const line of existsSync(file) ? readFileSync(file, 'utf8').split('\n') : []) {
        if (line.trim() === '') continue;
        try {
            // Same single writer as `readSpecDurations`: a line that parses is a SpecDuration.
            const entry = JSON.parse(line) as SpecDuration;
            if (only === undefined || only.has(entry.spec))
                (runs[entry.spec] ??= []).push(entry.seconds);
        } catch {
            /* skipped, see readSpecDurations */
        }
    }
    return Object.fromEntries(
        Object.entries(runs)
            .toSorted(([a], [b]) => a.localeCompare(b))
            .map(([spec, values]) => {
                const sorted = values.toSorted((a, b) => a - b);
                const middle = Math.floor(sorted.length / 2);
                const median =
                    sorted.length % 2 === 1
                        ? sorted[middle]
                        : (sorted[middle - 1] + sorted[middle]) / 2;
                return [spec, Math.round(median)];
            })
    );
};

/**
 * Seconds per spec for the balancer: this checkout's own recordings first, then the committed
 * medians, then the hand-written table by basename.
 *
 * A recorded 0 s is no measurement (a spec that skipped itself), so it counts as none.
 * A spec in none of them is absent from `seconds` (the balancer weighs it at the mean) and named
 * in `unmeasured`, so a caller can warn instead of letting a new spec be weighed silently.
 *
 * @param files - every spec to weigh, as repo-relative posix paths
 * @param recorded - this checkout's recordings, {@link readSpecDurations} by default
 * @param committed - the committed medians, read from {@link SPEC_SECONDS_FILE} by default
 * @returns the known seconds per spec path, and the specs with none
 */
export const resolveSpecSeconds = (
    files: string[],
    recorded: Partial<Record<string, number>> = readSpecDurations(),
    committed: Partial<Record<string, number>> = existsSync(SPEC_SECONDS_FILE)
        ? (JSON.parse(readFileSync(SPEC_SECONDS_FILE, 'utf8')) as Record<string, number>) // our own writer's output
        : {}
): { seconds: Record<string, number>; unmeasured: string[] } => {
    const seconds: Record<string, number> = {};
    const unmeasured: string[] = [];
    for (const file of files) {
        const basename = path.basename(file, '.cy.ts');
        const known =
            recorded[file] ??
            committed[file] ??
            (Object.hasOwn(SECONDS, basename) ? SECONDS[basename] : undefined);
        if (known === undefined || known <= 0) unmeasured.push(file);
        else seconds[file] = known;
    }
    return { seconds, unmeasured };
};
