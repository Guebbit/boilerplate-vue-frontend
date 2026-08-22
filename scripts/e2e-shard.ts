#!/usr/bin/env tsx
/**
 * Runs the Cypress e2e specs in parallel shards against ONE preview server — the worker behind
 * `npm run test:e2e`.
 *
 * A BUILT bundle, not a dev server. `vite dev` compiles a route the first time a browser asks for
 * it, so with four browsers on one server the compile queue lands inside Cypress' timeouts and the
 * suite fails on whichever spec reached its form first — reading as a random flake rather than as
 * the contention it is. `vite preview` serves static files, so shard count stops affecting timing.
 * Measured: 4/4 green in 153s against a build, where the same specs on a dev server took ~250s and
 * failed two shards in two runs out of three.
 *
 * ── WHY ──────────────────────────────────────────────────────────────────────────────────────────
 * Cypress runs specs one after another, on one core. Measured 2026-08-14 that is 12m54s of a ~10
 * minute gate, on a machine with sixteen. Cypress's own parallelisation is a Cloud feature, but
 * nothing stops several `cypress run` processes sharing one server — the balancing is the only
 * part Cloud actually adds, and seventeen specs with known durations do not need a service to
 * balance them.
 *
 * ── WHY THIS IS SAFE HERE, AND NOT SAFE FOR THE LIVE PROFILE ─────────────────────────────────────
 * Each shard gets its OWN demo backend (the paired repo's `npm run demo`: the real API against an
 * in-memory Mongo, seeded, booted below on ports 3101+). `cy.resetState()` reseeds only that
 * shard's database, so shards cannot see each other. The built bundle is shared; each shard's
 * Cypress carries `CYPRESS_apiUrl`, which `cy.visit` injects into the page as the runtime
 * `__E2E_API_URL` override (see `src/infrastructure/http/client.ts`).
 *
 * Under the LIVE profile there is ONE real Mongo that every shard would reset out from under the
 * others, mid-test. So this refuses to run when the live profile is active rather than trusting
 * the caller to remember; `test:e2e:live` stays sequential on purpose.
 *
 * ── BALANCING ────────────────────────────────────────────────────────────────────────────────────
 * Longest-first onto the least-loaded shard (LPT), weighted by MEASURED durations rather than by
 * file size. Size is actively misleading here: a spec whose cases are all `cy.skipUnlessLive()`
 * costs a fraction of a second under the demo profile whatever its line count.
 *
 * Wall-clock cannot go below the longest single spec, so the floor is `uploads.cy.ts` at ~86s no
 * matter how many shards are used.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import path from 'node:path';
import { resolveBackendPath } from './backend-path';
import { FUNCTIONAL_SPEC_GLOBS } from './spec-globs';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');

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

if (process.env.CYPRESS_liveProfile === 'true') {
    console.error(
        '\n[e2e-shard] Refusing to shard the LIVE profile.\n\n' +
            '  cy.resetState() re-seeds the paired backend’s ONE real database, which every\n' +
            '  shard would reset out from under the others. Run `npm run test:e2e:live`, which\n' +
            '  is sequential for exactly this reason. (The demo profile shards safely: each\n' +
            '  shard boots its own in-memory backend below.)\n'
    );
    process.exit(2);
}

const shardCount = Math.max(1, Number(process.env.E2E_SHARDS?.trim() || 4));

// Globbed rather than listed: a new module's suite is sharded the day it appears, and a deleted
// one stops being scheduled without anyone editing this file.
const specs = globSync(FUNCTIONAL_SPEC_GLOBS, { cwd: REPO_ROOT })
    // Cypress' `--spec` wants posix separators whatever the platform globbed with, and the sort
    // keeps a run's shard assignment stable rather than at the mercy of directory order.
    .map((entry) => entry.split(path.sep).join('/'))
    .toSorted()
    .map((file) => ({ file, key: path.basename(file, '.cy.ts') }));

const known = Object.values(SECONDS);
const mean = known.reduce((sum, value) => sum + value, 0) / known.length;
const weighted = specs
    .map(({ file, key }) => ({ file, weight: SECONDS[key] ?? mean }))
    .toSorted((a, b) => b.weight - a.weight);

/** Longest-processing-time first: each spec joins whichever shard is currently lightest. */
const shards = Array.from({ length: shardCount }, () => ({ files: [] as string[], load: 0 }));
for (const { file, weight } of weighted) {
    let lightest = shards[0];
    for (const shard of shards) if (shard.load < lightest.load) lightest = shard;
    lightest.files.push(file);
    lightest.load += weight;
}

const active = shards.filter((shard) => shard.files.length > 0);

console.log(
    `[e2e-shard] ${specs.length} specs across ${active.length} shard(s); ` +
        `predicted wall-clock ~${Math.round(Math.max(...active.map((shard) => shard.load)))}s ` +
        `(sequential is ~${Math.round(weighted.reduce((sum, spec) => sum + spec.weight, 0))}s)`
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

/** First port of the per-shard demo backends: shard N listens on DEMO_PORT_BASE + N. */
const DEMO_PORT_BASE = 3101;

/**
 * One demo backend per shard — the paired repo's `npm run demo`, each owning its own in-memory
 * Mongo. Booted in parallel (the mongod binary is cached after the first ever run), readiness is
 * a 200 from `GET /`, and every child is killed however the run ends: an orphaned backend would
 * hold its port and fail the NEXT run with EADDRINUSE, which reads as a mystery.
 */
const bootDemoBackends = async (count: number): Promise<(() => void)[]> => {
    const backendPath = resolveBackendPath();
    const children = Array.from({ length: count }, (_, index) => {
        const port = DEMO_PORT_BASE + index;
        // `detached` puts each backend in its own process GROUP, so the kill below can signal
        // the whole npm → tsx → node → mongod chain. Killing only the npm wrapper orphans the
        // grandchildren, and an orphan holding its port makes the NEXT run's shard talk to a
        // backend full of last run's state — a flake that reads as anything but what it is.
        const child = spawn('npm', ['--prefix', backendPath, 'run', 'demo'], {
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: true,
            env: { ...process.env, NODE_PORT: String(port), NODE_DEMO: 'true' }
        });
        let output = '';
        child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
        child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));
        return { child, port, log: () => output };
    });

    const kill = () => {
        for (const { child } of children)
            try {
                // Negative pid = the child's whole process group — see `detached` above.
                if (child.pid !== undefined) process.kill(-child.pid, 'SIGTERM');
            } catch {
                /* already gone */
            }
    };
    process.on('exit', kill);
    process.on('SIGINT', () => {
        kill();
        process.exit(130);
    });

    const ready = async ({ port, log }: (typeof children)[number]) => {
        const startedAt = Date.now();
        for (;;) {
            try {
                const response = await fetch(`http://localhost:${port}/`);
                if (response.ok) return;
            } catch {
                /* not listening yet */
            }
            if (Date.now() - startedAt > 120_000)
                throw new Error(
                    `[e2e-shard] demo backend on :${port} never became ready.\n${log()}`
                );
            await new Promise((resolve) => setTimeout(resolve, 250));
        }
    };

    await Promise.all(children.map((backend) => ready(backend)));
    console.log(
        `[e2e-shard] ${count} demo backend(s) ready on :${DEMO_PORT_BASE}–:${DEMO_PORT_BASE + count - 1}`
    );
    return [kill];
};

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
                stdio: ['ignore', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    // This shard's own backend — see `bootDemoBackends` below.
                    // eslint-disable-next-line @typescript-eslint/naming-convention -- the CYPRESS_ prefix is Cypress' env-mapping contract, and the suffix names Cypress.env('apiUrl')
                    CYPRESS_apiUrl: `http://localhost:${DEMO_PORT_BASE + index}`
                }
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
    const [killBackends] = await bootDemoBackends(active.length);
    const results = await Promise.all(active.map((shard, index) => runShard(shard.files, index)));
    killBackends();

    for (const { index, code, output, seconds } of results) {
        const specCount = active[index].files.length;
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
