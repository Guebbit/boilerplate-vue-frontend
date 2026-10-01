/**
 * `scripts/e2e/cents.ts` — money read off a screen as an integer, so two amounts can be compared
 * without caring how each locale spells them.
 */
import { describe, expect, it } from 'vitest';
import { cents, sumCents } from '../../../../scripts/e2e/cents';

describe('cents', () => {
    it.each([
        ['€85.00', 8500],
        ['85,00 €', 8500],
        ['€1,234.50', 123_450],
        ['1.234,50 €', 123_450],
        ['Shipping Standard — €5.00', 500]
    ])('reads %s as %d', (text, expected) => {
        expect(cents(text)).toBe(expected);
    });

    it('names the text it could not read when there is no digit', () => {
        expect(() => cents('free')).toThrow('no amount in "free"');
    });
});

describe('sumCents', () => {
    it('adds amounts however each is spelled', () => {
        expect(sumCents(['€71.00', '9,00 €'])).toBe(8000);
    });

    it('is zero for no amounts', () => {
        expect(sumCents([])).toBe(0);
    });

    it('refuses a text with no amount rather than counting it as zero', () => {
        expect(() => sumCents(['€1.00', 'n/a'])).toThrow('no amount');
    });
});
