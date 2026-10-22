#!/usr/bin/env tsx
/**
 * Prints every invasive-CSS hit — `npm run audit:css`.
 *
 * - no flag: a human report, one block per hit (`file:line`, check, snippet, fix), then the count
 *   per check;
 * - `--json`: the same as one JSON document on stdout, for an agent to plan fixes from.
 *
 * Always exits 0 on a completed scan: the gate is `tests/cross-cutting/css-invasiveness.spec.ts`.
 */
import { CHECKS, scanApp, type CheckId, type CssFinding } from './scan';
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

/**
 * Prints the report in the requested shape.
 *
 * @param findings - The scan.
 */
const print = (findings: CssFinding[]): void => {
    const counts = countsByCheck(findings);
    if (flags.has('--json')) {
        process.stdout.write(
            `${JSON.stringify({ total: findings.length, counts, hits: findings }, undefined, 2)}\n`
        );
        return;
    }
    process.stdout.write(`${findings.map((finding) => humanHit(finding)).join('\n\n')}\n\n`);
    process.stdout.write('Hits per check:\n');
    for (const [check, count] of Object.entries(counts))
        if (count > 0) process.stdout.write(`  ${String(count).padStart(3)}  ${check}\n`);
    process.stdout.write(`  ${String(findings.length).padStart(3)}  total\n`);
};

scanApp()
    .then((findings) => {
        print(findings);
    })
    .catch((error: unknown) => {
        process.stderr.write(
            `audit:css: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`
        );
        process.exit(2);
    });
