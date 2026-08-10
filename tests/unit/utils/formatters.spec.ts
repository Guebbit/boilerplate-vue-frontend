/**
 * Display formatters.
 *
 * Written because the first mutation run scored this file 0%: every one of its mutants survived,
 * since nothing in the suite called it at all. These are the functions every detail page renders
 * through, and each one has a fallback branch that only shows up when data is missing — which is
 * exactly the case nobody clicks through by hand.
 */
import { describe, expect, it } from 'vitest';
import {
    EMPTY_VALUE,
    formatText,
    formatDateTime,
    formatCurrency,
    formatFlag
} from '@/utils/formatters';

describe('formatText', () => {
    it('returns the text unchanged when it has content', () => {
        expect(formatText('Gadget')).toBe('Gadget');
    });

    it('falls back for undefined, null and empty strings', () => {
        expect(formatText()).toBe(EMPTY_VALUE);
        // eslint-disable-next-line unicorn/no-null -- the API models absent values as null
        expect(formatText(null)).toBe(EMPTY_VALUE);
        expect(formatText('')).toBe(EMPTY_VALUE);
    });

    it('treats whitespace-only text as empty', () => {
        expect(formatText('   ')).toBe(EMPTY_VALUE);
    });

    it('keeps surrounding whitespace on text that is not blank', () => {
        expect(formatText('  Gadget  ')).toBe('  Gadget  ');
    });
});

describe('formatDateTime', () => {
    it('formats an ISO datetime into a localized string', () => {
        const formatted = formatDateTime('2026-08-05T10:30:00.000Z');

        expect(formatted).not.toBe(EMPTY_VALUE);
        expect(formatted).toContain('2026');
    });

    it('falls back for undefined, null and empty input', () => {
        expect(formatDateTime()).toBe(EMPTY_VALUE);
        // eslint-disable-next-line unicorn/no-null -- the API models absent values as null
        expect(formatDateTime(null)).toBe(EMPTY_VALUE);
        expect(formatDateTime('')).toBe(EMPTY_VALUE);
    });
});

describe('formatCurrency', () => {
    it('formats a number with two decimals and a currency symbol', () => {
        const formatted = formatCurrency(1234.5);

        expect(formatted).toMatch(/1.234[,.]50/);
        expect(formatted).toMatch(/€|EUR/);
    });

    it('honours an explicit currency code', () => {
        expect(formatCurrency(10, 'USD')).toMatch(/\$|USD/);
    });

    it('honours explicit Intl options', () => {
        expect(formatCurrency(10, 'EUR', { minimumFractionDigits: 0 })).not.toContain('.00');
    });

    it('degrades to a plain number format for an invalid currency code', () => {
        const formatted = formatCurrency(10, 'NOT-A-CURRENCY');

        expect(formatted).not.toBe(EMPTY_VALUE);
        expect(formatted).toContain('10');
    });

    it('falls back for anything that is not a number', () => {
        expect(formatCurrency()).toBe(EMPTY_VALUE);
        // eslint-disable-next-line unicorn/no-null -- the API models absent values as null
        expect(formatCurrency(null)).toBe(EMPTY_VALUE);
    });

    it('formats zero rather than treating it as missing', () => {
        expect(formatCurrency(0)).not.toBe(EMPTY_VALUE);
    });
});

describe('formatFlag', () => {
    it('picks the true label', () => {
        expect(formatFlag(true, 'Active', 'Inactive')).toBe('Active');
    });

    it('picks the false label', () => {
        expect(formatFlag(false, 'Active', 'Inactive')).toBe('Inactive');
    });

    it('falls back for undefined and null, which are not "false"', () => {
        expect(formatFlag(undefined, 'Active', 'Inactive')).toBe(EMPTY_VALUE);
        // eslint-disable-next-line unicorn/no-null -- the API models absent values as null
        expect(formatFlag(null, 'Active', 'Inactive')).toBe(EMPTY_VALUE);
    });
});
