/**
 * Money as decimal text — `src/infrastructure/utils/money.ts`. The expected values are worked out
 * by hand from the inputs (minor units), not read back off the code.
 */
import { describe, expect, it } from 'vitest';
import {
    NON_NEGATIVE_DECIMAL,
    boundOf,
    compareDecimals,
    decimalScale,
    fromMinor,
    isDecimal,
    multiplyDecimal,
    normalizeAmount,
    padDecimal,
    sumDecimals,
    toMinor,
    zeroDecimal
} from '@/infrastructure/utils/money';

describe('decimalScale', () => {
    it.each([
        ['19.90', 2],
        ['1000', 0],
        ['1.500', 3],
        ['-0.05', 2],
        ['not money', 0]
    ])('reads the places of %s as %s', (text, scale) => {
        expect(decimalScale(text)).toBe(scale);
    });
});

describe('toMinor / fromMinor', () => {
    it.each([
        ['19.90', 1990n, 2],
        ['0.00', 0n, 2],
        ['1000', 1000n, 0],
        ['1.500', 1500n, 3],
        ['-5.25', -525n, 2],
        ['0.005', 5n, 3]
    ])('%s is %s minor units and back', (text, minor, scale) => {
        expect(toMinor(text)).toBe(minor);
        expect(fromMinor(minor, scale)).toBe(text);
    });

    it('keeps digits a float would lose', () => {
        expect(fromMinor(toMinor('9007199254740993.01'), 2)).toBe('9007199254740993.01');
    });
});

describe('multiplyDecimal', () => {
    it.each([
        ['0.10', 3, '0.30'],
        ['19.99', 3, '59.97'],
        ['1.13', 100, '113.00'],
        ['500', 3, '1500'],
        ['1.234', 2, '2.468']
    ])('prices %s × %s as %s, with no float drift', (unit, quantity, total) => {
        expect(multiplyDecimal(unit, quantity)).toBe(total);
    });
});

describe('sumDecimals', () => {
    it('adds exactly what a float would not (0.1 + 0.2)', () => {
        expect(sumDecimals(['0.10', '0.20'])).toBe('0.30');
    });

    it('writes the result at the widest scale among the inputs', () => {
        expect(sumDecimals(['1.5', '0.25'])).toBe('1.75');
    });

    it('adds a signed amount', () => {
        expect(sumDecimals(['10.00', '-2.50'])).toBe('7.50');
    });

    it('is a bare zero for no amounts', () => {
        expect(sumDecimals([])).toBe('0');
    });
});

describe('compareDecimals', () => {
    it('treats "71" and "71.00" as equal', () => {
        expect(compareDecimals('71', '71.00')).toBe(0);
    });

    it.each([
        ['0.00', '0', 0],
        ['1.01', '1.1', -1],
        ['2', '1.999', 1],
        ['-1', '0', -1]
    ])('compares %s with %s as %s', (a, b, order) => {
        expect(compareDecimals(a, b)).toBe(order);
    });
});

describe('zeroDecimal', () => {
    it.each([
        [0, '0'],
        [2, '0.00'],
        [3, '0.000']
    ])('writes zero at %s places as %s', (scale, text) => {
        expect(zeroDecimal(scale)).toBe(text);
    });
});

describe('padDecimal', () => {
    it.each([
        ['12.5', 2, '12.50'],
        ['12', 2, '12.00'],
        ['1', 3, '1.000'],
        ['12.50', 2, '12.50']
    ])('pads %s to %s places as %s', (text, scale, padded) => {
        expect(padDecimal(text, scale)).toBe(padded);
    });

    it('leaves an over-scale amount as typed, so the server can refuse it', () => {
        expect(padDecimal('12.505', 2)).toBe('12.505');
    });

    it('leaves text that is not a decimal as typed', () => {
        expect(padDecimal('abc', 2)).toBe('abc');
    });
});

describe('isDecimal / NON_NEGATIVE_DECIMAL / boundOf', () => {
    it('accepts a signed decimal and nothing looser', () => {
        expect(isDecimal('-1.5')).toBe(true);
        expect(isDecimal('1e3')).toBe(false);
        expect(isDecimal('1,5')).toBe(false);
        expect(isDecimal('')).toBe(false);
    });

    it('refuses a negative amount', () => {
        expect(NON_NEGATIVE_DECIMAL.test('-1')).toBe(false);
        expect(NON_NEGATIVE_DECIMAL.test('1.50')).toBe(true);
    });

    it('trims a bound and drops one that is blank or not a decimal', () => {
        expect(boundOf(' 5.5 ')).toBe('5.5');
        expect(boundOf('')).toBeUndefined();
        expect(boundOf(undefined)).toBeUndefined();
        expect(boundOf('abc')).toBeUndefined();
        expect(boundOf('-3')).toBeUndefined();
    });
});

describe('normalizeAmount', () => {
    it.each([
        ['it', '41,50', '41.50'],
        ['it', '1.234,50', '1234.50'],
        ['en', '1,234.50', '1234.50'],
        ['en', ' 41.5 ', '41.5'],
        ['it', '12', '12'],
        ['it', '1.234', '1234'],
        ['en', '1,234,567.5', '1234567.5']
    ])('reads %s %j as %s', (locale, typed, plain) => {
        expect(normalizeAmount(typed, locale)).toBe(plain);
    });

    it.each([
        ['en', 'abc'],
        ['it', '1,2,3'],
        ['en', '12..5'],
        ['en', '']
    ])(
        'still refuses garbage (%s %j): the pattern check rejects what comes back',
        (locale, typed) => {
            expect(NON_NEGATIVE_DECIMAL.test(normalizeAmount(typed, locale))).toBe(false);
        }
    );

    it('lets boundOf take a filter typed in the viewer format', () => {
        expect(boundOf('1.234,5', 'it')).toBe('1234.5');
        expect(boundOf('abc', 'it')).toBeUndefined();
        expect(boundOf('41.50', 'it')).toBeUndefined();
        expect(boundOf('41,50', 'en')).toBeUndefined();
    });
});
