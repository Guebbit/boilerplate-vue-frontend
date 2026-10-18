/**
 * @module
 * Read-merge-write of a per-spec JSON report: one file per spec, one entry per audited state.
 *
 * Shared by the a11y task (`a11y-task.ts`) and the touch task (`touch-task.ts`). One file per
 * spec, entries keyed by the state's label: a retried test overwrites its own entry rather than
 * appending a duplicate, and the CI shards each run their own specs, so no two processes write
 * the same file.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/** One spec's report file: its entries keyed by the audited state's label. */
interface SpecReport {
    spec: string;
    entries: Record<string, unknown>;
}

/** `src/modules/users/tests/e2e/a11y.cy.ts` → `src-modules-users-tests-e2e-a11y-cy`. */
export const specSafeName = (spec: string): string =>
    spec.replace(/\.ts$/, '').replaceAll(/[^\dA-Za-z]+/g, '-');

/** Reads a spec's report, or a fresh empty one when there is none or it is unreadable. */
const readReport = (file: string, spec: string): SpecReport => {
    try {
        return JSON.parse(readFileSync(file, 'utf8')) as SpecReport;
    } catch {
        // First write for this spec, or a file a crashed run left half-written: either way the
        // entries being recorded now are the ones that count.
        return { spec, entries: {} };
    }
};

/**
 * Records one audited state in its spec's report file.
 *
 * Returns the file written, because a Cypress task must return something serialisable —
 * `undefined` makes Cypress fail the command.
 *
 * @param directory - where the reports go, such as `reports/a11y`
 * @param spec - `Cypress.spec.relative`: what the file is named after
 * @param context - the label of the audited state; a second write with the same label replaces it
 * @param entry - what to store under that label
 * @param suffix - added to the file name before `.json`, such as `.layout`, to keep a second report
 *  of one spec beside the first
 * @returns The absolute path of the report file
 */
export const recordSpecEntry = (
    directory: string,
    spec: string,
    context: string,
    entry: unknown,
    suffix = ''
): string => {
    mkdirSync(directory, { recursive: true });
    const file = path.join(directory, `${specSafeName(spec)}${suffix}.json`);
    const report = readReport(file, spec);
    report.entries[context] = entry;
    writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
    return file;
};
