/**
 * A disk-backed scratch directory for a demo backend this repo spawns.
 *
 * `mongodb-memory-server` writes each instance's data under `os.tmpdir()` — on this kind of
 * machine a RAM-backed tmpfs of a few gigabytes — and deletes it only on a graceful `stop()`. A
 * backend that is killed (the shard runner's SIGTERM, a ^C, a crash) leaves ~200 MB behind every
 * time, and two dozen e2e runs later `/tmp` is full and the NEXT backend dies on boot with a
 * mongod `fassert` that reads as anything but "no space left".
 *
 * So the backends this repo starts get their own `TMPDIR`, under the user's cache directory — on
 * the disk, outside the repo, and removed by the process that created it however the run ends.
 * A leak then costs nothing past the run that caused it.
 *
 * The path is deliberately SHORT. `TMPDIR` is also where `tsx` opens its IPC socket, and a Unix
 * socket path is capped at 108 bytes: a root under `node_modules/.cache/…` pushed it past that
 * and the backend died with `listen EINVAL` before Mongo was even involved.
 */
import { mkdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CACHE_ROOT = path.join(os.homedir(), '.cache', 'boilerplate-vue-frontend-demo');

/**
 * Creates a fresh scratch directory for one run, named after the calling process.
 *
 * @returns The absolute path, to pass as `TMPDIR` to the spawned backend.
 */
export const createDemoScratchDirectory = (): string => {
    const directory = path.join(CACHE_ROOT, String(process.pid));
    mkdirSync(directory, { recursive: true });
    return directory;
};

/**
 * Removes a scratch directory, and everything a killed mongod left inside it. Best effort and
 * synchronous on purpose: it runs from `process.on('exit')`, where nothing asynchronous survives.
 *
 * @param directory - What `createDemoScratchDirectory` returned.
 */
export const removeDemoScratchDirectory = (directory: string): void => {
    try {
        rmSync(directory, { recursive: true, force: true });
    } catch {
        /* a file still held open by a dying process — the next run's mkdir does not mind */
    }
};
