import { nextTick, type WritableComputedRef } from 'vue';
import { createI18n, type I18n } from 'vue-i18n';
import type { RouteLocationRaw, RouteLocationNamedRaw } from 'vue-router';
// import it from "@/locales/it.json";
// import en from "@/locales/en.json";

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
 * scope (Zod schemas, upload validators) that need key lookup and nothing else from i18n.
 *
 * `named` carries interpolation values for a message with placeholders, e.g.
 * `t('image-upload-form.size-exceeded', { size: '5 MB' })`.
 */
export type TranslateFunction = (key: string, named?: Record<string, unknown>) => string;

/**
 * [on build]
 * Locales named by `VITE_APP_SUPPORTED_LOCALES`, normalised.
 *
 * Trimmed and emptied-filtered rather than split raw, because both slips are silent and neither
 * looks like a locale bug when it bites:
 *
 * - `en, it` (a space after the comma) yields `' it'`, which matches no route and no dictionary.
 * - `en,,it` (a stray comma) yields `''`, and an empty string matches the empty first segment of
 *   `/` — so `routerLinkI18n('/')` stops prefixing the locale and the root route silently loses
 *   its language.
 *
 * Same normalisation the API applies to `NODE_SUPPORTED_LOCALES`, so the two agree on what a
 * comma-separated locale list means.
 */
const declaredLocales =
    (import.meta.env.VITE_APP_SUPPORTED_LOCALES as string | undefined)
        ?.split(',')
        .map((locale) => locale.trim())
        .filter(Boolean) ?? [];

/**
 * [on build]
 * Locales with a dictionary in the bundle, discovered from the folder.
 *
 * The glob pattern is exempt from mutation, and the reason is about the TOOL rather than the
 * tests. Vite resolves `import.meta.glob` at transform time and requires its argument to be a
 * STATIC string literal; Stryker's instrumenter rewrites every literal in scope into a ternary
 * (`cond ? "" : "/src/locales/*.json"`). The two are incompatible by construction — Vite's glob
 * parser hits the rewritten expression and the whole run dies in the dry run with
 * `RollupError: Expected ',', got '<eof>'`, before a single mutant is tested.
 *
 * Scoped to this one line rather than excluding the file: the `.replace` chain below is ordinary
 * runtime logic and its mutants are real findings.
 */
// Stryker disable next-line StringLiteral: Vite requires a static literal here; see above.
const bundledLocales = Object.keys(import.meta.glob('/src/locales/*.json')).map((file) =>
    file.replace('/src/locales/', '').replace('.json', '')
);

/**
 * [on build]
 * List of supported languages (that we currently don't have loaded but that can be fetched).
 *
 * The env list wins when it names anything usable — that is how a locale with no local
 * dictionary (served by the API at runtime) gets offered at all. An absent, empty or
 * all-punctuation env value means "not configured", and the folder is the answer.
 *
 * There is deliberately no "no languages found" guard. It would need the env list to be unusable
 * AND `src/locales/` to be empty, and an app with no dictionary at all cannot render one string —
 * every other test fails long before a warning would help.
 */
export const supportedLanguages = declaredLocales.length > 0 ? declaredLocales : bundledLocales;

/**
 * [on build]
 * List of loaded languages (already fetched)
 */
export const loadedLanguages: string[] = [];

/**
 * Per-locale loaders for the dictionaries the enabled modules contribute.
 *
 * A domain owns its own copy: `src/modules/<name>/locales/{en,it}.json` holds the page and form
 * namespaces only that domain uses, plus its own `navigation.label-*` entry. Deleting the folder
 * takes the strings with it, instead of leaving orphans in one big file nobody dares prune.
 *
 * They merge **at boot, per locale, on demand** rather than at build time: each
 * dictionary stays its own lazy chunk, so a visitor downloads the vocabulary for one language and
 * only for the domains this build actually enables.
 *
 * Populated by `registerLocaleContributors` from the composition root, for the same reason the
 * response-schema map is: `infrastructure` may not import `@/modules`, and this is the bottom tier.
 */
let moduleLocaleLoaders: Record<string, (() => Promise<TranslationDictionaries>)[]> = {};

/**
 * Install the enabled modules' dictionary loaders, keyed by locale code.
 *
 * Replaces rather than appends, so calling it twice leaves each locale with exactly one loader per
 * module instead of quietly doubling the merge work.
 *
 * Must run before the first {@link loadLocale}. In the app that is `src/main.ts`, at module scope;
 * in a test it is whatever stands in for boot. Skip it and the app still renders — it just renders
 * every module's key as its own name, which is what `schemas-i18n.spec.ts` and
 * `login-view-i18n.spec.ts` exist to catch.
 *
 * @param loadersByLocale - locale code → one loader per contributing module
 */
export const registerLocaleContributors = (
    loadersByLocale: Record<string, (() => Promise<TranslationDictionaries>)[]>
): void => {
    moduleLocaleLoaders = loadersByLocale;
};

/**
 * [on build]
 * I18n init
 */
export const i18n = createI18n({
    /**
     * MUST set false to use composition
     */
    legacy: false,

    /**
     * Starting locale.
     * In this case: automatic browser language detection
     * (it's better to use this elsewhere, with routing)
     */
    locale: import.meta.env.VITE_APP_DEFAULT_LOCALE ?? 'en',

    /**
     * Fallback in case requested language doesn't exist
     */
    fallbackLocale: (import.meta.env.VITE_APP_FALLBACK_LOCALE as string | undefined) ?? 'en',

    /**
     * Static import of vocabulary
     * (for large locale files it is better the dynamic one)
     */
    // messages: {
    //     it,
    //     en
    // },

    /**
     * Custom modifiers to transform translations
     */
    modifiers: {
        customSnakeCase: (value) => (typeof value === 'string' ? value.split(' ').join('_') : value)
    }
});

/**
 * Key lookup against the active locale, usable outside any component's setup.
 *
 * `i18n.global.t` rather than `useI18n()`: the callers are module constants, evaluated where the
 * composable is unavailable.
 *
 * Its reason for existing is the Zod schemas in `features/<domain>/schemas.ts`. Every validation
 * message there is a THUNK — `{ error: () => translate('…') }`, never `{ error: translate('…') }`.
 * Zod v4 calls it at PARSE time, and this resolves against whatever locale is active at that
 * moment, so one module-scope schema speaks every language. That is why those schemas are plain
 * constants and not `createUsersSchema(t)` factories: `useStructureFormValidation` applies
 * `toValue(schema)` inside `validate()` and nowhere else, so a getter would be re-evaluated at
 * exactly the moment a thunk is — same behaviour, more machinery, and one way to get it wrong (passing
 * `createUsersSchema(t)` instead of `() => createUsersSchema(t)` type-checks, runs, and silently
 * freezes the language at setup).
 *
 * This does NOT re-translate an error already on screen — `formErrors` holds resolved strings by
 * then. Pass `{ revalidateOn: locale }` to `useStructureFormValidation` for that.
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
 * Locales already listed in {@link loadedLanguages} skip the import; locales
 * fetched from a server must be registered with {@link updateLocale} before
 * calling this.
 *
 * @param i18n - The vue-i18n instance to load the messages into.
 * @param locale - Locale code to activate, e.g. `en`.
 * @returns A promise resolving once the messages are registered and the active
 *  locale has been switched. Unsupported locales and failed imports fall back
 *  to {@link getDefaultLocale}.
 */
export function _loadLocale(i18n: I18n, locale: string): Promise<unknown> {
    // Load locale
    if (
        // Check if already loaded
        loadedLanguages.includes(locale)
    )
        return _changeLanguage(i18n, locale);
    // If not loaded but supported, load it from a file
    // (load from server must be done elsewhere and then be added to loadadLanguages before calling this function)
    if (supportedLanguages.includes(locale))
        // Load from file (it should be there). `_updateLocale` merges the enabled modules'
        // dictionaries on top of it — see there for why that belongs at the install point and not
        // here.
        return (
            // Stryker disable next-line StringLiteral: mutating this template to "" leaves an
            // `import("")` that Vite cannot statically analyse, so the whole module fails to
            // transform and every suite errors out instead of one mutant surviving.
            import(/* webpackChunkName: "locale-[request]" */ `@/locales/${locale}.json`)
                // file found
                .then((file: { default: TranslationDictionaries }) =>
                    // shared dictionary in, module dictionaries merged on top by `_updateLocale`
                    _updateLocale(i18n, locale, file.default)
                        // then language changed
                        .then(() => _changeLanguage(i18n, locale))
                )
                // this should never happen if in supportedLanguage, but failsafe default language just in case
                .catch(() => _changeLanguage(i18n, getDefaultLocale()))
        );

    // If not supported, change to default language
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
 * Registers (or overwrites) the vocabulary of a locale, e.g. after fetching
 * translations from a server.
 *
 * @param i18n - The vue-i18n instance to register the messages on.
 * @param locale - Locale code the messages belong to.
 * @param messages - Nested translation dictionary for that locale.
 * @returns A promise (`nextTick`) resolving once Vue has flushed the update.
 */
export function _updateLocale(i18n: I18n, locale: string, messages: TranslationDictionaries) {
    // Could be already present and this is just an update
    if (!loadedLanguages.includes(locale)) loadedLanguages.push(locale);
    // Cloned, not registered by reference. `_loadLocale` passes the imported `en.json` module
    // object straight through, and vue-i18n would then hold that very object — so a later
    // `mergeLocaleMessage` (which is how the API's `api.*` dictionary is added) would write into
    // the bundled dictionary itself, for every consumer of that import, for the life of the
    // process. Cheap insurance: these files are a few hundred keys.
    i18n.global.setLocaleMessage(locale, structuredClone(messages));

    /*
     * Then the enabled modules' dictionaries, on top.
     *
     * This is THE place the module contributions are installed, and it has to be, because
     * `setLocaleMessage` above REPLACES the locale wholesale. Every caller that installs a
     * locale's vocabulary comes through here — `_loadLocale` for a plain language switch, and
     * `localeChoice` → `updateLocale` for the router guard, which is the path the running app
     * actually takes on a first navigation. Merging in only one of them leaves the other
     * silently monolingual: the app renders the shared strings and every module's key as its own
     * name, and no unit test that stubs the i18n module notices.
     *
     * `mergeLocaleMessage` is a DEEP merge, which is what lets several modules each contribute a
     * slice of the shared `navigation` namespace without overwriting one another.
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
 * `fallbackLocale` can only fall back to messages that are actually REGISTERED. Loading a locale
 * never loads anything else, so a user who lands directly on `/es/...` had only `es` — and for a
 * language this app has no UI dictionary for, that meant every UI key rendered as its own raw
 * identifier (`products-list-page.page-title`) instead of the English copy. "Degrades per key
 * rather than all-or-nothing" is not free; this is what pays for it.
 *
 * Never rejects: a missing fallback dictionary is a worse-looking page, not a broken navigation.
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
 * Switches the active language, loading its vocabulary first when missing, and
 * keeps the `<html lang>` attribute in sync.
 *
 * @param i18n - The vue-i18n instance to switch.
 * @param locale - Locale code to activate, e.g. `en`.
 * @returns A promise resolving once the locale is active and Vue has flushed.
 */
export function _changeLanguage(i18n: I18n, locale: string): Promise<unknown> {
    const setLocale = () => {
        (i18n.global.locale as WritableComputedRef<string>).value = locale;

        /**
         * NOTE:
         * If you need to specify the language setting for headers
         * such as the `fetch` API, set it here (and it's not defined in other ways).
         *
         * The following is an example for axios.
         * axios.defaults.headers.common['Accept-Language'] = locale
         */
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
 * @returns The browser language when supported, otherwise the configured
 *  fallback locale, `VITE_APP_DEFAULT_LOCALE`, or `'en'` as a last resort.
 */
export function getDefaultLocale() {
    const foundLocale = navigator.language.slice(0, 2);
    // Must check supported (not loaded) languages: on first visit nothing is
    // loaded yet, and browser-language detection would otherwise never match.
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
 * The two repos are independent: neither may author the other's strings, and either boilerplate
 * has to work against a different counterpart. So the API's dictionary is never merged at the
 * root, where two independently-authored key spaces would eventually collide silently — it goes
 * under `api.*`, which this app must never author by hand. `tests/unit/utils/i18n.spec.ts`
 * enforces that.
 */
export const API_NAMESPACE = 'api';

/**
 * Copy that belongs to the API, with a local stand-in for when the API's dictionary is not there.
 *
 * In normal operation this is never needed: the API resolves its own keys and puts finished text
 * on the wire, and the client prints what arrives. It matters for the handful of messages the
 * client has to produce ITSELF because no response came back at all — a 401 with an empty body, a
 * network failure, a proxy's bare 502.
 *
 * Which is exactly why it cannot depend on the fetched dictionary: the request that would have
 * downloaded it may have failed for the same reason. So the local key is the guarantee and the
 * API's own wording is the upgrade, used only once `api.*` is actually loaded.
 *
 * @param apiKey - Key inside the API's dictionary, WITHOUT the `api.` prefix, e.g.
 *  `generic.error-unknown`.
 * @param localKey - Key in this app's own dictionary, used whenever `api.*` cannot answer.
 * @returns The best available translation, in the active locale.
 */
export const apiText = (apiKey: string, localKey: string): string => {
    const namespacedKey = `${API_NAMESPACE}.${apiKey}`;
    return i18n.global.te(namespacedKey) ? i18n.global.t(namespacedKey) : i18n.global.t(localKey);
};

/**
 * Prefixes a path with a locale segment, unless it already starts with a
 * supported one.
 *
 * @param path - Absolute or relative path, e.g. `/products` or `products`.
 * @param locale - Locale code to prepend, e.g. `en`.
 * @returns The normalized, locale-prefixed path, e.g. `/en/products`.
 */
function prefixLocalePath(path: string, locale: string) {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const firstSegment = normalized.split('/')[1];
    return supportedLanguages.includes(firstSegment) ? normalized : `/${locale}${normalized}`;
}

/**
 * Rewrites a router location so it carries the current locale.
 *
 * WARNING: vue-router ignores `params` whenever `path` is present, so
 * path-based locations must have the locale prefixed onto the path itself
 * (a bare `/products` would otherwise match `/:locale` with locale="products").
 *
 * @param to - Any router location: a path string, a `path`-based object, or a
 *  named location.
 * @returns The same location with the locale injected — into the path for
 *  string/`path` forms, into `params.locale` for named ones. An explicit
 *  `params.locale` on the input wins.
 */
export function routerLinkI18n(to: RouteLocationRaw): RouteLocationRaw {
    const locale = getCurrentLocale();
    // Path forms carry the locale in the URL; a bare `/products` would bind `:locale` to "products".
    if (typeof to === 'string') return prefixLocalePath(to, locale);
    if ('path' in to && typeof to.path === 'string')
        return {
            ...to,
            path: prefixLocalePath(to.path, locale)
        };
    // Named form: spread the caller's params last so an explicit `locale` wins over the current one.
    return {
        ...to,
        params: {
            locale,
            ...(to as RouteLocationNamedRaw).params
        }
    };
}
