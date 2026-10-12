import { describe, expect, it } from 'vitest';
import { addCalendarDays, daysInRange, isCalendarDay, toCalendarDay } from '../domain/calendar.ts';

describe('isCalendarDay', () => {
    it.each(['2026-10-12', '2024-02-29'])('accepts %s', (value) => {
        expect(isCalendarDay(value)).toBe(true);
    });

    it.each([undefined, '', '2026-2-3', '2026-02-30', '2025-02-29', 'tomorrow', '2026-13-01'])(
        'refuses %s',
        (value) => {
            expect(isCalendarDay(value)).toBe(false);
        }
    );
});

describe('addCalendarDays', () => {
    it('crosses a month end and a year end', () => {
        expect(addCalendarDays('2026-01-31', 1)).toBe('2026-02-01');
        expect(addCalendarDays('2026-01-01', -1)).toBe('2025-12-31');
    });

    it('keeps whole days through a leap day', () => {
        expect(addCalendarDays('2024-02-28', 2)).toBe('2024-03-01');
    });
});

describe('daysInRange', () => {
    it('counts both ends', () => {
        expect(daysInRange('2026-10-01', '2026-10-01')).toBe(1);
        expect(daysInRange('2026-10-01', '2026-10-07')).toBe(7);
    });

    it('is zero or less for a reversed range', () => {
        expect(daysInRange('2026-10-07', '2026-10-01')).toBeLessThanOrEqual(0);
    });
});

describe('toCalendarDay', () => {
    it('pads month and day', () => {
        expect(toCalendarDay(new Date(2026, 0, 5))).toBe('2026-01-05');
    });
});
