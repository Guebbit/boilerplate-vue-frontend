/**
 * `scripts/e2e/shard-process.ts` — the watchdog, proven against a stand-in for Cypress that
 * sleeps forever, and one that prints and exits.
 */
import { describe, expect, it } from 'vitest';
import { runWatched } from '../../../../scripts/e2e/shard-process';
import { judgeShard } from '../../../../scripts/e2e/shard-verdict';

/** Runs `node -e <code>` as the fake Cypress, under a quiet window of `quietMs`. */
const fakeCypress = (code: string, quietMs: number) =>
    runWatched(process.execPath, ['-e', code], {
        cwd: process.cwd(),
        env: process.env,
        quietMs
    });

describe('runWatched', () => {
    it('kills a process that prints nothing, and the gate verdict says HUNG', async () => {
        const startedAt = Date.now();

        const result = await fakeCypress('setInterval(() => {}, 1000)', 400);

        expect(result.hung).toBe(true);
        expect(result.signal).toBe('SIGKILL');
        expect(Date.now() - startedAt).toBeLessThan(10_000);
        const verdict = judgeShard({
            ...result,
            quietMinutes: 10,
            assigned: 1,
            ran: 0
        });
        expect(verdict).toMatchObject({ ok: false });
        expect((verdict as { reason: string }).reason).toMatch(/^HUNG/u);
    });

    it('lets a process that keeps printing outlive the quiet window', async () => {
        const result = await fakeCypress(
            'let n = 0; const t = setInterval(() => { console.log(n++); if (n > 8) clearInterval(t); }, 100)',
            600
        );

        expect(result).toMatchObject({ code: 0, signal: null, hung: false });
        expect(result.output).toContain('8');
    });

    it('reports a non-zero exit with its output', async () => {
        const result = await fakeCypress('console.error("boom"); process.exit(3)', 5000);

        expect(result).toMatchObject({ code: 3, hung: false });
        expect(result.output).toContain('boom');
    });
});
