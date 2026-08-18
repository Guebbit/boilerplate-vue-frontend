import { getLocales, getLocaleDictionary, updateAccount } from '@api';
import {
    API_NAMESPACE,
    supportedLanguages,
    type TranslationDictionaries
} from '@/infrastructure/i18n.ts';
import { useSessionStore } from '@/infrastructure/session.ts';

/**
 * Runtime locale discovery: the API's language list and the API's own dictionary.
 *
 * ## The rule this implements
 *
 * Each repository owns its own dictionary. They synchronize the *choice* of language — that is
 * what `Accept-Language` does — and the API's dictionary is *available* on request, never merged
 * into this app's own keyspace. Two independently-authored keyspaces would eventually collide,
 * silently, and the loser would be whichever loaded last; so the API's keys go under the reserved
 * {@link API_NAMESPACE} and nowhere else.
 *
 * Neither side depends on the other for its own strings, which is what lets either boilerplate be
 * recombined with a different counterpart.
 *
 * ## Why this is optional, always
 *
 * In normal operation this app needs none of it: the API resolves its own keys and puts finished
 * text on the wire, so the client prints what arrives and looks nothing up. Every function here
 * therefore **resolves rather than rejects**, and the app is fully usable when all of them return
 * nothing. A locale switch must never be blocked by an API that is slow, old, or absent.
 */

/**
 * Language tags the API says it can ANSWER IN.
 *
 * `GET /locales` publishes capabilities rather than bare tags, and the distinction is the whole
 * reason it does: a language is `api`-scoped when the API's own dictionary is deployed for it, and
 * `app`-scoped when a client dictionary can be downloaded from
 * `GET /locales/{locale}/messages`. A language can have either, or both — one added through the
 * admin routes is `app` only until a file ships for it. Sending `Accept-Language: es` to an API
 * that cannot answer in Spanish gets English back, so only the `api` scope belongs here.
 *
 * @returns The API's list, or an empty list if it cannot be reached or does not implement the
 *  endpoint. Never rejects.
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
 * @returns The API's messages, or an empty dictionary when the API has no such locale or cannot
 *  be reached. Never rejects.
 */
export const fetchApiDictionary = (locale: string): Promise<TranslationDictionaries> =>
    getLocaleDictionary(locale)
        .then((response) => (response.data?.messages ?? {}) as TranslationDictionaries)
        .catch(() => ({}));

/**
 * Adds any language the API supports and this app does not to {@link supportedLanguages}.
 *
 * The union, not a replacement: the build-time list stays the offline default, so the app still
 * offers its own languages with the API unreachable. A language only the API has appears in the
 * switcher and degrades per key — API copy in that language, UI copy from `fallbackLocale` —
 * rather than all-or-nothing.
 *
 * Mutates the exported array rather than returning a new one, because `supportedLanguages` is
 * imported by value in a dozen places (the router guard, the switcher, `routerLinkI18n`) and
 * reassigning the binding would leave all of them looking at the old list.
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
 * @param ownMessages - This app's UI dictionary for that locale, which may be empty for a
 *  language only the API has.
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

/**
 * Remembers a signed-in visitor's language choice on their account.
 *
 * Two audiences, two lifetimes, and only one of them needs the API. For a GUEST the choice lives
 * in the URL (`/:locale/...`) and dies with the tab, which is the right lifetime for someone with
 * no record to write to. For a SIGNED-IN visitor their account record is the one place a
 * preference outlives the tab, so the next login reads it back and re-applies it.
 *
 * ── Why the `isAuth` check is here and not at the call site ──────────────────────────────────
 * Because it is a rule about the preference, not about the button. Every caller would otherwise
 * repeat it, and a caller that forgot would send an anonymous `PUT /account` and get a 401 for
 * its trouble. The switcher asks to remember the choice; whether there is anywhere to remember it
 * is this function's business.
 *
 * That is also what keeps `AppLanguageSwitcher` out of the session store. A shell component that
 * reads who is signed in has to be understood before it can be moved; one that calls this does
 * not.
 *
 * ── Best-effort, like everything else in this file ───────────────────────────────────────────
 * Resolves rather than rejects, and callers fire it without awaiting. A failed write must not
 * un-switch the page the visitor is looking at, and a slow account endpoint must not hold the
 * language up — the page is already in the new language by the time this settles.
 *
 * The cost of that choice, stated plainly: a write that fails is invisible, and the visitor's
 * stored preference stays stale until they switch again. That is the accepted trade — the
 * alternative is a toast about a preference nobody asked to be told about.
 *
 * @param locale - Language tag the visitor just chose.
 * @returns Resolves once the write settles, or immediately for a guest. Never rejects.
 */
export const persistLocalePreference = (locale: string): Promise<void> =>
    useSessionStore().isAuth
        ? updateAccount({ locale })
              .then(() => undefined)
              .catch(() => undefined)
        : Promise.resolve();
