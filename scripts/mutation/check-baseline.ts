#!/usr/bin/env tsx
/**
 * CLI for the per-file mutation ratchet.
 *
 *   npm run test:mutation:check      compare the last run against mutation-baseline.json
 *   npm run test:mutation:baseline   record the last run (new and improved files — see the module)
 *
 * Reads `reports/mutation/mutation.json`, written by the `json` reporter in
 * `stryker.config.json`. Run `npm run test:mutation` first; this does not run Stryker itself,
 * deliberately, so the check is cheap enough to run twice and so a CI job can split the run and
 * the gate across steps.
 *
 * Exit codes: 0 fine, 1 a file regressed or (without `--update`) has no baseline entry at all,
 * 2 no report to read.
 */
import {
    compareToBaseline,
    missingFromReport,
    formatRegressions,
    formatUnrecorded,
    nextBaseline,
    readBaseline,
    readReport,
    writeBaseline,
    MUTATION_BASELINE_PATH
} from './baseline';

/** `--update` records improvements and new files instead of only checking. */
const update = process.argv.includes('--update');

/** This run's per-file scores. */
let current: Record<string, number>;
// A missing report is a usage error: say how to produce one and exit 2.
try {
    current = readReport();
} catch (error) {
    console.error(`\n[mutation-baseline] ${(error as Error).message}\n`);
    process.exit(2);
}

/** The committed baseline, if any. */
const baseline = readBaseline();

/** Every file's verdict against the baseline. */
const comparisons = compareToBaseline(current, baseline);

// No baseline yet: the first run records one and succeeds.
if (!baseline) {
    console.log(
        `[mutation-baseline] No ${MUTATION_BASELINE_PATH} yet — recording ${
            Object.keys(current).length
        } files as the first baseline.`
    );
    writeBaseline(nextBaseline(current));
    process.exit(0);
}

/*
 * Guard the baseline against a PARTIAL report before anything is written. See
 * `missingFromReport`: recording one would quietly erase every file the run did not measure.
 */
const missing = missingFromReport(current, baseline);
// Refuse to record a partial run over the baseline.
if (update && missing.length > 0) {
    console.error(
        `\n[mutation-baseline] Refusing to update: this report covers ${
            Object.keys(current).length
        } file(s), but the baseline knows ${Object.keys(baseline.files).length}.\n` +
            `  ${missing.length} file(s) are absent from the report, e.g.:\n` +
            missing
                .slice(0, 5)
                .map((file) => `    ${file}`)
                .join('\n') +
            `\n\n  This looks like a partial run (\`--mutate 'some/file.ts'\`). Recording it would\n` +
            `  drop those files from the baseline and lose the ratchet's memory. Run a full\n` +
            `  \`npm run test:mutation\` before recording, or delete mutation-baseline.json\n` +
            `  deliberately if you really are re-baselining a narrower scope.\n`
    );
    process.exit(1);
}

/** How many files fell into each verdict, for the summary line. */
const counts = {
    held: comparisons.filter(({ verdict }) => verdict === 'held').length,
    improved: comparisons.filter(({ verdict }) => verdict === 'improved').length,
    added: comparisons.filter(({ verdict }) => verdict === 'new').length,
    removed: comparisons.filter(({ verdict }) => verdict === 'removed').length
};

/*
 * Improved and removed files are printed even on a passing run. The ratchet is only trustworthy
 * if people can see it moving: a silent pass looks identical to a check that is not running.
 */
for (const { file, baseline: before, current: after } of comparisons.filter(
    ({ verdict }) => verdict === 'improved'
))
    console.log(
        `[mutation-baseline] improved: ${file} ${before!.toFixed(2)}% -> ${after!.toFixed(2)}%`
    );

// Name every file the run no longer mutates.
for (const { file } of comparisons.filter(({ verdict }) => verdict === 'removed'))
    console.log(`[mutation-baseline] no longer mutated: ${file}`);

// A `new` file is only ever "recorded" by `--update` — see `formatUnrecorded` for why a plain
// check refuses to let one pass silently instead.
if (update)
    for (const { file, current: score } of comparisons.filter(({ verdict }) => verdict === 'new'))
        console.log(`[mutation-baseline] new file recorded: ${file} at ${score!.toFixed(2)}%`);

/** The failure text for files that fell below their baseline, empty when none did. */
const regressions = formatRegressions(comparisons);

/** The failure text for files with no baseline entry, skipped under `--update`. */
const unrecorded = update ? '' : formatUnrecorded(comparisons);

// Either problem fails the run; `--update` still keeps the higher score.
if (regressions || unrecorded) {
    if (regressions) console.error(`\n[mutation-baseline] ${regressions}\n`);
    if (unrecorded) console.error(`\n[mutation-baseline] ${unrecorded}\n`);
    // `--update` still rewrites the file, but `nextBaseline` keeps the higher of the two scores,
    // so a regressed file keeps its old baseline and stays failing until it is fixed.
    if (update) writeBaseline(nextBaseline(current, baseline));
    process.exit(1);
}

// Record improvements and new files.
if (update) {
    writeBaseline(nextBaseline(current, baseline));
    console.log(`[mutation-baseline] ${MUTATION_BASELINE_PATH} updated.`);
}

// Reached only past the exit above, so nothing here is unrecorded or regressed.
console.log(
    `[mutation-baseline] ${counts.held} held, ${counts.improved} improved, ` +
        `${counts.added} new, ${counts.removed} removed, 0 regressed.`
);
