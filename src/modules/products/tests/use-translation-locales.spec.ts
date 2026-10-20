/**
 * @module
 * `useTranslationLocales`: `GET /locales` 404s once the paired
 * backend's `locales` module is uninstalled; this proves the composable still leaves a product
 * form with something to render (one fallback-language tab) instead of an empty manifest that
 * keeps the caller's skeleton up forever.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLocales } from '@api';
import { useTranslationLocales } from '../composables/use-translation-locales.ts';

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getLocales: vi.fn()
}));

beforeEach(() => {
    vi.mocked(getLocales).mockReset();
});

describe('useTranslationLocales — GET /locales unavailable', () => {
    it('falls back to one tab for the configured fallback locale, not an empty manifest', async () => {
        vi.mocked(getLocales).mockRejectedValue(new Error('404'));

        const { locales, fallbackLocale, fetchTranslationLocales } = useTranslationLocales();
        await fetchTranslationLocales();

        expect(locales.value).toHaveLength(1);
        expect(locales.value[0]?.tag).toBe('en');
        expect(fallbackLocale.value).toBe('en');
    });

    it('never rejects — a form calling this should not need its own catch', async () => {
        vi.mocked(getLocales).mockRejectedValue(new Error('network down'));

        const { fetchTranslationLocales } = useTranslationLocales();

        await expect(fetchTranslationLocales()).resolves.toBeUndefined();
    });
});

/** One manifest row, as `GET /locales` reports it. */
const row = (tag: string, active: boolean) => ({
    tag,
    name: tag,
    nativeName: tag.toUpperCase(),
    direction: 'ltr',
    active,
    apps: ['frontend'],
    source: 'dynamic',
    entryCount: 0,
    revision: 1
});

describe('useTranslationLocales — GET /locales answers', () => {
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
                        apps: ['frontend'],
                        source: 'static',
                        entryCount: 0,
                        revision: 1
                    }
                ],
                default: 'it',
                fallback: 'it'
            }
        } as Awaited<ReturnType<typeof getLocales>>);

        const { locales, fallbackLocale, fetchTranslationLocales } = useTranslationLocales();
        await fetchTranslationLocales();

        expect(locales.value.map((locale) => locale.tag)).toEqual(['it']);
        expect(fallbackLocale.value).toBe('it');
    });

    it('keeps a language switched off, so an editor can start a draft in it', async () => {
        vi.mocked(getLocales).mockResolvedValue({
            data: { locales: [row('en', true), row('fr', false)], default: 'en', fallback: 'en' }
        } as Awaited<ReturnType<typeof getLocales>>);

        const { locales, fetchTranslationLocales } = useTranslationLocales();
        await fetchTranslationLocales();

        expect(locales.value.map(({ tag, active }) => [tag, active])).toEqual([
            ['en', true],
            ['fr', false]
        ]);
    });
});
