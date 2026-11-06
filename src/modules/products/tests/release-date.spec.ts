/**
 * @module
 * The promise-date field is a plain `YYYY-MM-DD` day on the wire and in the input, so the only
 * logic is comparing two strings: nothing here may read or shift a date, in any host zone.
 */
import { describe, expect, it } from 'vitest';
import { dayChange, isReleaseDateChanged } from '../domain';

describe('isReleaseDateChanged', () => {
    const original = '2027-03-15';

    it.each([
        ['a later day', '2027-04-01', true],
        ['a cleared day', '', true],
        ['a cleared day spelled null', null, true],
        ['an earlier day', '2027-03-01', true],
        ['the same day', '2027-03-15', false]
    ])('is %s: %s', (_name, next, expected) => {
        expect(isReleaseDateChanged(original, next)).toBe(expected);
    });

    it.each([undefined, null, ''])('sees a day set where %j was held', (held) => {
        expect(isReleaseDateChanged(held, '2027-04-01')).toBe(true);
        expect(isReleaseDateChanged(held, '')).toBe(false);
    });
});

describe('dayChange', () => {
    it('leaves an untouched day out of the body', () => {
        expect(dayChange('2027-03-15', '2027-03-15')).toBeUndefined();
    });

    it('sends the typed day as it is', () => {
        expect(dayChange('2027-03-15', '2027-04-01')).toBe('2027-04-01');
    });

    it.each([null, undefined, ''])('spells a cleared %j field as the empty string', (current) => {
        expect(dayChange('2027-03-15', current)).toBe('');
    });
});
