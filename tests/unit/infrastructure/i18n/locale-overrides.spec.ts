import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Runtime locale discovery and the override tier — `src/infrastructure/i18n/locale-overrides.ts`.
 *
 * The property every test here defends is the same one: **none of this may ever be load-bearing**.
 * The bundled `src/locales/*.json` is the floor, and every function below must degrade to it — so
 * each resolves, never rejects, and the app is fully usable when all of them return nothing.
 *
 * The second property is the merge itself: overrides win PER KEY and the merge is DEEP. A shallow
 * one would let a single edited string delete every sibling under its group, which is the failure
 * this tier is most likely to ship with and the one nobody would report as a merge bug.
 *
 * `@api` is mocked at the network boundary; everything else is real.
 */

const getLocalesMock = vi.fn();
const getLocaleMessagesMock = vi.fn();

vi.mock('@api', async (importOriginal) => ({
    // The generated const objects are not network calls — the module under test may compare
    // against them, so the real ones have to survive the mock.
    ...(await importOriginal<Record<string, unknown>>()),
    getLocales: () => getLocalesMock(),
    getLocaleMessages: (locale: string, parameters?: { tenant?: string }) =>
        getLocaleMessagesMock(locale, parameters)
}));

const {
    fetchRemoteLocales,
    fetchLocaleOverrides,
    mergeRemoteLocales,
    mergeDictionaries,
    withLocaleOverrides
} = await import('@/infrastructure/i18n/locale-overrides.ts');
const { supportedLanguages } = await import('@/infrastructure/i18n');

/** `supportedLanguages` is module state shared with the app-wide instance. */
let snapshot: string[] = [];

/**
 * A capability row as `GET /locales` publishes one.
 *
 * The endpoint answers CAPABILITIES, not bare tags: `tenants` says whether the API can answer in
 * that language (`api`), whether a dictionary can be downloaded for it (`app`), or both.
 *
 * @param tag - the language tag
 * @param tenants - which tenants have words in that language
 * @returns the capability row
 */
const capability = (tag: string, tenants: string[] = ['demo-be', 'demo-fe']) => ({
    tag,
    name: tag,
    nativeName: tag,
    direction: 'ltr',
    tenants,
    source: 'both'
});

beforeEach(() => {
    vi.clearAllMocks();
    snapshot = [...supportedLanguages];
    getLocalesMock.mockResolvedValue({
        data: { locales: [capability('en'), capability('it')], default: 'en', fallback: 'en' }
    });
    getLocaleMessagesMock.mockResolvedValue({ data: { messages: { greeting: 'Ciao' } } });
});

afterEach(() => {
    supportedLanguages.splice(0, Number.POSITIVE_INFINITY, ...snapshot);
});

describe('fetchRemoteLocales', () => {
    it('returns the languages the API reports', () => {
        return expect(fetchRemoteLocales()).resolves.toEqual(['en', 'it']);
    });

    /**
     * Both tenants belong in the switcher, and they are different offers — the frontend translates the
     * interface, `api` translates what the API says. A language with one and not the other is
     * half-usable, which is a state a person chose and not one to filter away: see the note on
     * `fetchRemoteLocales` about why nothing here reconciles the two sides.
     */
    it.each([
        ['downloadable only', ['demo-fe']],
        ['answerable only', ['demo-be']],
        ['both', ['demo-be', 'demo-fe']]
    ])('keeps a language that is %s', (_label, tenants) => {
        getLocalesMock.mockResolvedValue({ data: { locales: [capability('es', tenants)] } });
        return expect(fetchRemoteLocales()).resolves.toEqual(['es']);
    });

    it('drops a language that claims no tenant at all', () => {
        getLocalesMock.mockResolvedValue({
            data: { locales: [capability('en'), { ...capability('es'), tenants: [] }] }
        });
        return expect(fetchRemoteLocales()).resolves.toEqual(['en']);
    });

    it('returns an empty list when the API is unreachable', () => {
        getLocalesMock.mockRejectedValue(new Error('network down'));
        return expect(fetchRemoteLocales()).resolves.toEqual([]);
    });

    /**
     * An older API, or a different one entirely — these boilerplates are meant to be recombined,
     * so a counterpart without the endpoint is a supported configuration, not a fault.
     */
    it('returns an empty list when the API does not implement the endpoint', () => {
        getLocalesMock.mockResolvedValue({ data: undefined });
        return expect(fetchRemoteLocales()).resolves.toEqual([]);
    });
});

describe('fetchLocaleOverrides', () => {
    it('returns what has been edited for that language', () => {
        return expect(fetchLocaleOverrides('it'))
            .resolves.toEqual({ greeting: 'Ciao' })
            .then(() => {
                // Named tenant: the API builds THIS frontend's dictionary, never another client's.
                expect(getLocaleMessagesMock).toHaveBeenCalledWith('it', { tenant: 'demo-fe' });
            });
    });

    it('returns nothing rather than rejecting when the fetch fails', () => {
        getLocaleMessagesMock.mockRejectedValue(new Error('network down'));
        return expect(fetchLocaleOverrides('it')).resolves.toEqual({});
    });

    /**
     * A 404 is the ordinary answer for a language nobody has edited, and for a deactivated one.
     * Both mean the same thing to a client, which is why neither is treated as a failure.
     */
    it('returns nothing when the API has no such locale', () => {
        getLocaleMessagesMock.mockResolvedValue({ data: undefined });
        return expect(fetchLocaleOverrides('kl')).resolves.toEqual({});
    });
});

describe('mergeRemoteLocales', () => {
    it('adds a language the API offers and this build does not bundle', () => {
        getLocalesMock.mockResolvedValue({
            data: { locales: [capability('en'), capability('es')] }
        });

        return mergeRemoteLocales().then((added) => {
            expect(added).toEqual(['es']);
            expect(supportedLanguages).toContain('es');
        });
    });

    it('adds nothing twice, however often it runs', () => {
        getLocalesMock.mockResolvedValue({ data: { locales: [capability('es')] } });

        return mergeRemoteLocales()
            .then(() => mergeRemoteLocales())
            .then(() => {
                expect(supportedLanguages.filter((locale) => locale === 'es')).toHaveLength(1);
            });
    });

    it('leaves the bundled languages alone when the API is unreachable', () => {
        getLocalesMock.mockRejectedValue(new Error('network down'));

        return mergeRemoteLocales().then((added) => {
            expect(added).toEqual([]);
            expect(supportedLanguages).toEqual(snapshot);
        });
    });
});

describe('mergeDictionaries', () => {
    it('lets an override win over the bundled value', () => {
        expect(mergeDictionaries({ greeting: 'Hello' }, { greeting: 'Hi' })).toEqual({
            greeting: 'Hi'
        });
    });

    it('keeps a bundled key nobody has edited', () => {
        expect(
            mergeDictionaries({ greeting: 'Hello', farewell: 'Bye' }, { greeting: 'Hi' })
        ).toEqual({ greeting: 'Hi', farewell: 'Bye' });
    });

    /**
     * The regression this whole function exists to prevent. An override names ONE leaf, and a
     * shallow assign would replace its entire group — twenty untouched keys deleted by editing
     * one, with nothing to show for it but missing text on an unrelated screen.
     */
    it('descends into a group instead of replacing it', () => {
        expect(
            mergeDictionaries(
                { navigation: { home: 'Home', menu: 'Menu', language: 'Language' } },
                { navigation: { home: 'Inicio' } }
            )
        ).toEqual({ navigation: { home: 'Inicio', menu: 'Menu', language: 'Language' } });
    });

    it('adds a group the bundle does not have at all', () => {
        expect(mergeDictionaries({ greeting: 'Hello' }, { cart: { title: 'Carrito' } })).toEqual({
            greeting: 'Hello',
            cart: { title: 'Carrito' }
        });
    });

    /**
     * An array is a leaf. `tm()` renders these as whole lists — the static pages' paragraphs and
     * FAQs — so merging two by index would splice one language into the middle of another.
     */
    it('replaces an array whole rather than merging it by index', () => {
        expect(mergeDictionaries({ faq: ['one', 'two', 'three'] }, { faq: ['uno'] })).toEqual({
            faq: ['uno']
        });
    });

    /**
     * `base` is the imported JSON module object, shared with every other consumer of that import
     * for the life of the page. Writing into it would translate the bundle itself.
     */
    it('does not mutate either input', () => {
        const base = { navigation: { home: 'Home' } };
        const overrides = { navigation: { home: 'Inicio' } };

        mergeDictionaries(base, overrides);

        expect(base).toEqual({ navigation: { home: 'Home' } });
        expect(overrides).toEqual({ navigation: { home: 'Inicio' } });
    });
});

describe('withLocaleOverrides', () => {
    it('layers what has been edited over what was bundled', () => {
        getLocaleMessagesMock.mockResolvedValue({
            data: { messages: { greeting: 'Ciao dal database' } }
        });

        return withLocaleOverrides('it', { greeting: 'Ciao', farewell: 'Addio' }).then((merged) => {
            expect(merged).toEqual({ greeting: 'Ciao dal database', farewell: 'Addio' });
        });
    });

    /**
     * A language this build ships no file for. The overrides ARE the dictionary, and everything
     * they do not carry is left for `fallbackLocale` to answer key by key.
     */
    it('is the whole dictionary for a language the bundle does not have', () => {
        getLocaleMessagesMock.mockResolvedValue({
            data: { messages: { navigation: { home: 'Inicio' } } }
        });

        return withLocaleOverrides('es', {}).then((merged) => {
            expect(merged).toEqual({ navigation: { home: 'Inicio' } });
        });
    });

    it('still returns the bundled copy when the overrides cannot be fetched', () => {
        getLocaleMessagesMock.mockRejectedValue(new Error('network down'));

        return withLocaleOverrides('it', { greeting: 'Ciao' }).then((merged) => {
            expect(merged).toEqual({ greeting: 'Ciao' });
        });
    });
});
