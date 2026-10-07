#!/usr/bin/env tsx
/**
 * Prints one nightly live slice as a comma-separated `--spec` value: `tsx … print-live-shard.ts 2 4`
 * is the second of four. `tsx … print-live-shard.ts antibot` prints the antibot run's specs
 * instead — the matrix entry whose backend boots with the human-challenge provider on.
 * `tsx … print-live-shard.ts all 4` prints every slice of four, one per line, from ONE read of the
 * durations file — what a caller that wants several slices uses, so a file another run appends to
 * in between cannot make two slices disagree.
 * `e2e-live.yml`'s matrix feeds either to `npm run test:e2e:live:spec`.
 */
import { globSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANTIBOT_SPEC_GLOBS, FUNCTIONAL_SPEC_GLOBS } from './cypress-spec-globs';
import { liveShardFiles, liveShardSlices } from './live-shard';
import { SECONDS } from './shard-balancer';
import { readSpecDurations } from './spec-durations';

// Two levels up from this file is the repo root, where the globs are relative to.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** The two CLI arguments: a shard index and a shard count, or the word `antibot`. */
const [first, second] = process.argv.slice(2);

// The antibot entry runs every antibot spec in one job: there is no slicing to do.
if (first === 'antibot') {
    const antibotFiles = globSync(ANTIBOT_SPEC_GLOBS, { cwd: REPO_ROOT })
        .map((entry) => entry.split(path.sep).join('/'))
        .toSorted();
    // An empty value would make `cypress run --spec ""` run the WHOLE suite against the wrong backend.
    if (antibotFiles.length === 0) {
        console.error('the antibot run has no specs');
        process.exit(2);
    }
    console.log(antibotFiles.join(','));
    process.exit(0);
}

/** `all` prints every slice; otherwise this slice's index and the slice count, as numbers. */
const printAll = first === 'all';

/** This slice's index and the slice count, as numbers. */
const [index, total] = printAll ? [1, Number(second)] : [Number(first), Number(second)];

/** Every functional spec file, as posix paths. */
const files = globSync(FUNCTIONAL_SPEC_GLOBS, { cwd: REPO_ROOT }).map((entry) =>
    entry.split(path.sep).join('/')
);

// A measured duration if this checkout has one (CI has none), else the table's guess by basename;
// a spec in neither is weighed at the mean.
const recorded = readSpecDurations();

/** Seconds per spec: recorded where known, the table's guess otherwise, absent for neither. */
const durations = Object.fromEntries(
    files.flatMap((file): [string, number][] => {
        const basename = path.basename(file, '.cy.ts');
        if (Object.hasOwn(recorded, file)) return [[file, recorded[file]]];
        return Object.hasOwn(SECONDS, basename) ? [[file, SECONDS[basename]]] : [];
    })
);

// Either every slice, from the one `durations` snapshot above, or just this one (which also
// refuses an out-of-range index).
const wanted = printAll
    ? liveShardSlices(files, durations, total)
    : [liveShardFiles(files, durations, index, total)];

// An empty slice would make `cypress run --spec ""` run the WHOLE suite, in every job.
if (wanted.some((slice) => slice.length === 0)) {
    console.error(`live shard ${String(printAll ? 'all' : index)}/${String(total)} has no specs`);
    process.exit(2);
}

for (const slice of wanted) console.log(slice.join(','));
