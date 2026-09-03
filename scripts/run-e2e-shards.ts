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
import { resolveBackendDemoCommand } from './paired-backend-path';
import {
    createDemoScratchDirectory,
    removeDemoScratchDirectory
} from './backend-demo-scratch-directory';
import { FUNCTIONAL_SPEC_GLOBS } from './cypress-spec-globs';
import { SECONDS, weighSpecs, balanceShards } from './e2e-shard-balancer';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');

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

/** A positive integer from the environment, or undefined when unset, empty or nonsense. */
const positiveInteger = (value: string | undefined): number | undefined => {
    const parsed = Number(value?.trim());
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const shardCount = positiveInteger(process.env.E2E_SHARDS) ?? 4;

// Globbed rather than listed: a new module's suite is sharded the day it appears, and a deleted
// one stops being scheduled without anyone editing this file.
const specs = globSync(FUNCTIONAL_SPEC_GLOBS, { cwd: REPO_ROOT })
    // Cypress' `--spec` wants posix separators whatever the platform globbed with, and the sort
    // keeps a run's shard assignment stable rather than at the mercy of directory order.
    .map((entry) => entry.split(path.sep).join('/'))
    .toSorted()
    .map((file) => ({ file, key: path.basename(file, '.cy.ts') }));

const weighted = weighSpecs(specs, SECONDS);
const shards = balanceShards(weighted, shardCount);

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
 * One demo backend per shard, booted through `resolveBackendDemoCommand()` — `npm run demo`
 * against an in-memory Mongo for the Node twin, `composer demo` against MySQL for the PHP one.
 * Booted in parallel, readiness is a 200 from `GET /`, and every child is killed however the run
 * ends: an orphaned backend would hold its port and fail the NEXT run with EADDRINUSE, which reads
 * as a mystery.
 *
 * Isolation is free for the Node twin — a fresh in-memory Mongo per process — and provisioned
 * ahead of time for the PHP one: `DB_DATABASE=e2e_demo_shard_{n}` below lands each shard's
 * `migrate:fresh --seed` in one of four databases the PAIRED PHP REPO creates for exactly this
 * (`boilerplate-php-laravel-backend/.docker/mysql/02-e2e-demo-shards.sql`), never the developer's
 * own `boilerplate` database. That file provisions exactly 4 — see the guard below for what
 * happens if `count` (from `E2E_SHARDS`) ever asks for more against the PHP pairing.
 */
const bootDemoBackends = async (count: number): Promise<() => void> => {
    // BACKEND_DEMO_COMMAND unset: boot nothing, and treat the ports as somebody else's to serve.
    // The readiness wait below still runs, so a shard never starts against a port with nothing on
    // it — it fails there, saying why, instead of inside Cypress.
    const demoCommand = resolveBackendDemoCommand();
    if (demoCommand === undefined)
        console.log(
            `[e2e-shard] BACKEND_DEMO_COMMAND is unset — booting nothing; expecting backends already on :${DEMO_PORT_BASE}–:${DEMO_PORT_BASE + count - 1}`
        );

    // The PHP pairing's databases are provisioned ahead of time, by name, in the PHP repo's own
    // `.docker/mysql/02-e2e-demo-shards.sql` — unlike the Node twin's in-memory Mongo, which needs
    // no such provisioning and so has no ceiling to violate. A 5th shard against the PHP pairing
    // would compute `DB_DATABASE=e2e_demo_shard_5`, a database that file never created or granted,
    // and fail deep inside Laravel's DB connection with no hint of the real cause. Caught here
    // instead, naming the file that would need a matching 5th `CREATE DATABASE` block.
    if (demoCommand?.[0] === 'composer' && count > 4)
        throw new Error(
            `[e2e-shard] E2E_SHARDS=${count} exceeds the PHP pairing's provisioned shard count (4). ` +
                'Add a 5th CREATE DATABASE/GRANT block to ' +
                '`boilerplate-php-laravel-backend/.docker/mysql/02-e2e-demo-shards.sql` first.'
        );

    // Every backend's in-memory Mongo writes under this, not under the machine's `/tmp` — see
    // `demo-scratch.ts` for the tmpfs it was filling. The PHP twin ignores it; nothing there reads
    // TMPDIR for its own state.
    const scratchDirectory = demoCommand ? createDemoScratchDirectory() : undefined;
    const children = Array.from({ length: count }, (_, index) => {
        const port = DEMO_PORT_BASE + index;
        if (!demoCommand)
            return {
                child: undefined,
                port,
                log: () => '(BACKEND_DEMO_COMMAND is unset, so nothing was booted on this port)'
            };
        const [command, ...commandArguments] = demoCommand;
        // `detached` puts each backend in its own process GROUP, so the kill below can signal the
        // whole command chain (npm → tsx → node → mongod, or composer → php → artisan). Killing
        // only the wrapper orphans the grandchildren, and an orphan holding its port makes the
        // NEXT run's shard talk to a backend full of last run's state — a flake that reads as
        // anything but what it is.
        const child = spawn(command, commandArguments, {
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: true,
            env: {
                ...process.env,
                // NODE_PORT: read by the Node twin's own `demo` script. SERVER_PORT: read by
                // Laravel's `artisan serve` (honoured since the PHP twin's own toolchain started
                // forwarding it). DB_DATABASE: read by Laravel's own config for which schema to
                // migrate — the Node twin has no such variable, so it is simply unread there. Each
                // backend reads what it recognises and ignores the rest.
                NODE_PORT: String(port),
                SERVER_PORT: String(port),
                DB_DATABASE: `e2e_demo_shard_${index + 1}`,
                NODE_DEMO: 'true',
                TMPDIR: scratchDirectory,
                // All shards serve the SAME built bundle on :8085 (the preview server this file's
                // own module doc names) — every shard's OAuth callback and emailed link must
                // redirect there too, not at the Node twin's `.env` default of :8080.
                NODE_FRONTEND_URL: 'http://localhost:8085'
            }
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
                if (child?.pid !== undefined) process.kill(-child.pid, 'SIGTERM');
            } catch {
                /* already gone */
            }
        if (scratchDirectory) removeDemoScratchDirectory(scratchDirectory);
    };
    process.on('exit', kill);
    // `exit` does not fire for a signal that terminates by default, so both of the ways this
    // runner actually gets stopped need saying explicitly: a ^C at a terminal, and the SIGTERM
    // `start-server-and-test` sends when the suite above it finishes. Without the second one, a
    // CI run left its ~200 MB of Mongo behind every time. Exit codes are the 128+signal
    // convention, so a caller can still tell which signal ended the run.
    for (const [signal, code] of [
        ['SIGINT', 130],
        ['SIGTERM', 143]
    ] as const)
        process.on(signal, () => {
            kill();
            process.exit(code);
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
    return kill;
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
    const killBackends = await bootDemoBackends(active.length);
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
