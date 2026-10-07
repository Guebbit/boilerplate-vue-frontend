/**
 * The nightly live split: every slice together is the whole suite, once, and a bad slice is refused.
 */
import { describe, expect, it } from 'vitest';

import { liveShardFiles, liveShardSlices } from '../../../../scripts/e2e/live-shard';

/** Five spec files to slice. */
const FILES = ['a.cy.ts', 'b.cy.ts', 'c.cy.ts', 'd.cy.ts', 'e.cy.ts'];

/** Their measured durations, heaviest first. */
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

describe('liveShardSlices', () => {
    it('is the same partition liveShardFiles hands out one slice at a time', () => {
        expect(liveShardSlices(FILES, DURATIONS, 3)).toEqual(
            [1, 2, 3].map((index) => liveShardFiles(FILES, DURATIONS, index, 3))
        );
    });

    it('refuses a slice count that is not a positive integer', () => {
        expect(() => liveShardSlices(FILES, DURATIONS, 0)).toThrow(RangeError);
        expect(() => liveShardSlices(FILES, DURATIONS, 2.5)).toThrow(RangeError);
    });
});
