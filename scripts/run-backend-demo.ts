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

const backend = resolveBackendPath();
const child = spawn('npm', ['--prefix', backend, 'run', 'demo'], {
    stdio: 'inherit',
    env: process.env
});
// eslint-disable-next-line unicorn/no-process-exit -- a CLI wrapper's exit code IS its interface; there is nobody left to throw to in a close handler
child.on('close', (code) => process.exit(code ?? 1));
