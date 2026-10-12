/**
 * @module
 * Vitest spec for the day-to-instant rule behind the list's date filters: a calendar day is read as
 * its first and last instant, and a text that is no real day is no filter at all.
 */
import { describe, expect, it } from 'vitest';
import { endOfDayInstant, startOfDayInstant } from '../domain';

describe('startOfDayInstant', () => {
    it('is local midnight of the day', () => {
        expect(new Date(startOfDayInstant('2026-03-05') ?? '').getTime()).toBe(
            new Date(2026, 2, 5, 0, 0, 0, 0).getTime()
        );
    });
});

describe('endOfDayInstant', () => {
    it('is the last local millisecond of the day, still inside it', () => {
        const end = new Date(endOfDayInstant('2026-03-05') ?? '');
        expect(end.getTime()).toBe(new Date(2026, 2, 5, 23, 59, 59, 999).getTime());
        expect(end.getDate()).toBe(5);
    });

    it('keeps a leap day', () => {
        expect(new Date(endOfDayInstant('2024-02-29') ?? '').getDate()).toBe(29);
    });
});

describe.each([
    ['start', startOfDayInstant],
    ['end', endOfDayInstant]
])('the %s of a day that does not exist', (_label, bound) => {
    it.each([undefined, '', 'abc', '2026-02-30', '2025-02-29', '2026-13-01', '2026-3-5'])(
        'is no instant for %j',
        (day) => {
            expect(bound(day)).toBeUndefined();
        }
    );
});
