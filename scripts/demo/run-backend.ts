/**
 * Boots the paired backend's demo profile from THIS repo — the sibling-checkout resolution in
 * `paired-backend-path.ts` decides which backend, exactly as `check-spec-identity` does, so the two can
 * never silently disagree about which API the suite is talking to.
 *
 * A thin exec wrapper because `start-server-and-test` (and a human) wants one command with the
 * path already resolved: `npm run backend:demo`.
 *
 * WHICH command is `BACKEND_DEMO_COMMAND`'s to say — the two paired backends do not expose the
 * demo profile through the same runner, and with the variable unset this boots nothing at all.
 * See `resolveBackendDemoCommand`.
 *
 * Pinned to {@link SINGLE_PROCESS_DEMO_PORT}, never whatever `NODE_PORT` happened to be
 * set to. `start-server-and-test`'s readiness probe is a bare `GET` — it cannot tell "the demo
 * backend I just spawned" from "someone's `npm run host -- start` already sitting on :3000", and
 * the wrong one answering first makes the whole suite run against a live, unseeded backend
 * instead of failing loudly. See `package.json`'s `test:e2e:serial`/`:visual`/`:dev`/`:spec`,
 * which point their own `CYPRESS_apiUrl` and readiness probe at the same port.
 */
import { spawn } from 'node:child_process';
import { resolveBackendDemoCommand } from '../pairing/paired-backend-path';
import { createDemoScratchDirectory, removeDemoScratchDirectory } from './scratch-directory';
import { ANTIBOT_BACKEND_ENV, wantsAntibotBackend } from '../e2e/antibot-backend';
import { SINGLE_PROCESS_SINK_PORT, sinkUrlForPort } from '../e2e/webhook-sink';

/**
 * The port every single-process e2e npm script (serial, visual, dev, spec — everything that is
 * NOT `run-shards.ts`'s sharded demo pool) boots its throwaway demo backend on.
 *
 * Deliberately not :3000, which is this pairing's conventional dev-backend port and the one most
 * likely to already have something listening on it, and deliberately below `run-shards.ts`'s
 * `DEMO_PORT_BASE` (3101+) so the two schemes can never collide even if both happened to run at
 * once.
 */
export const SINGLE_PROCESS_DEMO_PORT = 3100;

/*
 * `.env` into `process.env` before the command is resolved — Node's own loader, as
 * `run-e2e-shards.ts` and `cypress.config.ts` do it. An npm script sees no `.env` otherwise, and
 * `BACKEND_DEMO_COMMAND` lives there: without this, every `npm run backend:demo` on a developer's
 * machine would resolve to "unset" and boot nothing. A missing `.env` is not an error, because CI
 * passes the variable for real.
 */
try {
    process.loadEnvFile();
} catch {
    /* no .env in this checkout */
}

/** Spawns the backend demo command, forwarding signals and mirroring its exit code. */
const boot = (argv: readonly string[]) => {
    // The backend's in-memory Mongo writes under this, not under the machine's `/tmp` — see
    // `backend-demo-scratch-directory.ts` for the tmpfs it was filling.
    const scratchDirectory = createDemoScratchDirectory();

    const [command, ...commandArguments] = argv;
    const child = spawn(command, commandArguments, {
        stdio: 'inherit',
        env: {
            ...process.env,
            TMPDIR: scratchDirectory,
            // Every e2e npm script serves the built/dev FE on :8085 (cypress.config.ts's
            // baseUrl), never the backend's own `.env` default of :8080 — without this the OAuth
            // callback and any emailed link redirect the browser at a port nothing is listening
            // on here.
            NODE_FRONTEND_URL: 'http://localhost:8085',
            // This repo's own port, not whatever NODE_PORT happened to inherit from the
            // shell or `.env` — see SINGLE_PROCESS_DEMO_PORT's docstring. NODE_PORT: the Node
            // twin's own `demo` script. SERVER_PORT: Laravel's `artisan serve`, the same pairing
            // `run-shards.ts` already forwards both of for the sharded case.
            NODE_PORT: String(SINGLE_PROCESS_DEMO_PORT),
            SERVER_PORT: String(SINGLE_PROCESS_DEMO_PORT),
            // Marks this as a throwaway demo instance, same as `run-shards.ts`'s per-shard
            // backends set it — kept symmetric with that file rather than read by anything here.
            NODE_DEMO: 'true',
            // The webhook receiver Cypress hosts beside this backend (`webhook-sink.ts`): the
            // seeded subscription points at it, and the SSRF guard exempts exactly its host.
            NODE_WEBHOOK_DEMO_SINK_URL: sinkUrlForPort(SINGLE_PROCESS_SINK_PORT),
            // `npm run backend:demo -- --antibot`: the human-challenge provider on (`antibot-backend.ts`).
            ...(wantsAntibotBackend(process.argv.slice(2)) ? ANTIBOT_BACKEND_ENV : {})
        }
    });

    // `start-server-and-test` ends this wrapper with a signal; the backend under it must get the
    // same one, so its `mongod.stop()` runs and the scratch directory below has nothing left in it.
    for (const signal of ['SIGTERM', 'SIGINT'] as const)
        process.on(signal, () => {
            child.kill(signal);
        });

    child.on('close', (code) => {
        removeDemoScratchDirectory(scratchDirectory);
        // eslint-disable-next-line unicorn/no-process-exit -- a CLI wrapper's exit code IS its interface; there is nobody left to throw to in a close handler
        process.exit(code ?? 1);
    });
};

/** The command that boots the paired backend's demo profile, if one is configured. */
const demoCommand = resolveBackendDemoCommand();

// Boot it when configured; otherwise idle so the readiness wait has something to wait on.
if (demoCommand) boot(demoCommand);
else {
    /*
     * No BACKEND_DEMO_COMMAND, so booting a backend is not this repo's job in this checkout — one
     * is expected to be running already. It still has to STAY ALIVE: `start-server-and-test`
     * reads a start command that exits as a server that died, and would abort before ever waiting
     * on the backend somebody has up. Idling lets that wait succeed, or time out saying so.
     */
    console.log(
        `[backend:demo] BACKEND_DEMO_COMMAND is unset — booting nothing; expecting a backend ` +
            `already on :${SINGLE_PROCESS_DEMO_PORT}`
    );
    setInterval(() => undefined, 60_000);
}
