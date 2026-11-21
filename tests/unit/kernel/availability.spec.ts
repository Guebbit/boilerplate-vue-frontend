/**
 * @module
 * The kernel's availability port: one writer records what the server answered, readers follow it,
 * "left out" is not "never asked", and clearing empties everything.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
    availabilityAskedAt,
    availabilityOf,
    clearAvailability,
    isLeftOut,
    recordAvailability,
    recordStockCount,
    stockCountOf
} from '@/kernel/availability.ts';

afterEach(clearAvailability);

describe('the availability port', () => {
    it('hands a reader the answer recorded for its product, and when it was asked', () => {
        recordAvailability('a', { productId: 'a', availability: 'in_stock' }, 1000);

        expect(availabilityOf('a')).toEqual({ productId: 'a', availability: 'in_stock' });
        expect(availabilityAskedAt('a')).toBe(1000);
        expect(availabilityOf('b')).toBeUndefined();
        expect(availabilityAskedAt('b')).toBeUndefined();
    });

    it('tells a product the server left out from one never asked', () => {
        recordAvailability('gone', undefined, 5);

        expect(isLeftOut('gone')).toBe(true);
        expect(availabilityOf('gone')).toBeUndefined();
        expect(isLeftOut('never-asked')).toBe(false);
    });

    it('replaces an answer with the next one', () => {
        recordAvailability('a', { productId: 'a', availability: 'in_stock' }, 1);

        recordAvailability('a', { productId: 'a', availability: 'out_of_stock' }, 2);

        expect(availabilityOf('a')?.availability).toBe('out_of_stock');
        expect(isLeftOut('a')).toBe(false);
    });

    it('keeps a stock reader’s shelf count apart, and forgets it with undefined', () => {
        recordStockCount('a', 4);
        expect(stockCountOf('a')).toBe(4);

        recordStockCount('a', undefined);
        expect(stockCountOf('a')).toBeUndefined();
    });

    it('empties every answer and count when the viewer is gone', () => {
        recordAvailability('a', { productId: 'a', availability: 'in_stock' }, 1);
        recordStockCount('a', 4);

        clearAvailability();

        expect(availabilityOf('a')).toBeUndefined();
        expect(availabilityAskedAt('a')).toBeUndefined();
        expect(stockCountOf('a')).toBeUndefined();
    });
});
