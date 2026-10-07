/**
 * @module
 * What `VITE_CART_STOCK_POLL_SECONDS` means: a positive whole number of seconds turns the poll on,
 * and every other value, however it is spelled, leaves it off.
 */
import { describe, expect, it } from 'vitest';
import { stockPollIntervalMs } from '../domain';

describe('stockPollIntervalMs', () => {
    it.each([
        ['1', 1000],
        ['30', 30_000],
        [' 5 ', 5000],
        ['2147483', 2_147_483_000]
    ])('reads "%s" as %i ms', (raw, ms) => {
        expect(stockPollIntervalMs(raw)).toBe(ms);
    });

    it.each([
        ['unset', undefined],
        ['empty', ''],
        ['blank', '   '],
        ['zero', '0'],
        ['negative', '-5'],
        ['fractional', '2.5'],
        ['not a number', 'often'],
        ['a number with a unit', '30s'],
        ['not finite', 'Infinity'],
        ['not a number at all', 'NaN'],
        ['hexadecimal', '0x10'],
        ['in exponent form', '1e1'],
        ['signed', '+5'],
        ['too long for a timer, which would fire at once', '2147484']
    ])('turns the poll off for a value that is %s', (_name, raw) => {
        expect(stockPollIntervalMs(raw)).toBeUndefined();
    });
});
