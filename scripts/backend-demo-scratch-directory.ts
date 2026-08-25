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
 *
 * That last promise is only as good as the signal handling of the process making it, and no
 * handler survives `SIGKILL`. Creating a directory therefore also SWEEPS the ones left by runs
 * that are no longer running, which is what actually bounds the cost of a leak: the next run
 * reclaims it, rather than it sitting in the cache until someone notices 600 MB.
 *
 * The path is deliberately SHORT. `TMPDIR` is also where `tsx` opens its IPC socket, and a Unix
 * socket path is capped at 108 bytes: a root under `node_modules/.cache/…` pushed it past that
 * and the backend died with `listen EINVAL` before Mongo was even involved.
 */
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CACHE_ROOT = path.join(os.homedir(), '.cache', 'boilerplate-vue-frontend-demo');

/**
 * Whether a process id still belongs to a running process.
 *
 * Signal `0` runs the kernel's permission and existence checks without delivering anything.
 * `EPERM` means it EXISTS and is someone else's — a recycled id — so it counts as alive: the
 * cost of believing a dead run is alive is one directory swept a run later than it could have
 * been, and the cost of the opposite is deleting the scratch of a backend that is still writing.
 *
 * @param pid - The process id to test.
 * @returns `true` when the process exists, or exists and is not ours to signal.
 */
const isProcessAlive = (pid: number): boolean => {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return (error as NodeJS.ErrnoException).code === 'EPERM';
    }
};

/**
 * Removes the scratch directories of runs that are no longer running.
 *
 * Entries are named after the pid that created them, so "is this one abandoned" is a question the
 * kernel can answer. A missing cache root means nothing has ever leaked, which is not a problem.
 */
const sweepAbandonedScratchDirectories = (): void => {
    let entries: string[];
    try {
        entries = readdirSync(CACHE_ROOT);
    } catch {
        return; /* nothing has been created yet */
    }
    for (const entry of entries) {
        const pid = Number(entry);
        // Anything not named after a pid was not created here; leave it alone.
        if (!Number.isInteger(pid) || pid <= 0 || isProcessAlive(pid)) continue;
        removeDemoScratchDirectory(path.join(CACHE_ROOT, entry));
    }
};

/**
 * Creates a fresh scratch directory for one run, named after the calling process, after clearing
 * away whatever earlier runs did not live long enough to clear away themselves.
 *
 * @returns The absolute path, to pass as `TMPDIR` to the spawned backend.
 */
export const createDemoScratchDirectory = (): string => {
    sweepAbandonedScratchDirectories();
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
