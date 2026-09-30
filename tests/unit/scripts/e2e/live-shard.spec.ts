/**
 * The nightly live split: every slice together is the whole suite, once, and a bad slice is refused.
 */
import { describe, expect, it } from 'vitest';

import { liveShardFiles } from '../../../../scripts/e2e/live-shard';

const FILES = ['a.cy.ts', 'b.cy.ts', 'c.cy.ts', 'd.cy.ts', 'e.cy.ts'];
const DURATIONS = { 'a.cy.ts': 100, 'b.cy.ts': 60, 'c.cy.ts': 50, 'd.cy.ts': 10, 'e.cy.ts': 5 };

describe('liveShardFiles', () => {
    it('gives every spec to exactly one slice', () => {
        const slices = [1, 2, 3].map((index) => liveShardFiles(FILES, DURATIONS, index, 3));
        expect(slices.flat().toSorted()).toEqual(FILES);
    });

    it('puts the heaviest specs in different slices', () => {
        const [first, second] = [1, 2].map((index) => liveShardFiles(FILES, DURATIONS, index, 2));
        expect(first).toContain('a.cy.ts');
        expect(second).toContain('b.cy.ts');
    });

    it('is the same partition however the input is ordered', () => {
        expect(liveShardFiles(FILES.toReversed(), DURATIONS, 2, 3)).toEqual(
            liveShardFiles(FILES, DURATIONS, 2, 3)
        );
    });

    it('still splits a suite with no recorded durations', () => {
        const slices = [1, 2].map((index) => liveShardFiles(FILES, {}, index, 2));
        expect(slices.map((slice) => slice.length)).toEqual([3, 2]);
    });

    it.each([
        [0, 3],
        [4, 3],
        [1.5, 3],
        [1, 0]
    ])('refuses slice %s of %s', (index, total) => {
        expect(() => liveShardFiles(FILES, DURATIONS, index, total)).toThrow(RangeError);
    });
});
