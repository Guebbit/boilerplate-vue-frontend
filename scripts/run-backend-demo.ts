/**
 * Boots the paired backend's demo profile from THIS repo — the sibling-checkout resolution in
 * `paired-backend-path.ts` decides which backend, exactly as `check-spec-identity` does, so the two can
 * never silently disagree about which API the suite is talking to.
 *
 * A thin exec wrapper because `start-server-and-test` (and a human) wants one command with the
 * path already resolved: `npm run backend:demo`. `NODE_PORT` passes through.
 *
 * WHICH command is `BACKEND_DEMO_COMMAND`'s to say — the two paired backends do not expose the
 * demo profile through the same runner, and with the variable unset this boots nothing at all.
 * See `resolveBackendDemoCommand`.
 */
import { spawn } from 'node:child_process';
import { resolveBackendDemoCommand } from './paired-backend-path';
import {
    createDemoScratchDirectory,
    removeDemoScratchDirectory
} from './backend-demo-scratch-directory';

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
            NODE_FRONTEND_URL: 'http://localhost:8085'
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

const demoCommand = resolveBackendDemoCommand();

if (demoCommand) boot(demoCommand);
else {
    /*
     * No BACKEND_DEMO_COMMAND, so booting a backend is not this repo's job in this checkout — one
     * is expected to be running already. It still has to STAY ALIVE: `start-server-and-test`
     * reads a start command that exits as a server that died, and would abort before ever waiting
     * on the backend somebody has up. Idling lets that wait succeed, or time out saying so.
     */
    console.log('[backend:demo] BACKEND_DEMO_COMMAND is unset — booting nothing');
    setInterval(() => undefined, 60_000);
}
