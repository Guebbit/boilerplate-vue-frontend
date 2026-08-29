/**
 * `scripts/run-e2e-shards.ts`'s LPT balancer — the one piece of real algorithmic content among
 * `scripts/`'s process-orchestration files, and the only one worth unit testing in isolation.
 * Driven against small hand-built duration tables rather than the real `SECONDS`, so the
 * properties under test stay legible independent of whatever the measured numbers happen to be.
 */
import { describe, it, expect } from 'vitest';
import { SECONDS, weighSpecs, balanceShards, type Spec } from '../../../scripts/e2e-shard-balancer';

const spec = (file: string, key = file): Spec => ({ file, key });

describe('weighSpecs', () => {
    it('weighs a known spec at its measured duration', () => {
        const weighted = weighSpecs([spec('a.cy.ts', 'a')], { a: 40, b: 20 });

        expect(weighted).toEqual([{ file: 'a.cy.ts', weight: 40 }]);
    });

    it('weighs an unknown spec at the mean of the known durations', () => {
        const weighted = weighSpecs([spec('mystery.cy.ts', 'mystery')], { a: 40, b: 20 });

        expect(weighted).toEqual([{ file: 'mystery.cy.ts', weight: 30 }]);
    });

    it('sorts heaviest first', () => {
        const weighted = weighSpecs([spec('light.cy.ts', 'b'), spec('heavy.cy.ts', 'a')], {
            a: 40,
            b: 20
        });

        expect(weighted.map(({ file }) => file)).toEqual(['heavy.cy.ts', 'light.cy.ts']);
    });
});

describe('balanceShards', () => {
    it('packs the single heaviest spec alone when it outweighs the rest combined', () => {
        // LPT: the heaviest spec lands first, on the (still empty) lightest shard; the two
        // lighter specs that follow both fit on the other shard before it would outweigh the
        // first — so the heaviest one never gets company.
        const weighted = [
            { file: 'heavy.cy.ts', weight: 50 },
            { file: 'light-1.cy.ts', weight: 10 },
            { file: 'light-2.cy.ts', weight: 10 }
        ];

        const shards = balanceShards(weighted, 2);

        expect(shards).toEqual([
            { files: ['heavy.cy.ts'], load: 50 },
            { files: ['light-1.cy.ts', 'light-2.cy.ts'], load: 20 }
        ]);
    });

    it('balances near-equal specs evenly across shards', () => {
        const weighted = [
            { file: 'a.cy.ts', weight: 10 },
            { file: 'b.cy.ts', weight: 10 },
            { file: 'c.cy.ts', weight: 10 },
            { file: 'd.cy.ts', weight: 10 }
        ];

        const shards = balanceShards(weighted, 2);

        expect(shards.map(({ load }) => load)).toEqual([20, 20]);
    });

    it('leaves the extra shards empty rather than erroring when there are more shards than specs', () => {
        const shards = balanceShards([{ file: 'only.cy.ts', weight: 5 }], 3);

        expect(shards).toEqual([
            { files: ['only.cy.ts'], load: 5 },
            { files: [], load: 0 },
            { files: [], load: 0 }
        ]);
    });

    it('returns no shards for a zero count, given no specs to place', () => {
        expect(balanceShards([], 0)).toEqual([]);
    });
});

/** The guard on the guard: an empty or degenerate table would satisfy every test above vacuously. */
describe('SECONDS — the real timing table', () => {
    it('is checking a real suite', () => {
        expect(Object.keys(SECONDS).length).toBeGreaterThan(15);
    });

    it('carries only positive durations', () => {
        expect(Object.values(SECONDS).every((value) => value > 0)).toBe(true);
    });
});
