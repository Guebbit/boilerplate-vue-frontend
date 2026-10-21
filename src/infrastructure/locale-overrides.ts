/**
 * @module
 * Fetch layer for the runtime half of the dictionaries: manifest + per-locale overrides, each
 * function resolving to a safe default (never rejecting) so the offline-bundled files remain the
 * floor the app always renders from.
 *
 * Lives in this app rather than in `@/i18n` (the extractable tier) because it is contract-specific:
 * it calls `@api`, the client generated from this app's own OpenAPI bundle, which the extractable
 * runtime must not depend on.
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
 * (the backend app's rows) are layered onto its files inside the API and never leave it — a
 * frontend that merged them would be adopting the backend's keyspace as its own, and both sides
 * declare a top-level `generic`. See `docs/theory/layers.md`.
 */

/**
 * This frontend's APP — whose dictionary `GET /locales/{locale}/messages` builds for it.
 *
 * An app is one keyspace, authored by one team; the API lists the ones it serves under
 * `GET /locales/apps`. This build names its own in `VITE_LOCALE_APP` and falls back to the
 * demo pair's frontend id, so a checkout with no `.env` still talks to the demo backend.
 */
export const localeApp = (): string =>
    runtimeValue('LOCALE_APP') || import.meta.env.VITE_LOCALE_APP?.trim() || 'demo-fe';

/**
 * this is a boot-blocking read — `main.ts` awaits it before the app can mount at all — so it
 * gets a much shorter budget than the client's ordinary 10s default. A visitor's first paint
 * should not sit behind a slow or unreachable API for longer than this.
 */
const BOOT_READ_TIMEOUT_MS = 1500;

/** What the manifest says about the languages this app may offer. */
interface RemoteLocales {
    /** Tags to offer: every language that has some dictionary and is not switched off. */
    offered: string[];
    /**
     * Languages the manifest lists as switched off for this caller: a language this build may
     * bundle a file for that the shop has since switched off, and that the caller cannot preview.
     */
    switchedOff: string[];
    /** The deployment's default and fallback languages: never taken away, so a redirect has a target. */
    keep: string[];
}

/**
 * Whether the manifest row is a language switched off that this caller cannot see into.
 *
 * A language with a deployed file keeps its row in every caller's manifest, as `active: false`
 * when it is off. A caller who may preview drafts also gets the language's own row, so its source
 * is `both` (or `dynamic`); a visitor gets the deployed file alone, `static`. That difference is
 * what separates "off, and none of the caller's business" from "off, and a draft to preview".
 *
 * @param language - one row of `GET /locales`
 */
const isSwitchedOffForThisCaller = (language: { active: boolean; source: string }): boolean =>
    !language.active && language.source === 'static';

/**
 * The manifest, split into what to offer and what to take away.
 *
 * Never rejects: an unreachable or older API is an empty answer, and the folder stands alone.
 */
const readRemoteLocales = (): Promise<RemoteLocales> =>
    getLocales({ timeout: BOOT_READ_TIMEOUT_MS })
        .then((response): RemoteLocales => {
            const offered: string[] = [];
            const switchedOff: string[] = [];

            for (const language of response.data.locales) {
                // Any app at all is "offers some dictionary", which is all the switcher asks.
                if (language.apps.length === 0) continue;

                if (isSwitchedOffForThisCaller(language)) {
                    switchedOff.push(language.tag);
                    continue;
                }

                localeDirections[language.tag] = language.direction;
                localeNativeNames[language.tag] = language.nativeName;
                offered.push(language.tag);
            }

            return {
                offered,
                switchedOff,
                keep: [response.data.default, response.data.fallback]
            };
        })
        .catch((): RemoteLocales => ({ offered: [], switchedOff: [], keep: [] }));

/**
 * Languages the deployment offers, from the API's manifest.
 *
 * Every app is kept, and they answer different questions. A frontend app means a dictionary
 * can be downloaded for it; the backend app means the API has its own wording in it. A language
 * with only the backend app still belongs in the switcher — the UI falls back per key while the
 * API's messages arrive in its own wording — and a language with only a frontend app is the
 * opposite: the interface translates, the API answers in it, and the few messages it has no
 * wording for arrive in the default language.
 *
 * NEITHER IS CHECKED AGAINST THE OTHER, deliberately. This app can bundle `it.json` while the API
 * has no Italian at all, in which case the interface is Italian and the API's messages arrive in
 * its fallback. That inconsistency is a HUMAN decision — someone wanted the interface translated
 * and did not care about the backend's half — so nothing here prevents it or warns about it. If it
 * is ever wrong, it is wrong in a way only a person can judge.
 *
 * A language the shop has SWITCHED OFF is left out of the result, whatever else the manifest knows
 * about it. {@link mergeRemoteLocales} is what also takes a bundled one away from the switcher.
 *
 * The writing direction and native name of every language offered are recorded on the way past,
 * into {@link localeDirections} and {@link localeNativeNames}: both are things the manifest knows
 * that the dictionary does not, and this is the only moment either is in hand.
 *
 * @returns The API's language tags, or an empty list when it cannot be reached. Never rejects.
 */
export const fetchRemoteLocales = (): Promise<string[]> =>
    readRemoteLocales().then(({ offered }) => offered);

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
    getLocaleMessages(locale, { app: localeApp() })
        .then((response) => response.data.messages as TranslationDictionaries)
        .catch(() => ({}));

/**
 * Brings {@link supportedLanguages} in line with the API's manifest: adds the languages the API
 * offers and this build does not bundle, and takes away a bundled one the shop has switched off.
 *
 * The union for the first half, not a replacement: the folder scan stays the offline default, so a
 * build with no network still offers everything it shipped. A language only the API knows about
 * appears in the switcher and degrades per key rather than all-or-nothing.
 *
 * The second half is what makes a switched-off language unreachable from the frontend as well:
 * the locale guard redirects a `/it/…` address to the default language once `it` is no longer
 * supported, and the switcher stops offering it. The deployment's default and fallback languages
 * are never taken away, so there is always a language to redirect to.
 *
 * Mutates the exported array rather than returning a new one, because `supportedLanguages` is
 * imported by value in a dozen places and reassigning the binding would leave them on the old list.
 *
 * @returns The languages that were added, for logging or tests. Never rejects.
 */
export const mergeRemoteLocales = (): Promise<string[]> =>
    readRemoteLocales().then(({ offered, switchedOff, keep }) => {
        const added = offered.filter((locale) => !supportedLanguages.includes(locale));

        supportedLanguages.push(...added);

        for (const locale of switchedOff) {
            const index = supportedLanguages.indexOf(locale);
            if (index !== -1 && !keep.includes(locale)) supportedLanguages.splice(index, 1);
        }

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
