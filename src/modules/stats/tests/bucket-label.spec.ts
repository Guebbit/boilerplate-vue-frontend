/**
 * @module
 * The chart-axis label of a stats bucket: read in the shop's zone, month buckets without a day.
 */
import { describe, expect, it } from 'vitest';
import { EMPTY_VALUE } from '@/infrastructure/utils/formatters';
import { formatBucketStart } from '../bucket-label';

describe('formatBucketStart', () => {
    it('reads a bucket in the shop zone, not the browser zone', () => {
        // 22:00 UTC on 11 Oct is already 12 Oct in Rome (UTC+2), so the bucket is the 12th.
        const start = '2026-10-11T22:00:00.000Z';

        expect(formatBucketStart(start, 'Europe/Rome', 'day')).toContain('12');
        expect(formatBucketStart(start, 'UTC', 'day')).toContain('11');
    });

    it('shows month and year for a month bucket, and no day', () => {
        // 22:00 UTC on 30 Sep is 1 Oct in Rome: the October bucket.
        const label = formatBucketStart('2026-09-30T22:00:00.000Z', 'Europe/Rome', 'month');

        expect(label).toContain('2026');
        expect(label).not.toMatch(/\b(1|30)\b/);
    });

    it('falls back for an unreadable start', () => {
        expect(formatBucketStart('', 'UTC', 'day')).toBe(EMPTY_VALUE);
        expect(formatBucketStart('not a date', 'UTC', 'day')).toBe(EMPTY_VALUE);
    });
});
