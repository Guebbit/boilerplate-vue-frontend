/**
 * @module
 * The status rules a screen reads: which moves each status offers. They mirror the API's own
 * lifecycle, so a change there is a change here; the server stays the judge either way.
 */
import { describe, expect, it } from 'vitest';
import { EXAMPLE_STATUSES, NEXT_STATUSES } from '@/modules/example/domain';

describe('NEXT_STATUSES', () => {
    it.each([
        ['draft', ['published', 'archived']],
        ['published', ['archived']],
        ['archived', ['draft']]
    ] as const)('lets a %s example move to %j', (status, expected) => {
        expect(NEXT_STATUSES[status]).toEqual(expected);
    });

    it('never offers a status to itself', () => {
        for (const status of EXAMPLE_STATUSES) expect(NEXT_STATUSES[status]).not.toContain(status);
    });

    it('never withdraws a published example back to a draft', () => {
        expect(NEXT_STATUSES.published).not.toContain('draft');
    });
});

describe('EXAMPLE_STATUSES', () => {
    it('lists every status once, in the order a screen shows them', () => {
        expect(EXAMPLE_STATUSES).toEqual(['draft', 'published', 'archived']);
    });
});
