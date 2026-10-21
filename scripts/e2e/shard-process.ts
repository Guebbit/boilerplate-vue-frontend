/**
 * Spawns one shard's process under a no-progress watchdog.
 *
 * Why: a Cypress that hangs prints nothing and never exits, so the gate sat for over an hour.
 * The process runs in its own group so the kill reaches Cypress and the browser, not only the
 * `npx` wrapper.
 */
import { spawn } from 'node:child_process';

/** How a watched process ended. */
export interface WatchedResult {
    /** Exit code; `null` when a signal ended it. */
    code: number | null;
    /** The signal that ended it, if any. */
    signal: NodeJS.Signals | null;
    /** Whether the watchdog killed it for silence. */
    hung: boolean;
    /** Everything it wrote to stdout and stderr. */
    output: string;
}

/** Groups still running, so the runner's own exit can take them down. */
const liveGroups = new Set<number>();

/**
 * Signals a process group, ignoring one that is already gone.
 *
 * @param pid - the group leader's pid
 */
const killGroup = (pid: number) => {
    try {
        // Negative pid = the whole process group (see `detached` below).
        process.kill(-pid, 'SIGKILL');
    } catch {
        /* already gone */
    }
};

process.on('exit', () => {
    for (const pid of liveGroups) killGroup(pid);
});

/**
 * Runs a command, killing its process group after `quietMs` without any output.
 *
 * @param command - the executable
 * @param commandArguments - its arguments
 * @param options - `cwd` and `env` for the child; `quietMs` the longest allowed silence
 * @returns how it ended; never rejects
 */
export const runWatched = (
    command: string,
    commandArguments: string[],
    options: { cwd: string; env: NodeJS.ProcessEnv; quietMs: number }
) =>
    new Promise<WatchedResult>((resolve) => {
        let output = '';
        let hung = false;
        let lastOutputAt = Date.now();

        // detached: own process group, so killGroup can reach every descendant.
        const child = spawn(command, commandArguments, {
            cwd: options.cwd,
            env: options.env,
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: true
        });
        const { pid, stdout, stderr } = child;
        if (pid !== undefined) liveGroups.add(pid);

        const onData = (chunk: Buffer) => {
            output += chunk.toString();
            lastOutputAt = Date.now();
        };
        stdout.on('data', onData);
        stderr.on('data', onData);

        // Checked a few times per window; a quarter is fine resolution for a minutes-long limit.
        const watchdog = setInterval(
            () => {
                if (Date.now() - lastOutputAt <= options.quietMs || pid === undefined) return;
                hung = true;
                killGroup(pid);
            },
            Math.max(50, Math.min(15_000, options.quietMs / 4))
        );

        child.on('error', (error) => {
            clearInterval(watchdog);
            if (pid !== undefined) liveGroups.delete(pid);
            resolve({ code: 1, signal: null, hung, output: output + String(error) });
        });
        child.on('close', (code, signal) => {
            clearInterval(watchdog);
            if (pid !== undefined) liveGroups.delete(pid);
            resolve({ code, signal, hung, output });
        });
    });
