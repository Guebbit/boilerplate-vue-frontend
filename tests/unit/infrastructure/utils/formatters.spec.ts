/**
 * Display formatters.
 *
 * Written because the first mutation run scored this file 0%: every one of its mutants survived,
 * since nothing in the suite called it at all. These are the functions every detail page renders
 * through, and each one has a fallback branch that only shows up when data is missing — which is
 * exactly the case nobody clicks through by hand.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    EMPTY_VALUE,
    formatText,
    formatDate,
    formatDateTime,
    formatCurrency,
    formatFlag,
    formatUptime
} from '@/infrastructure/utils/formatters';

describe('formatText', () => {
    it('returns the text unchanged when it has content', () => {
        expect(formatText('Gadget')).toBe('Gadget');
    });

    it('falls back for undefined, null and empty strings', () => {
        expect(formatText()).toBe(EMPTY_VALUE);
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
        expect(formatDateTime(null)).toBe(EMPTY_VALUE);
        expect(formatDateTime('')).toBe(EMPTY_VALUE);
    });
});

describe('formatDate', () => {
    it('formats an ISO datetime into a localized date', () => {
        const formatted = formatDate('2026-08-05T10:30:00.000Z');

        expect(formatted).not.toBe(EMPTY_VALUE);
        expect(formatted).toContain('2026');
    });

    it('drops the time part that formatDateTime keeps', () => {
        // The whole reason both exist: table columns want the date alone. `10:30` must not survive.
        expect(formatDate('2026-08-05T10:30:00.000Z')).not.toContain('30');
    });

    it('falls back for undefined, null and empty input', () => {
        expect(formatDate()).toBe(EMPTY_VALUE);
        expect(formatDate(null)).toBe(EMPTY_VALUE);
        expect(formatDate('')).toBe(EMPTY_VALUE);
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
        expect(formatFlag(null, 'Active', 'Inactive')).toBe(EMPTY_VALUE);
    });
});

describe('formatUptime', () => {
    it('falls back for undefined', () => {
        expect(formatUptime()).toBe(EMPTY_VALUE);
    });

    it('renders minutes alone under an hour', () => {
        expect(formatUptime(300)).toBe('5m');
    });

    it('renders zero minutes rather than treating it as missing', () => {
        expect(formatUptime(0)).toBe('0m');
    });

    it('renders hours and minutes once past an hour', () => {
        expect(formatUptime(7500)).toBe('2h 5m');
    });
});

/**
 * The two bindings this module exists for, asserted at their fallback edge.
 *
 * Both are `||`/`??` expressions whose right-hand side only runs in a configuration the suite
 * never otherwise reaches — an unset env var, an i18n runtime with no active locale. They are one
 * character each and invisible in review, and getting either backwards is not a crash: it is every
 * date on every page silently rendered in the wrong locale, or the fallback glyph printed as the
 * literal string `undefined`.
 */
describe('the app-shaped bindings', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.unstubAllEnvs();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.doUnmock('@/infrastructure/i18n');
    });

    it('falls back to an em dash when VITE_APP_EMPTY_VALUE is unset', async () => {
        vi.stubEnv('VITE_APP_EMPTY_VALUE', undefined as unknown as string);

        const { EMPTY_VALUE: fallback } = await import('@/infrastructure/utils/formatters');

        expect(fallback).toBe('—');
    });

    it('takes the configured glyph when the deployment sets one', async () => {
        vi.stubEnv('VITE_APP_EMPTY_VALUE', 'N/A');

        const { EMPTY_VALUE: configured } = await import('@/infrastructure/utils/formatters');

        expect(configured).toBe('N/A');
    });

    it('passes undefined rather than an empty string when no locale is active', async () => {
        // `Intl` treats `undefined` as "use the runtime default" and `''` as a RangeError, so the
        // `|| undefined` is what keeps a locale-less boot from throwing on the first date.
        vi.doMock('@/infrastructure/i18n', () => ({ getCurrentLocale: () => '' }));

        const { formatDateTime: withoutLocale } = await import('@/infrastructure/utils/formatters');

        expect(() => withoutLocale('2026-08-12T10:00:00.000Z')).not.toThrow();
        expect(withoutLocale('2026-08-12T10:00:00.000Z')).not.toBe(EMPTY_VALUE);
    });
});
