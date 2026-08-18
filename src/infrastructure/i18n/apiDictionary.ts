import { getLocales, getLocaleDictionary } from '@api';
import { API_NAMESPACE, supportedLanguages, type TranslationDictionaries } from './index.ts';

/**
 * Runtime locale discovery: the API's language list and the API's own dictionary.
 *
 * Every function here RESOLVES rather than rejects, and the app is fully usable when all of them
 * return nothing — in normal operation the API puts finished text on the wire and the client
 * looks nothing up. A locale switch must never be blocked by an API that is slow, old or absent.
 *
 * See `docs/theory/layers.md` for why the API's keys live under `api.*` and are never merged into
 * this app's keyspace.
 */

/**
 * Language tags the API says it can ANSWER IN.
 *
 * `GET /locales` publishes capabilities, not bare tags: a language is `api`-scoped when the API's
 * own dictionary is deployed for it, `app`-scoped when a client dictionary can be downloaded.
 * Sending `Accept-Language: es` to an API that cannot answer in Spanish gets English back, so
 * only the `api` scope belongs here.
 *
 * @returns The API's list, or an empty list when it cannot be reached. Never rejects.
 */
export const fetchApiLocales = (): Promise<string[]> =>
    getLocales()
        .then((response) =>
            (response.data?.locales ?? [])
                .filter((language) => language.scopes.includes('api'))
                .map((language) => language.tag)
        )
        .catch(() => []);

/**
 * The API's own dictionary for one language.
 *
 * @param locale - Language tag to ask for.
 * @returns The API's messages, or an empty dictionary. Never rejects.
 */
export const fetchApiDictionary = (locale: string): Promise<TranslationDictionaries> =>
    getLocaleDictionary(locale)
        .then((response) => (response.data?.messages ?? {}) as TranslationDictionaries)
        .catch(() => ({}));

/**
 * Adds any language the API supports and this app does not to {@link supportedLanguages}.
 *
 * The union, not a replacement: the build-time list stays the offline default. A language only
 * the API has appears in the switcher and degrades per key rather than all-or-nothing.
 *
 * Mutates the exported array rather than returning a new one, because `supportedLanguages` is
 * imported by value in a dozen places and reassigning the binding would leave them on the old list.
 *
 * @returns The languages that were added, for logging or tests. Never rejects.
 */
export const mergeApiLocales = (): Promise<string[]> =>
    fetchApiLocales().then((discovered) => {
        const added = discovered.filter((locale) => !supportedLanguages.includes(locale));

        supportedLanguages.push(...added);

        return added;
    });

/**
 * Merges the API's dictionary into a locale's messages under the reserved namespace.
 *
 * @param locale - Language tag both dictionaries are for.
 * @param ownMessages - This app's UI dictionary for that locale, possibly empty.
 * @returns One dictionary: this app's keys at the root, the API's under `api.*`. Never rejects.
 */
export const withApiDictionary = (
    locale: string,
    ownMessages: TranslationDictionaries
): Promise<TranslationDictionaries> =>
    fetchApiDictionary(locale).then((apiMessages) => ({
        ...ownMessages,
        [API_NAMESPACE]: apiMessages
    }));
