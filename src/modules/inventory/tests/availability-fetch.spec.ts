/**
 * @module
 * `fetchAvailability`: one batched read per hundred ids, a caller-chosen freshness, and the
 * difference between "not asked yet" and "the server left it out", written to the kernel port.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { listProductAvailability } from '@api';
import type { ProductAvailability } from '@types';
import {
    availabilityOf,
    availabilityAskedAt,
    clearAvailability,
    isLeftOut,
    recordAvailability
} from '@/modules/products';
import { fetchAvailability } from '../composables/use-watch-availability';

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@api')>()),
    listProductAvailability: vi.fn()
}));

/**
 * What the server answers for the ids asked: each one in stock, except the ones named in `leaveOut`.
 *
 * @param leaveOut - Ids the server omits (unknown, or hidden from this viewer).
 */
const answerWith = (leaveOut: string[] = []) =>
    vi.mocked(listProductAvailability).mockImplementation((parameters) =>
        Promise.resolve({
            items: (parameters?.id ?? [])
                .filter((id) => !leaveOut.includes(id))
                .map((productId): ProductAvailability => ({ productId, availability: 'in_stock' }))
        })
    );

beforeEach(() => {
    clearAvailability();
    vi.mocked(listProductAvailability).mockReset();
});

describe('fetchAvailability', () => {
    it('stores each answer under its product id', async () => {
        answerWith();

        await fetchAvailability(['a', 'b'], 0);

        expect(availabilityOf('a')).toEqual({ productId: 'a', availability: 'in_stock' });
        expect(availabilityOf('b')?.availability).toBe('in_stock');
    });

    it('tells a product the server left out from one that was never asked', async () => {
        answerWith(['gone']);

        await fetchAvailability(['kept', 'gone'], 0);

        expect(isLeftOut('gone')).toBe(true);
        expect(availabilityOf('gone')).toBeUndefined();
        expect(isLeftOut('never-asked')).toBe(false);
        expect(isLeftOut('kept')).toBe(false);
    });

    it('asks once for duplicates', async () => {
        answerWith();

        await fetchAvailability(['a', 'a', 'a'], 0);

        expect(listProductAvailability).toHaveBeenCalledTimes(1);
        expect(listProductAvailability).toHaveBeenCalledWith({ id: ['a'] });
    });

    it('splits more than a hundred ids into requests of at most a hundred', async () => {
        answerWith();
        const ids = Array.from({ length: 250 }, (_, index) => `p${index}`);

        await fetchAvailability(ids, 0);

        expect(
            vi
                .mocked(listProductAvailability)
                .mock.calls.map(([parameters]) => parameters?.id?.length)
        ).toEqual([100, 100, 50]);
    });

    it('records when each product was asked', async () => {
        answerWith();

        await fetchAvailability(['a'], 0);

        expect(availabilityAskedAt('a')).toBeGreaterThan(0);
    });

    it('asks nothing for no ids', async () => {
        await fetchAvailability([], 0);

        expect(listProductAvailability).not.toHaveBeenCalled();
    });
});

describe('freshness', () => {
    it('does not read again what is younger than the caller allows', async () => {
        answerWith();
        await fetchAvailability(['a'], 30_000);

        await fetchAvailability(['a'], 30_000);

        expect(listProductAvailability).toHaveBeenCalledTimes(1);
    });

    it('reads again every time for a caller that allows no age at all', async () => {
        answerWith();
        await fetchAvailability(['a'], 0);

        await fetchAvailability(['a'], 0);

        expect(listProductAvailability).toHaveBeenCalledTimes(2);
    });

    it('reads again what is older than the caller allows, and only that', async () => {
        answerWith();
        await fetchAvailability(['old'], 0);
        recordAvailability('old', availabilityOf('old'), Date.now() - 31_000);
        await fetchAvailability(['fresh'], 0);
        vi.mocked(listProductAvailability).mockClear();

        await fetchAvailability(['old', 'fresh'], 30_000);

        expect(listProductAvailability).toHaveBeenCalledTimes(1);
        expect(listProductAvailability).toHaveBeenCalledWith({ id: ['old'] });
    });
});

describe('a failed read', () => {
    it('rejects and keeps what was stored before', async () => {
        answerWith();
        await fetchAvailability(['a'], 0);
        vi.mocked(listProductAvailability).mockRejectedValue(new Error('network down'));

        await expect(fetchAvailability(['a'], 0)).rejects.toThrow('network down');

        expect(availabilityOf('a')?.availability).toBe('in_stock');
    });
});
