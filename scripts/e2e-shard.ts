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
import { readdirSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const SPEC_DIR = 'tests/e2e/specs';

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

const specs = readdirSync(path.join(REPO_ROOT, SPEC_DIR))
    .filter((entry) => entry.endsWith('.cy.ts'))
    .map((entry) => ({ file: `${SPEC_DIR}/${entry}`, key: entry.replace('.cy.ts', '') }));

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
 * One Cypress process for one shard.
 *
 * Output is buffered rather than inherited: four interleaved Cypress reporters are unreadable, and
 * the only output anyone needs is that of a shard that failed. Successes collapse to one line.
 */
const runShard = (files: string[], index: number) =>
    new Promise<{ index: number; code: number; output: string; seconds: number }>((resolve) => {
        const startedAt = Date.now();
        let output = '';

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
        console.error(`\n[e2e-shard] shard ${index + 1} FAILED (${seconds}s) —\n`);
        console.error(output);
    }

    const failed = results.filter(({ code }) => code !== 0).length;
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    console.log(
        `\n[e2e-shard] ${results.length - failed}/${results.length} shards passed in ${elapsed}s`
    );
    process.exit(failed > 0 ? 1 : 0);
};

void main();
