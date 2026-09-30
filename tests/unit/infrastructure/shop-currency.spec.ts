/**
 * @module
 * `shop-currency`: one request however many readers ask, empty until known, retried after a
 * failure — never a guessed default.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProductSettings } from '@api';
import {
    loadShopCurrency,
    resetShopCurrency,
    shopCurrency
} from '@/infrastructure/shop-currency.ts';

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getProductSettings: vi.fn()
}));

vi.mock('@/infrastructure/utils/logger.ts', () => ({ logger: { error: vi.fn() } }));

beforeEach(() => {
    resetShopCurrency();
    vi.mocked(getProductSettings).mockReset();
});

describe('shopCurrency', () => {
    it('is empty until the read lands, not a guessed EUR', () => {
        expect(shopCurrency.value).toBe('');
    });

    it('holds the currency the API reported', async () => {
        vi.mocked(getProductSettings).mockResolvedValue({
            data: { currency: 'JPY' }
        } as Awaited<ReturnType<typeof getProductSettings>>);

        await expect(loadShopCurrency()).resolves.toBe('JPY');
        expect(shopCurrency.value).toBe('JPY');
    });

    it('asks once for concurrent and repeated readers', async () => {
        vi.mocked(getProductSettings).mockResolvedValue({
            data: { currency: 'GBP' }
        } as Awaited<ReturnType<typeof getProductSettings>>);

        await Promise.all([loadShopCurrency(), loadShopCurrency()]);
        await loadShopCurrency();

        expect(getProductSettings).toHaveBeenCalledTimes(1);
    });

    it('never rejects, stays empty, and asks again on the next call', async () => {
        vi.mocked(getProductSettings).mockRejectedValueOnce(new Error('offline'));

        await expect(loadShopCurrency()).resolves.toBe('');
        expect(shopCurrency.value).toBe('');

        vi.mocked(getProductSettings).mockResolvedValue({
            data: { currency: 'USD' }
        } as Awaited<ReturnType<typeof getProductSettings>>);
        await expect(loadShopCurrency()).resolves.toBe('USD');
    });
});
