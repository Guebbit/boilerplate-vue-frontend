import { getLocales, getLocaleMessages } from '@api';
import { supportedLanguages, type TranslationDictionaries } from './index.ts';

/**
 * The runtime half of this app's dictionaries: which languages exist, and what has been edited.
 *
 * ## Files are defaults, the database overrides them
 *
 * `src/locales/*.json` is what this build renders with no network — every key, in the languages
 * that shipped. The API stores OVERRIDES of those same keys, edited by people who never open a
 * code editor, and {@link withLocaleOverrides} merges them on top per key. A key nobody has
 * touched keeps its bundled text; a language nobody bundled arrives as overrides alone and falls
 * back per key for the rest. That is why a half-translated language is a usable state here rather
 * than a broken one.
 *
 * ## Nothing here may be load-bearing
 *
 * Every function RESOLVES rather than rejects, and the app is fully usable when all of them return
 * nothing — that is the offline floor the bundled files exist to be. A locale switch must never be
 * blocked by an API that is slow, old or absent.
 *
 * ## What this does NOT fetch
 *
 * The API's own dictionary. It resolves its own keys and puts finished text on the wire, so a
 * response already arrives translated and there is nothing for a client to look up. Its overrides
 * (`api`-scoped rows) are layered onto its files inside the API and never leave it — a frontend
 * that merged them would be adopting the backend's keyspace as its own, and both sides declare a
 * top-level `generic`. See `docs/theory/layers.md`.
 */

/**
 * Languages the deployment offers, from the API's manifest.
 *
 * Both scopes are kept, and they answer different questions. `app` means a dictionary can be
 * downloaded for it; `api` means the API can ANSWER in it. A language with only `api` still
 * belongs in the switcher — the UI falls back per key while every error message arrives in the
 * right language — and a language with only `app` is the opposite: the interface translates and
 * the API answers in the fallback.
 *
 * NEITHER IS CHECKED AGAINST THE OTHER, deliberately. This app can bundle `it.json` while the API
 * has no Italian at all, in which case the interface is Italian and the API's messages arrive in
 * its fallback. That inconsistency is a HUMAN decision — someone wanted the interface translated
 * and did not care about the backend's half — so nothing here prevents it or warns about it. If it
 * is ever wrong, it is wrong in a way only a person can judge.
 *
 * @returns The API's language tags, or an empty list when it cannot be reached. Never rejects.
 */
export const fetchRemoteLocales = (): Promise<string[]> =>
    getLocales()
        .then((response) =>
            response.data.locales
                .filter(
                    (language) =>
                        // Every scope is `app` or `api`, so "offers either dictionary" is "offers any".
                        language.scopes.length > 0
                )
                .map((language) => language.tag)
        )
        .catch(() => []);

/**
 * The edited overrides for one language, nested exactly like a bundled dictionary.
 *
 * A 404 is an ordinary answer, not a failure: it is what an unknown or deactivated language
 * returns, and both mean "nothing has been edited here".
 *
 * @param locale - Language tag to ask for.
 * @returns The overrides, or an empty dictionary. Never rejects.
 */
export const fetchLocaleOverrides = (locale: string): Promise<TranslationDictionaries> =>
    getLocaleMessages(locale)
        .then((response) => response.data.messages as TranslationDictionaries)
        .catch(() => ({}));

/**
 * Adds any language the API offers and this build does not bundle to {@link supportedLanguages}.
 *
 * The union, not a replacement: the folder scan stays the offline default, so a build with no
 * network still offers everything it shipped. A language only the API knows about appears in the
 * switcher and degrades per key rather than all-or-nothing.
 *
 * Mutates the exported array rather than returning a new one, because `supportedLanguages` is
 * imported by value in a dozen places and reassigning the binding would leave them on the old list.
 *
 * @returns The languages that were added, for logging or tests. Never rejects.
 */
export const mergeRemoteLocales = (): Promise<string[]> =>
    fetchRemoteLocales().then((discovered) => {
        const added = discovered.filter((locale) => !supportedLanguages.includes(locale));

        supportedLanguages.push(...added);

        return added;
    });

const isDictionary = (value: unknown): value is TranslationDictionaries =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * `overrides` layered onto `base`, descending into nested groups.
 *
 * DEEP, and that is the whole point of the tier. An override names one leaf — `generic.product` —
 * and a shallow assign would replace the entire `generic` group with the one key that was edited,
 * silently deleting the twenty nobody touched. Anything that is not two objects is a leaf the
 * override replaces, arrays included: a translated list is edited whole or not at all, and merging
 * two arrays by index would produce a sentence half in each language.
 *
 * Neither argument is mutated — `base` is the imported JSON module object, shared with every other
 * consumer of that import for the life of the page.
 *
 * @param base - The bundled dictionary, or an empty one for a language this build does not ship.
 * @param overrides - What has been edited, from {@link fetchLocaleOverrides}.
 * @returns A new dictionary with the overrides winning key by key.
 */
export const mergeDictionaries = (
    base: TranslationDictionaries,
    overrides: TranslationDictionaries
): TranslationDictionaries => {
    const merged: TranslationDictionaries = { ...base };

    for (const [key, value] of Object.entries(overrides)) {
        const existing = merged[key];
        merged[key] =
            isDictionary(existing) && isDictionary(value)
                ? mergeDictionaries(existing, value)
                : value;
    }

    return merged;
};

/**
 * One language's dictionary: what this build bundled, with the edited overrides on top.
 *
 * @param locale - Language tag both halves are for.
 * @param ownMessages - This app's bundled dictionary for that locale, empty when it ships none.
 * @returns The merged dictionary. Never rejects.
 */
export const withLocaleOverrides = (
    locale: string,
    ownMessages: TranslationDictionaries
): Promise<TranslationDictionaries> =>
    fetchLocaleOverrides(locale).then((overrides) => mergeDictionaries(ownMessages, overrides));
