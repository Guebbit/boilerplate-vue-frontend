/**
 * @module
 * `shop`: one request however many readers ask, empty until known, retried after a failure —
 * never a guessed default.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getShop } from '@api';
import { loadShop, resetShop, shipToCountries, shopCurrency } from '@/infrastructure/shop.ts';
import { aShop } from '../../support/unit/fixtures.ts';

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getShop: vi.fn()
}));

vi.mock('@/infrastructure/utils/logger.ts', () => ({ logger: { error: vi.fn() } }));

/** What `getShop` resolves to for a shop with these fields. */
const answering = (overrides: Parameters<typeof aShop>[0]) =>
    ({ data: aShop(overrides) }) as Awaited<ReturnType<typeof getShop>>;

beforeEach(() => {
    resetShop();
    vi.mocked(getShop).mockReset();
});

describe('the shop store', () => {
    it('is empty until the read lands, not a guessed EUR', () => {
        expect(shopCurrency.value).toBe('');
        expect(shipToCountries.value).toEqual([]);
    });

    it('holds the currency and the ship-to countries the API reported', async () => {
        vi.mocked(getShop).mockResolvedValue(
            answering({ currency: 'JPY', shipToCountries: ['JP'] })
        );

        await expect(loadShop()).resolves.toMatchObject({ currency: 'JPY' });
        expect(shopCurrency.value).toBe('JPY');
        expect(shipToCountries.value).toEqual(['JP']);
    });

    it('asks once for concurrent and repeated readers', async () => {
        vi.mocked(getShop).mockResolvedValue(answering({ currency: 'GBP' }));

        await Promise.all([loadShop(), loadShop()]);
        await loadShop();

        expect(getShop).toHaveBeenCalledTimes(1);
    });

    it('never rejects, stays empty, and asks again on the next call', async () => {
        vi.mocked(getShop).mockRejectedValueOnce(new Error('offline'));

        await expect(loadShop()).resolves.toBeUndefined();
        expect(shopCurrency.value).toBe('');

        vi.mocked(getShop).mockResolvedValue(answering({ currency: 'USD' }));
        await expect(loadShop()).resolves.toMatchObject({ currency: 'USD' });
    });
});
