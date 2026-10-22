/**
 * `scripts/e2e/shard-verdict.ts` — a shard passes only when it exited 0, was not killed, and
 * Cypress reported every assigned spec finishing.
 */
import { describe, expect, it } from 'vitest';
import {
    countFinishedSpecs,
    judgeShard,
    type ShardOutcome
} from '../../../../scripts/e2e/shard-verdict';

/** A healthy shard of two specs; each case overrides one field. */
const healthy: ShardOutcome = {
    code: 0,
    signal: null,
    hung: false,
    quietMinutes: 10,
    assigned: 2,
    ran: 2
};

describe('judgeShard', () => {
    it('passes a clean exit with every spec run', () => {
        expect(judgeShard(healthy)).toEqual({ ok: true });
    });

    it('fails a non-zero exit, naming the code', () => {
        expect(judgeShard({ ...healthy, code: 1 })).toEqual({ ok: false, reason: 'exit code 1' });
    });

    it('fails a signal even when the wrapper exited 0', () => {
        const verdict = judgeShard({ ...healthy, signal: 'SIGKILL' });
        expect(verdict).toEqual({ ok: false, reason: 'ended by signal SIGKILL' });
    });

    it('fails a hung shard as HUNG, ahead of the signal the kill produced', () => {
        const verdict = judgeShard({ ...healthy, code: null, signal: 'SIGKILL', hung: true });
        expect(verdict).toMatchObject({ ok: false });
        expect((verdict as { reason: string }).reason).toMatch(/^HUNG: no output for 10 min/u);
    });

    it('fails an exit 0 with fewer specs run than assigned', () => {
        const verdict = judgeShard({ ...healthy, ran: 1 });
        expect(verdict).toMatchObject({ ok: false });
        expect((verdict as { reason: string }).reason).toMatch(/only 1 of 2 specs ran/u);
    });

    it('fails an exit 0 that printed no summary at all', () => {
        expect(judgeShard({ ...healthy, ran: countFinishedSpecs('') })).toMatchObject({
            ok: false
        });
    });
});

describe('countFinishedSpecs', () => {
    const summary = [
        '  (Run Finished)',
        '    Spec                                    Tests  Passing  Failing  Pending  Skipped',
        '  ┌────────────────────────────────────────────────────────────────────────────────┐',
        '  │ ✔  login.cy.ts                     00:05        3        3        -        -        - │',
        '  │ ✖  cart/cart.cy.ts                 00:09        4        3        1        -        - │',
        '  │ −  skipped.cy.ts                   00:00        1        -        -        1        - │',
        '  └────────────────────────────────────────────────────────────────────────────────┘',
        '    ✖  1 of 3 failed (33%)                     00:14        8        6        1        1        -'
    ].join('\n');

    it('counts a row per spec, whatever its result', () => {
        expect(countFinishedSpecs(summary)).toBe(3);
    });

    it('counts a spec once if its row is printed twice', () => {
        expect(countFinishedSpecs(`${summary}\n${summary}`)).toBe(3);
    });

    it('ignores the totals row and the "Running:" lines', () => {
        expect(countFinishedSpecs('  Running:  login.cy.ts   (1 of 3)')).toBe(0);
    });
});
