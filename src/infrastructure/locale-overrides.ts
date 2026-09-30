/**
 * @module
 * Fetch layer for the runtime half of the dictionaries: manifest + per-locale overrides, each
 * function resolving to a safe default (never rejecting) so the offline-bundled files remain the
 * floor the app always renders from.
 *
 * Lives in this app rather than in `@/i18n` (FE-D5) because it is contract-specific: it calls
 * `@api`, the client generated from this app's own OpenAPI bundle, which the extractable runtime
 * must not depend on.
 */

import { getLocales, getLocaleMessages } from '@api';
import { runtimeValue } from '@/infrastructure/runtime-config';
import {
    loadBundledDictionary,
    localeDirections,
    localeNativeNames,
    mergeDictionaries,
    supportedLanguages,
    updateLocale,
    type TranslationDictionaries
} from '@/i18n';

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
 * (the backend tenant's rows) are layered onto its files inside the API and never leave it — a
 * frontend that merged them would be adopting the backend's keyspace as its own, and both sides
 * declare a top-level `generic`. See `docs/theory/layers.md`.
 */

/**
 * This frontend's TENANT — whose dictionary `GET /locales/{locale}/messages` builds for it.
 *
 * A tenant is one keyspace, authored by one team; the API lists the ones it serves under
 * `GET /locales/tenants`. This build names its own in `VITE_LOCALE_TENANT` and falls back to the
 * demo pair's frontend id, so a checkout with no `.env` still talks to the demo backend.
 */
export const localeTenant = (): string =>
    runtimeValue('LOCALE_TENANT') || import.meta.env.VITE_LOCALE_TENANT?.trim() || 'demo-fe';

/**
 * Languages the deployment offers, from the API's manifest.
 *
 * Every tenant is kept, and they answer different questions. A frontend tenant means a dictionary
 * can be downloaded for it; the backend tenant means the API can ANSWER in it. A language with
 * only the backend tenant still belongs in the switcher — the UI falls back per key while every
 * error message arrives in the right language — and a language with only a frontend tenant is
 * the opposite: the interface translates and the API answers in the fallback.
 *
 * NEITHER IS CHECKED AGAINST THE OTHER, deliberately. This app can bundle `it.json` while the API
 * has no Italian at all, in which case the interface is Italian and the API's messages arrive in
 * its fallback. That inconsistency is a HUMAN decision — someone wanted the interface translated
 * and did not care about the backend's half — so nothing here prevents it or warns about it. If it
 * is ever wrong, it is wrong in a way only a person can judge.
 *
 * The writing direction and native name of every language the manifest lists are recorded on the
 * way past, into {@link localeDirections} and {@link localeNativeNames}: both are things the
 * manifest knows that the dictionary does not, and this is the only moment either is in hand.
 *
 * @returns The API's language tags, or an empty list when it cannot be reached. Never rejects.
 */
/**
 * this is a boot-blocking read — `main.ts` awaits it before the app can mount at all — so it
 * gets a much shorter budget than the client's ordinary 10s default. A visitor's first paint
 * should not sit behind a slow or unreachable API for longer than this.
 */
const BOOT_READ_TIMEOUT_MS = 1500;

/**
 *
 */
export const fetchRemoteLocales = (): Promise<string[]> =>
    getLocales({ timeout: BOOT_READ_TIMEOUT_MS })
        .then((response) =>
            response.data.locales
                .filter(
                    (language) =>
                        // Any tenant at all is "offers some dictionary", which is all the switcher asks.
                        language.tenants.length > 0
                )
                .map((language) => {
                    localeDirections[language.tag] = language.direction;
                    localeNativeNames[language.tag] = language.nativeName;
                    return language.tag;
                })
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
    getLocaleMessages(locale, { tenant: localeTenant() })
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

/**
 * Refreshes the RUNNING app's copy of one language after a write, so an edit is visible before the
 * next full navigation — the translation admin's live-preview courtesy.
 *
 * Re-derives the full dictionary from this build's own bundle, not from whatever is currently
 * registered: an override that was just deleted must fall back to the bundled default, which
 * merging fresh overrides onto the running state would never let happen. `updateLocale` folds in
 * the enabled modules' own dictionaries on top of neither of these, so this only needs the shared
 * file plus the module slices ({@link loadBundledDictionary}) and the overrides on top of that.
 *
 * Resolves regardless: the caller's own state (the board, the page) is already correct, and this
 * must never turn a saved edit into an error toast.
 *
 * @param locale - Language tag just edited.
 * @returns A promise resolving once the running app's copy is refreshed, or immediately on
 *  failure. Never rejects.
 */
export const refreshRunningLocale = (locale: string): Promise<void> =>
    Promise.all([loadBundledDictionary(locale), fetchLocaleOverrides(locale)])
        .then(([bundled, overrides]) => updateLocale(locale, mergeDictionaries(bundled, overrides)))
        .then(() => undefined)
        .catch(() => undefined);
