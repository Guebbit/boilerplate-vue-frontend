/**
 * @module
 * The stated day as staff type it: a local `datetime-local` string in, an instant out, never one in
 * the future. The three staff forms share these, so the rule is pinned once here.
 */
import { describe, expect, it } from 'vitest';
import { isStatedInTime, localToIso, toLocalInput } from '../domain/statement.ts';

describe('toLocalInput', () => {
    it('writes local wall-clock time to the minute', () => {
        expect(toLocalInput(new Date(2026, 0, 2, 3, 4, 59))).toBe('2026-01-02T03:04');
    });
});

describe('localToIso', () => {
    it('reads what toLocalInput wrote as the same instant, to the minute', () => {
        const at = new Date(2026, 5, 7, 8, 9);
        expect(localToIso(toLocalInput(at))).toBe(at.toISOString());
    });

    it('is nothing for an empty or unreadable value', () => {
        expect(localToIso('')).toBeUndefined();
        expect(localToIso('not a date')).toBeUndefined();
    });
});

describe('isStatedInTime', () => {
    const now = new Date(2026, 5, 7, 12, 0);

    it('accepts now and the past, not the future, nor an empty value', () => {
        expect(isStatedInTime('2026-06-07T12:00', now)).toBe(true);
        expect(isStatedInTime('2026-06-01T09:00', now)).toBe(true);
        expect(isStatedInTime('2026-06-07T12:01', now)).toBe(false);
        expect(isStatedInTime('', now)).toBe(false);
    });
});
