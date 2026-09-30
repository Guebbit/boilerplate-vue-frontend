#!/usr/bin/env tsx
/**
 * Prints one nightly live slice as a comma-separated `--spec` value: `tsx … print-live-shard.ts 2 4`
 * is the second of four. `e2e-live.yml`'s matrix feeds it to `npm run test:e2e:live:spec`.
 */
import { globSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FUNCTIONAL_SPEC_GLOBS } from './cypress-spec-globs';
import { liveShardFiles } from './live-shard';
import { SECONDS } from './shard-balancer';
import { readSpecDurations } from './spec-durations';

// Two levels up from this file is the repo root, where the globs are relative to.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const [index, total] = process.argv.slice(2).map(Number);

const files = globSync(FUNCTIONAL_SPEC_GLOBS, { cwd: REPO_ROOT }).map((entry) =>
    entry.split(path.sep).join('/')
);

// A measured duration if this checkout has one (CI has none), else the table's guess by basename;
// a spec in neither is weighed at the mean.
const recorded = readSpecDurations();
const durations = Object.fromEntries(
    files.flatMap((file): [string, number][] => {
        const basename = path.basename(file, '.cy.ts');
        if (Object.hasOwn(recorded, file)) return [[file, recorded[file]]];
        return Object.hasOwn(SECONDS, basename) ? [[file, SECONDS[basename]]] : [];
    })
);

// An empty slice would make `cypress run --spec ""` run the WHOLE suite, in every job.
const slice = liveShardFiles(files, durations, index, total);
if (slice.length === 0) {
    console.error(`live shard ${String(index)}/${String(total)} has no specs`);
    process.exit(2);
}

console.log(slice.join(','));
