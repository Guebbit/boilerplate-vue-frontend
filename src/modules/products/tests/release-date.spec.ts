/**
 * @module
 * The release-date field's two spellings round-trip: what the `datetime-local` input shows and
 * what the wire carries. Runs under whatever zone the host has — the contract is that the input
 * value is wall-clock time and the wire value is the same instant.
 */
import { describe, expect, it } from 'vitest';
import { fromDateTimeLocal, isReleaseDateChanged, toDateTimeLocal } from '../domain';

describe('release date spellings', () => {
    it('reads an instant back to the minute it was typed at', () => {
        const typed = '2027-03-15T09:30';

        expect(toDateTimeLocal(fromDateTimeLocal(typed))).toBe(typed);
    });

    it('writes the typed wall-clock time as one UTC instant', () => {
        expect(fromDateTimeLocal('2027-03-15T09:30')).toBe(
            new Date(2027, 2, 15, 9, 30).toISOString()
        );
    });

    it.each([undefined, null, '', 'not a date'])('reads %j as an empty field', (value) => {
        expect(toDateTimeLocal(value)).toBe('');
    });

    it.each([undefined, null, '', 'not a date'])('writes %j as no date', (value) => {
        expect(fromDateTimeLocal(value)).toBe('');
    });
});

describe('isReleaseDateChanged', () => {
    const original = new Date(2027, 2, 15, 9, 30).toISOString();

    it.each([
        ['a later date', '2027-04-01T10:00', true],
        ['a cleared date', '', true],
        ['a cleared date spelled null', null, true],
        ['an earlier date', '2027-03-01T10:00', true],
        ['the same date', '2027-03-15T09:30', false]
    ])('is %s: %s', (_name, next, expected) => {
        expect(isReleaseDateChanged(original, next)).toBe(expected);
    });

    it.each([undefined, null, '', 'not a date'])('sees a date set where %j was held', (held) => {
        expect(isReleaseDateChanged(held, '2027-04-01T10:00')).toBe(true);
        expect(isReleaseDateChanged(held, '')).toBe(false);
    });
});
