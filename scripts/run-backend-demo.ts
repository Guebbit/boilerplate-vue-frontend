/**
 * Boots the paired backend's demo profile from THIS repo — the sibling-checkout resolution in
 * `backend-path.ts` decides which backend, exactly as `check-spec-identity` does, so the two can
 * never silently disagree about which API the suite is talking to.
 *
 * A thin exec wrapper because `start-server-and-test` (and a human) wants one command with the
 * path already resolved: `npm run backend:demo`. `NODE_PORT` passes through.
 */
import { spawn } from 'node:child_process';
import { resolveBackendPath } from './backend-path';
import { createDemoScratchDirectory, removeDemoScratchDirectory } from './demo-scratch';

// The backend's in-memory Mongo writes under this, not under the machine's `/tmp` — see
// `demo-scratch.ts` for the tmpfs it was filling.
const scratchDirectory = createDemoScratchDirectory();

const child = spawn('npm', ['--prefix', resolveBackendPath(), 'run', 'demo'], {
    stdio: 'inherit',
    env: { ...process.env, TMPDIR: scratchDirectory }
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
