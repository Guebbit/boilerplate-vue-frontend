#!/usr/bin/env tsx
/**
 * Prints every invasive-CSS hit — `npm run audit:css`.
 *
 * - no flag: a human report, one block per hit (`file:line`, check, snippet, fix), then the count
 *   per check and the ratchet's state against the baseline;
 * - `--json`: the same as one JSON document on stdout, for an agent to plan fixes from;
 * - `--shrink-baseline`: strikes fixed hits off the baseline. It never adds one.
 *
 * Always exits 0 on a completed scan: the gate is `tests/cross-cutting/css-invasiveness.spec.ts`.
 */
import { CHECKS, scanApp, type CheckId, type CssFinding } from './scan';
import {
    BASELINE_FILE,
    compareToBaseline,
    keyOf,
    readBaseline,
    shrinkBaseline,
    writeBaseline,
    type BaselineEntry
} from './ratchet';

/** The command-line flags. */
const flags = new Set(process.argv.slice(2));

/** Hits per check, every check listed, zero included. */
const countsByCheck = (findings: CssFinding[]): Record<CheckId, number> => {
    const counts = Object.fromEntries(Object.keys(CHECKS).map((id) => [id, 0])) as Record<
        CheckId,
        number
    >;
    for (const { check } of findings) counts[check] += 1;
    return counts;
};

/** One hit as a human-readable block. */
const humanHit = (finding: CssFinding): string =>
    [
        `${finding.file}:${String(finding.line)}  [${finding.check}]  ${finding.anchor}`,
        `    ${finding.snippet}`,
        `    fix: ${finding.fix}`
    ].join('\n');

/** A ratchet list, one key per line. */
const humanEntries = (title: string, entries: BaselineEntry[]): string =>
    entries.length === 0
        ? ''
        : `\n${title}\n${entries.map((entry) => `  ×${String(entry.count)}  ${keyOf(entry)}`).join('\n')}\n`;

/**
 * Prints the report in the requested shape.
 *
 * @param findings - The scan.
 */
const print = (findings: CssFinding[]): void => {
    const baseline = readBaseline();
    const diff = compareToBaseline(findings, baseline);
    const known = new Set(baseline.map((entry) => keyOf(entry)));
    const counts = countsByCheck(findings);
    if (flags.has('--json')) {
        const hits = findings.map((finding) => ({
            ...finding,
            baselined: known.has(keyOf(finding))
        }));
        process.stdout.write(
            `${JSON.stringify({ total: findings.length, counts, hits, ratchet: diff }, undefined, 2)}\n`
        );
        return;
    }
    process.stdout.write(`${findings.map((finding) => humanHit(finding)).join('\n\n')}\n\n`);
    process.stdout.write('Hits per check:\n');
    for (const [check, count] of Object.entries(counts))
        if (count > 0) process.stdout.write(`  ${String(count).padStart(3)}  ${check}\n`);
    process.stdout.write(`  ${String(findings.length).padStart(3)}  total\n`);
    process.stdout.write(humanEntries('NEW — not in the baseline (the spec fails):', diff.added));
    process.stdout.write(
        humanEntries('FIXED — still in the baseline (run with --shrink-baseline):', diff.gone)
    );
};

scanApp()
    .then((findings) => {
        if (!flags.has('--shrink-baseline')) {
            print(findings);
            return;
        }
        const before = readBaseline();
        const after = shrinkBaseline(findings, before);
        writeBaseline(after);
        const removed =
            before.reduce((sum, entry) => sum + entry.count, 0) -
            after.reduce((sum, entry) => sum + entry.count, 0);
        process.stdout.write(`${BASELINE_FILE}: ${String(removed)} fixed hits struck off\n`);
    })
    .catch((error: unknown) => {
        process.stderr.write(
            `audit:css: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`
        );
        process.exit(2);
    });
