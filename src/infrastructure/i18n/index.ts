import { nextTick, type WritableComputedRef } from 'vue';
import { createI18n, type I18n } from 'vue-i18n';

export interface TranslationDictionaries {
    /*
     * Arrays are legitimate vue-i18n messages — `tm()` + `rt()` render them — and the static
     * pages use them for their paragraph and FAQ lists. Without the array arms, any dictionary
     * carrying one stops overlapping this type and every cast of a locale JSON fails to build.
     */
    [key: string]: string | string[] | TranslationDictionaries | TranslationDictionaries[];
}

/**
 * Minimal translate signature compatible with vue-i18n's `t`, for modules outside a component
 * scope (Zod schemas, upload validators) that need key lookup and nothing else.
 *
 * `named` carries interpolation values, e.g. `t('image-upload-form.size-exceeded', { size: '5 MB' })`.
 */
export type TranslateFunction = (key: string, named?: Record<string, unknown>) => string;

/**
 * [on build] Locales named by `VITE_APP_SUPPORTED_LOCALES`, normalised.
 *
 * Trimmed and empty-filtered because both slips are silent: `en, it` yields `' it'`, which
 * matches no route and no dictionary, and `en,,it` yields `''`, which matches the empty first
 * segment of `/` and stops `routerLinkI18n('/')` prefixing anything.
 */
const declaredLocales =
    (import.meta.env.VITE_APP_SUPPORTED_LOCALES as string | undefined)
        ?.split(',')
        .map((locale) => locale.trim())
        .filter(Boolean) ?? [];

/**
 * [on build] Locales with a dictionary in the bundle, discovered from the folder.
 *
 * The glob is exempt from mutation because Vite requires a STATIC string literal here and
 * Stryker rewrites every literal into a ternary — the two are incompatible by construction, and
 * the whole run dies in the dry run rather than producing a surviving mutant.
 */
// Stryker disable next-line StringLiteral: Vite requires a static literal here; see above.
const bundledLocales = Object.keys(import.meta.glob('/src/locales/*.json')).map((file) =>
    file.replace('/src/locales/', '').replace('.json', '')
);

/**
 * [on build] Languages this app offers, loaded or not.
 *
 * The env list wins when it names anything usable — that is how a locale with no local dictionary
 * (served by the API at runtime) gets offered at all. Otherwise the folder answers.
 */
export const supportedLanguages = declaredLocales.length > 0 ? declaredLocales : bundledLocales;

/** [on build] Languages already fetched. */
export const loadedLanguages: string[] = [];

/**
 * Per-locale loaders for the dictionaries the enabled modules contribute.
 *
 * A domain owns its own copy under `src/modules/<name>/locales/`, merged at boot, per locale, on
 * demand — so a visitor downloads the vocabulary for one language and only for the enabled
 * domains. Populated by {@link registerLocaleContributors} from the composition root, because
 * `infrastructure` may not import `@/modules`.
 */
let moduleLocaleLoaders: Record<string, (() => Promise<TranslationDictionaries>)[]> = {};

/**
 * Install the enabled modules' dictionary loaders, keyed by locale code.
 *
 * Replaces rather than appends, so calling it twice does not double the merge work. Must run
 * before the first {@link loadLocale} — in the app that is `src/main.ts`. Skip it and every
 * module key renders as its own name.
 *
 * @param loadersByLocale - locale code → one loader per contributing module
 */
export const registerLocaleContributors = (
    loadersByLocale: Record<string, (() => Promise<TranslationDictionaries>)[]>
): void => {
    moduleLocaleLoaders = loadersByLocale;
};

export const i18n = createI18n({
    // MUST be false to use the composition API.
    legacy: false,
    locale: import.meta.env.VITE_APP_DEFAULT_LOCALE ?? 'en',
    fallbackLocale: (import.meta.env.VITE_APP_FALLBACK_LOCALE as string | undefined) ?? 'en',
    modifiers: {
        customSnakeCase: (value) => (typeof value === 'string' ? value.split(' ').join('_') : value)
    }
});

/**
 * Key lookup against the active locale, usable outside any component's setup.
 *
 * Exists for the Zod schemas in `src/modules/<domain>/schemas.ts`. Every validation message there
 * is a THUNK — `{ error: () => translate('…') }` — which Zod calls at PARSE time, so one
 * module-scope schema speaks every language.
 *
 * Does NOT re-translate an error already on screen; pass `{ revalidateOn: locale }` to
 * `useStructureFormValidation` for that.
 *
 * @param key - Dictionary key to resolve.
 * @param named - Interpolation values, for a message that declares placeholders.
 * @returns The translation in the active locale.
 */
export const translate: TranslateFunction = (key: string, named?: Record<string, unknown>) =>
    named ? i18n.global.t(key, named) : i18n.global.t(key);

/**
 * Loads a locale's vocabulary (from `src/locales/*.json`) and activates it.
 *
 * @param i18n - The vue-i18n instance to load the messages into.
 * @param locale - Locale code to activate, e.g. `en`.
 * @returns A promise resolving once the messages are registered and the active locale has been
 *  switched. Unsupported locales and failed imports fall back to {@link getDefaultLocale}.
 */
export function _loadLocale(i18n: I18n, locale: string): Promise<unknown> {
    if (loadedLanguages.includes(locale)) return _changeLanguage(i18n, locale);
    // Supported but not loaded: it has a file. A dictionary fetched from a server must be
    // registered with `updateLocale` before getting here.
    if (supportedLanguages.includes(locale))
        return (
            // Stryker disable next-line StringLiteral: mutating this template to "" leaves an
            // `import("")` that Vite cannot statically analyse, so the whole module fails to
            // transform and every suite errors out instead of one mutant surviving.
            import(/* webpackChunkName: "locale-[request]" */ `@/locales/${locale}.json`)
                .then((file: { default: TranslationDictionaries }) =>
                    // Shared dictionary in, module dictionaries merged on top by `_updateLocale`.
                    _updateLocale(i18n, locale, file.default).then(() =>
                        _changeLanguage(i18n, locale)
                    )
                )
                .catch(() => _changeLanguage(i18n, getDefaultLocale()))
        );

    return _changeLanguage(i18n, getDefaultLocale());
}

/**
 * {@link _loadLocale} bound to the app-wide {@link i18n} instance.
 *
 * @param locale - Locale code to activate, e.g. `en`.
 * @returns A promise resolving once the locale is loaded and active.
 */
export function loadLocale(locale: string) {
    return _loadLocale(i18n, locale);
}

/**
 * Registers (or overwrites) the vocabulary of a locale, e.g. after fetching it from a server.
 *
 * @param i18n - The vue-i18n instance to register the messages on.
 * @param locale - Locale code the messages belong to.
 * @param messages - Nested translation dictionary for that locale.
 * @returns A promise (`nextTick`) resolving once Vue has flushed the update.
 */
export function _updateLocale(i18n: I18n, locale: string, messages: TranslationDictionaries) {
    if (!loadedLanguages.includes(locale)) loadedLanguages.push(locale);
    // Cloned, not registered by reference: `_loadLocale` passes the imported `en.json` module
    // object straight through, so a later `mergeLocaleMessage` would write into the bundled
    // dictionary itself, for every consumer of that import, for the life of the process.
    i18n.global.setLocaleMessage(locale, structuredClone(messages));

    /*
     * Then the enabled modules' dictionaries, on top — and this has to happen here, because
     * `setLocaleMessage` REPLACES the locale wholesale and every install path funnels through
     * this function (`_loadLocale` for a language switch, `localeChoice` → `updateLocale` for the
     * router guard). Merging in only one leaves the other silently monolingual.
     *
     * `mergeLocaleMessage` is a DEEP merge, which is what lets several modules each contribute a
     * slice of the shared `navigation` namespace.
     */
    return Promise.all((moduleLocaleLoaders[locale] ?? []).map((load) => load()))
        .then((moduleDictionaries) => {
            for (const dictionary of moduleDictionaries)
                i18n.global.mergeLocaleMessage(locale, dictionary);
        })
        .then(() => nextTick());
}

/**
 * {@link _updateLocale} bound to the app-wide {@link i18n} instance.
 *
 * @param locale - Locale code the messages belong to.
 * @param messages - Nested translation dictionary for that locale.
 * @returns A promise resolving once Vue has flushed the update.
 */
export function updateLocale(locale: string, messages: TranslationDictionaries) {
    return _updateLocale(i18n, locale, messages);
}

/**
 * Loads the fallback locale's dictionary, unless it is already there.
 *
 * `fallbackLocale` can only fall back to messages that are REGISTERED, and loading a locale never
 * loads anything else — so a visitor landing on `/es/...` had only `es`, and every UI key
 * rendered as its own identifier. Never rejects: a missing fallback is a worse-looking page, not
 * a broken navigation.
 *
 * @param i18n - The vue-i18n instance to load into.
 * @param locale - The locale being activated; skipped when it IS the fallback.
 * @returns A promise resolving once the fallback messages are registered, or immediately.
 */
export function _ensureFallbackLoaded(i18n: I18n, locale: string): Promise<unknown> {
    const fallback = (i18n.global.fallbackLocale as WritableComputedRef<string | undefined>).value;

    if (!fallback || fallback === locale || loadedLanguages.includes(fallback))
        return Promise.resolve();

    return (
        // Stryker disable next-line StringLiteral: mutating this template to "" leaves an
        // `import("")` that Vite cannot statically analyse, so the whole module fails to
        // transform and every suite errors out instead of one mutant surviving.
        import(/* webpackChunkName: "locale-[request]" */ `@/locales/${fallback}.json`)
            .then((file: { default: TranslationDictionaries }) =>
                _updateLocale(i18n, fallback, file.default)
            )
            // A fallback with no local dictionary is a configuration choice, not an error.
            .catch(() => {})
    );
}

/**
 * Switches the active language, loading its vocabulary first when missing, and keeps
 * `<html lang>` in sync.
 *
 * @param i18n - The vue-i18n instance to switch.
 * @param locale - Locale code to activate, e.g. `en`.
 * @returns A promise resolving once the locale is active and Vue has flushed.
 */
export function _changeLanguage(i18n: I18n, locale: string): Promise<unknown> {
    const setLocale = () => {
        (i18n.global.locale as WritableComputedRef<string>).value = locale;
        document.querySelector('html')?.setAttribute('lang', locale);
        return nextTick();
    };
    if (!loadedLanguages.includes(locale)) return _loadLocale(i18n, locale).then(() => setLocale());
    // Every activation path funnels through here, so this is the one place that guarantees the
    // fallback dictionary is present before a locale becomes active.
    return _ensureFallbackLoaded(i18n, locale).then(() => setLocale());
}

/**
 * {@link _changeLanguage} bound to the app-wide {@link i18n} instance.
 *
 * @param locale - Locale code to activate, e.g. `en`.
 * @returns A promise resolving once the locale is active.
 */
export function changeLanguage(locale: string) {
    return _changeLanguage(i18n, locale);
}

/**
 * Best guess of the locale to use when the route carries none.
 *
 * @returns The browser language when supported, otherwise the configured fallback locale,
 *  `VITE_APP_DEFAULT_LOCALE`, or `'en'`.
 */
export function getDefaultLocale() {
    const foundLocale = navigator.language.slice(0, 2);
    // Supported, not loaded: on a first visit nothing is loaded and detection would never match.
    if (supportedLanguages.includes(foundLocale)) return foundLocale;
    return (
        (i18n.global.fallbackLocale as WritableComputedRef<string>).value ||
        (import.meta.env.VITE_APP_DEFAULT_LOCALE as string | undefined) ||
        'en'
    );
}

/**
 * Reads the locale currently active on the app-wide {@link i18n} instance.
 *
 * @returns The active locale code, e.g. `en`.
 */
export const getCurrentLocale = () => i18n.global.locale.value;

/**
 * Reserved root namespace holding the API's OWN dictionary, fetched at runtime.
 *
 * The two repos are independent, so the API's keys never merge at the root where two
 * independently-authored key spaces would collide silently. This app must never author `api.*`
 * by hand — `tests/unit/infrastructure/i18n.spec.ts` enforces it.
 */
export const API_NAMESPACE = 'api';

/**
 * Copy that belongs to the API, with a local stand-in for when the API's dictionary is absent.
 *
 * For the handful of messages the client must produce ITSELF because no response came back — a
 * 401 with an empty body, a network failure, a bare 502. Which is why it cannot depend on the
 * fetched dictionary: the request that would have downloaded it may have failed the same way.
 *
 * @param apiKey - Key inside the API's dictionary, WITHOUT the `api.` prefix.
 * @param localKey - Key in this app's own dictionary, used whenever `api.*` cannot answer.
 * @returns The best available translation, in the active locale.
 */
export const apiText = (apiKey: string, localKey: string): string => {
    const namespacedKey = `${API_NAMESPACE}.${apiKey}`;
    return i18n.global.te(namespacedKey) ? i18n.global.t(namespacedKey) : i18n.global.t(localKey);
};
