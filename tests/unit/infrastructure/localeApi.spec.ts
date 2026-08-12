import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Runtime locale discovery — `src/infrastructure/localeApi.ts`.
 *
 * The property every test here defends is the same one: **none of this may ever be load-bearing**.
 * In normal operation the API resolves its own keys and puts finished text on the wire, so the
 * client looks nothing up. These functions exist for the cases where that did not happen, which
 * are by definition the cases where the API is unreliable — so each must resolve, never reject,
 * and the app must be fully usable when all of them return nothing.
 *
 * `@api` is mocked at the network boundary; everything else is real.
 */

const getLocalesMock = vi.fn();
const getLocaleDictionaryMock = vi.fn();

vi.mock('@api', () => ({
    getLocales: () => getLocalesMock(),
    getLocaleDictionary: (locale: string) => getLocaleDictionaryMock(locale)
}));

const { fetchApiLocales, fetchApiDictionary, mergeApiLocales, withApiDictionary } =
    await import('@/infrastructure/localeApi.ts');
const { API_NAMESPACE, supportedLanguages } = await import('@/infrastructure/i18n.ts');

/** `supportedLanguages` is module state shared with the app-wide instance. */
let snapshot: string[] = [];

beforeEach(() => {
    vi.clearAllMocks();
    snapshot = [...supportedLanguages];
    getLocalesMock.mockResolvedValue({ data: { locales: ['en', 'it'] } });
    getLocaleDictionaryMock.mockResolvedValue({ data: { messages: { greeting: 'Ciao' } } });
});

afterEach(() => {
    supportedLanguages.splice(0, Number.POSITIVE_INFINITY, ...snapshot);
});

describe('fetchApiLocales', () => {
    it('returns the languages the API reports', () => {
        return expect(fetchApiLocales()).resolves.toEqual(['en', 'it']);
    });

    it('returns an empty list when the API is unreachable', () => {
        getLocalesMock.mockRejectedValue(new Error('network down'));
        return expect(fetchApiLocales()).resolves.toEqual([]);
    });

    /**
     * An older API, or a different one entirely — these boilerplates are meant to be recombined,
     * so a counterpart without the endpoint is a supported configuration, not a fault.
     */
    it('returns an empty list when the API does not implement the endpoint', () => {
        getLocalesMock.mockResolvedValue({ data: undefined });
        return expect(fetchApiLocales()).resolves.toEqual([]);
    });
});

describe('fetchApiDictionary', () => {
    it('returns the API’s messages', () => {
        return expect(fetchApiDictionary('it'))
            .resolves.toEqual({ greeting: 'Ciao' })
            .then(() => {
                expect(getLocaleDictionaryMock).toHaveBeenCalledWith('it');
            });
    });

    it('returns an empty dictionary rather than rejecting when the fetch fails', () => {
        getLocaleDictionaryMock.mockRejectedValue(new Error('network down'));
        return expect(fetchApiDictionary('it')).resolves.toEqual({});
    });

    it('returns an empty dictionary when the API has no such locale', () => {
        getLocaleDictionaryMock.mockResolvedValue({ data: undefined });
        return expect(fetchApiDictionary('kl')).resolves.toEqual({});
    });
});

describe('mergeApiLocales', () => {
    /**
     * The whole point: a language only the server has must reach the switcher, or it can never be
     * chosen and the API's ability to answer in it is unreachable.
     */
    it('adds a language only the API has', () => {
        supportedLanguages.splice(0, Number.POSITIVE_INFINITY, 'en');
        getLocalesMock.mockResolvedValue({ data: { locales: ['en', 'it', 'es'] } });
        return expect(mergeApiLocales())
            .resolves.toEqual(['it', 'es'])
            .then(() => {
                expect(supportedLanguages).toEqual(['en', 'it', 'es']);
            });
    });

    it('is a union, so a language only this app has survives', () => {
        supportedLanguages.splice(0, Number.POSITIVE_INFINITY, 'en', 'fr');
        getLocalesMock.mockResolvedValue({ data: { locales: ['en', 'it'] } });
        return mergeApiLocales().then(() => {
            expect(supportedLanguages).toContain('fr');
            expect(supportedLanguages).toContain('it');
        });
    });

    it('adds nothing twice', () => {
        supportedLanguages.splice(0, Number.POSITIVE_INFINITY, 'en', 'it');
        return mergeApiLocales()
            .then(() => {
                return mergeApiLocales();
            })
            .then(() => {
                expect(supportedLanguages).toEqual(['en', 'it']);
            });
    });

    /**
     * Boot must not depend on the API being up. `main.ts` awaits this before the first
     * navigation, so a rejection here would be a blank page rather than a degraded one.
     */
    it('leaves the build-time list intact when the API is unreachable', () => {
        supportedLanguages.splice(0, Number.POSITIVE_INFINITY, 'en', 'it');
        getLocalesMock.mockRejectedValue(new Error('network down'));
        return expect(mergeApiLocales())
            .resolves.toEqual([])
            .then(() => {
                expect(supportedLanguages).toEqual(['en', 'it']);
            });
    });
});

describe('withApiDictionary', () => {
    it('nests the API’s keys under the reserved namespace', () => {
        return withApiDictionary('it', { greeting: 'Ciao dalla UI' }).then((merged) => {
            expect(merged.greeting).toBe('Ciao dalla UI');
            expect(merged[API_NAMESPACE]).toEqual({ greeting: 'Ciao' });
        });
    });

    /**
     * Two independently-authored keyspaces will eventually pick the same key. Namespacing is what
     * makes that a non-event instead of a silent overwrite decided by load order.
     */
    it('cannot overwrite this app’s own copy', () => {
        getLocaleDictionaryMock.mockResolvedValue({
            data: { messages: { greeting: 'from the API' } }
        });
        return withApiDictionary('it', { greeting: 'from the UI' }).then((merged) => {
            expect(merged.greeting).toBe('from the UI');
        });
    });

    it('still returns this app’s copy when the API dictionary cannot be fetched', () => {
        getLocaleDictionaryMock.mockRejectedValue(new Error('network down'));
        return withApiDictionary('it', { greeting: 'Ciao dalla UI' }).then((merged) => {
            expect(merged.greeting).toBe('Ciao dalla UI');
            expect(merged[API_NAMESPACE]).toEqual({});
        });
    });
});
