/**
 * @module
 * `useActiveLocales`: `GET /locales` 404s once the paired
 * backend's `locales` module is uninstalled; this proves the composable still leaves a product
 * form with something to render (one fallback-language tab) instead of an empty manifest that
 * keeps the caller's skeleton up forever.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLocales } from '@api';
import { useActiveLocales } from '@/modules/products/composables/use-active-locales.ts';

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getLocales: vi.fn()
}));

beforeEach(() => {
    vi.mocked(getLocales).mockReset();
});

describe('useActiveLocales — GET /locales unavailable', () => {
    it('falls back to one tab for the configured fallback locale, not an empty manifest', async () => {
        vi.mocked(getLocales).mockRejectedValue(new Error('404'));

        const { locales, fallbackLocale, fetchActiveLocales } = useActiveLocales();
        await fetchActiveLocales();

        expect(locales.value).toHaveLength(1);
        expect(locales.value[0]?.tag).toBe('en');
        expect(fallbackLocale.value).toBe('en');
    });

    it('never rejects — a form calling this should not need its own catch', async () => {
        vi.mocked(getLocales).mockRejectedValue(new Error('network down'));

        const { fetchActiveLocales } = useActiveLocales();

        await expect(fetchActiveLocales()).resolves.toBeUndefined();
    });
});

describe('useActiveLocales — GET /locales answers', () => {
    it('uses the real manifest, not the fallback', async () => {
        vi.mocked(getLocales).mockResolvedValue({
            data: {
                locales: [
                    {
                        tag: 'it',
                        name: 'Italian',
                        nativeName: 'Italiano',
                        direction: 'ltr',
                        active: true,
                        tenants: ['frontend'],
                        source: 'static',
                        entryCount: 0,
                        revision: 1
                    }
                ],
                default: 'it',
                fallback: 'it'
            }
        } as Awaited<ReturnType<typeof getLocales>>);

        const { locales, fallbackLocale, fetchActiveLocales } = useActiveLocales();
        await fetchActiveLocales();

        expect(locales.value.map((locale) => locale.tag)).toEqual(['it']);
        expect(fallbackLocale.value).toBe('it');
    });
});
