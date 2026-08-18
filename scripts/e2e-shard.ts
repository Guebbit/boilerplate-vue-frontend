#!/usr/bin/env tsx
/**
 * Runs the Cypress e2e specs in parallel shards against ONE dev server — the worker behind
 * `npm run test:e2e`.
 *
 * ── WHY ──────────────────────────────────────────────────────────────────────────────────────────
 * Cypress runs specs one after another, on one core. Measured 2026-08-14 that is 12m54s of a ~10
 * minute gate, on a machine with sixteen. Cypress's own parallelisation is a Cloud feature, but
 * nothing stops several `cypress run` processes sharing a dev server — the balancing is the only
 * part Cloud actually adds, and seventeen specs with known durations do not need a service to
 * balance them.
 *
 * ── WHY THIS IS SAFE HERE, AND NOT SAFE FOR THE LIVE PROFILE ─────────────────────────────────────
 * `cy.resetState()` branches on the profile (`tests/support/e2e/commands.ts`):
 *
 *     apiMockEnabled === false ? resetLiveDatabase(backendPath) : resetMswDatabase()
 *
 * Under the mock profile the "database" is MSW state inside the browser, so every Cypress instance
 * owns its own and shards cannot see each other. Under the LIVE profile the same call re-seeds the
 * paired backend's real Mongo — one shared database that every shard would reset out from under the
 * others, mid-test. So this refuses to run when the live profile is active rather than trusting the
 * caller to remember; `test:e2e:live` stays sequential on purpose.
 *
 * ── BALANCING ────────────────────────────────────────────────────────────────────────────────────
 * Longest-first onto the least-loaded shard (LPT), weighted by MEASURED durations rather than by
 * file size. Size is actively misleading here: `parity.cy.ts` is the third-largest file and the
 * fastest spec (0.15s), because every case in it is skipped outside the live profile.
 *
 * Wall-clock cannot go below the longest single spec, so the floor is `uploads.cy.ts` at ~86s no
 * matter how many shards are used.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');

/**
 * Where the e2e specs live — the two homes `cypress.config.ts`'s `specPattern` describes: the
 * cross-cutting suite centrally, and each domain's own specs inside the domain so that deleting
 * the folder takes them with it.
 *
 * Globbed rather than listed. A new module's suite is sharded the day it appears, and a deleted
 * one stops being scheduled without anyone remembering this file — which is the whole reason the
 * specs moved.
 */
const SPEC_GLOBS = ['tests/e2e/specs/*.cy.ts', 'src/modules/*/tests/e2e/*.cy.ts'];

/*
 * Visual specs live beside the functional ones — `src/modules/<name>/tests/e2e/<name>.visual.cy.ts`
 * — so that a module owns its own baselines. They are NOT part of this gate: a pixel diff answers
 * to the machine that recorded it, and `npm run test:e2e:visual` is where it belongs.
 *
 * Excluded by suffix rather than by directory precisely BECAUSE they are co-located. Without this
 * the gate would silently acquire twelve screenshot comparisons the first time someone ran it,
 * and the first font update would look like an application regression.
 */
const EXCLUDED_SUFFIX = '.visual.cy.ts';

/**
 * Seconds per spec, from the run of 2026-08-14 (`npm run test:e2e`, total 12m54s).
 *
 * Refresh them from a run's summary table when the balance drifts — they only need to be roughly
 * right, since LPT is tolerant of error. A spec missing from this map is scheduled at the mean,
 * which keeps a newly added file from either hogging a shard or being treated as free.
 */
const SECONDS: Record<string, number> = {
    uploads: 86,
    profile: 83,
    auth: 73,
    cart: 73,
    a11y: 69,
    products: 62,
    resilience: 57,
    locale: 52,
    storefront: 44,
    orders: 33,
    registration: 30,
    feedback: 26,
    commerce: 25,
    home: 20,
    'password-reset': 19,
    journey: 15,
    parity: 1
};

try {
    process.loadEnvFile();
} catch {
    /* no .env in this checkout — CI is the normal case */
}

if (process.env.CYPRESS_apiMockEnabled === 'false') {
    console.error(
        '\n[e2e-shard] Refusing to shard the LIVE profile.\n\n' +
            '  cy.resetState() re-seeds the paired backend’s real database, which every shard\n' +
            '  would reset out from under the others. Run `npm run test:e2e:live`, which is\n' +
            '  sequential for exactly this reason.\n'
    );
    process.exit(2);
}

const shardCount = Math.max(1, Number(process.env.E2E_SHARDS?.trim() || 4));

const specs = globSync(SPEC_GLOBS, { cwd: REPO_ROOT })
    .filter((file) => !file.endsWith(EXCLUDED_SUFFIX))
    // Cypress' `--spec` wants posix separators whatever the platform globbed with, and the sort
    // keeps a run's shard assignment stable rather than at the mercy of directory order.
    .map((entry) => entry.split(path.sep).join('/'))
    .toSorted()
    .map((file) => ({ file, key: path.basename(file, '.cy.ts') }));

const total = (values: number[]): number => {
    let sum = 0;
    for (const value of values) sum += value;
    return sum;
};

const known = Object.values(SECONDS);
const mean = total(known) / known.length;
const weighted = specs
    .map(({ file, key }) => ({ file, weight: SECONDS[key] ?? mean }))
    .toSorted((a, b) => b.weight - a.weight);

/** Longest-processing-time first: each spec joins whichever shard is currently lightest. */
const shards = Array.from({ length: shardCount }, () => ({ files: [] as string[], load: 0 }));
for (const { file, weight } of weighted) {
    let lightest = shards[0]!;
    for (const shard of shards) if (shard.load < lightest.load) lightest = shard;
    lightest.files.push(file);
    lightest.load += weight;
}

const active = shards.filter((shard) => shard.files.length > 0);

console.log(
    `[e2e-shard] ${specs.length} specs across ${active.length} shard(s); ` +
        `predicted wall-clock ~${Math.round(Math.max(...active.map((shard) => shard.load)))}s ` +
        `(sequential is ~${Math.round(total(weighted.map((spec) => spec.weight)))}s)`
);

/**
 * How long each shard waits behind the one before it, before spawning Cypress.
 *
 * Cypress bundles the support file and each spec on first use, and concurrent processes with a
 * COLD cache race that work. Observed three times, always on the first sharded run after a support
 * file was edited, never on a warm run and never on a solo one: one shard gets a truncated bundle
 * and fails with `Unexpected end of input`, or loads a support file that never registered its
 * commands and fails with `cy.resetState is not a function`. Both are load-time failures — no test
 * had run — which is how they are distinguishable from an ordinary flaky assertion.
 *
 * A stagger is the cheapest fix that addresses the cause: the first process populates the cache
 * while the others are still waiting, so the rest read a finished artefact instead of a partial
 * one. It costs the LAST shard `(n-1) × this`, and nothing at all on a warm cache — about 5% of a
 * run against a failure mode that costs a full re-run and looks like a real bug while you chase it.
 */
const SHARD_STAGGER_MS = 4000;

/** Where a failing shard's full output is kept, for CI to upload and a human to read later. */
const LOG_DIR = path.join(REPO_ROOT, 'reports', 'e2e');

/**
 * One Cypress process for one shard.
 *
 * Output is buffered rather than inherited: four interleaved Cypress reporters are unreadable, and
 * the only output anyone needs is that of a shard that failed. Successes collapse to one line.
 */
const runShard = (files: string[], index: number) =>
    new Promise<{ index: number; code: number; output: string; seconds: number }>((resolve) => {
        const startedAt = Date.now();
        let output = '';

        // Staggered, not concurrent-from-zero — see SHARD_STAGGER_MS. The clock starts before the
        // wait so a shard's reported seconds stay comparable with the weights in SECONDS.
        setTimeout(() => {
            const cypress = spawn('npx', ['cypress', 'run', '--e2e', '--spec', files.join(',')], {
                cwd: REPO_ROOT,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            cypress.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
            cypress.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));
            cypress.on('close', (code) =>
                resolve({
                    index,
                    code: code ?? 1,
                    output,
                    seconds: Math.round((Date.now() - startedAt) / 1000)
                })
            );
        }, index * SHARD_STAGGER_MS);
    });

const main = async () => {
    const startedAt = Date.now();
    const results = await Promise.all(active.map((shard, index) => runShard(shard.files, index)));

    for (const { index, code, output, seconds } of results) {
        const specCount = active[index]!.files.length;
        if (code === 0) {
            console.log(`[e2e-shard] shard ${index + 1}: ${specCount} specs OK in ${seconds}s`);
            continue;
        }
        /*
         * To a FILE as well as to stderr. A failing shard's output is the only record of why a
         * run went red, and stderr is the one place it can be lost — piped through `tail`,
         * truncated by a CI log limit, scrolled past. That has happened, and the failure it hid
         * was never diagnosed. The file is what CI uploads.
         */
        const logFile = path.join(LOG_DIR, `shard-${index + 1}.log`);
        mkdirSync(LOG_DIR, { recursive: true });
        writeFileSync(logFile, output);

        console.error(`\n[e2e-shard] shard ${index + 1} FAILED (${seconds}s) —\n`);
        console.error(output);
        console.error(`[e2e-shard] the above is also at ${path.relative(REPO_ROOT, logFile)}\n`);
    }

    const failed = results.filter(({ code }) => code !== 0).length;
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    console.log(
        `\n[e2e-shard] ${results.length - failed}/${results.length} shards passed in ${elapsed}s`
    );
    process.exit(failed > 0 ? 1 : 0);
};

void main();
