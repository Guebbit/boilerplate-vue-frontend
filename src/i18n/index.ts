/**
 * @module
 * Core i18n runtime: which languages exist, which are loaded, and the load/activate/merge
 * pipeline every locale switch funnels through. Bundled dictionaries are code-split per locale.
 *
 * Self-contained by design: everything under `src/i18n/` is meant to be lifted out into
 * its own package with minimal further work, so it knows nothing about this app — no module, no
 * Pinia, no generated API client. `src/infrastructure/locale-overrides.ts` layers the
 * contract-specific, API-stored overrides on top at the edges (main.ts, the router guard); that
 * loader stays in this app because it depends on `@api`, which this package cannot.
 */

import { nextTick, type WritableComputedRef } from 'vue';
import { createI18n, type I18n } from 'vue-i18n';
import { mergeWith } from 'lodash-es';

/**
 * The two locale defaults a container may override after the image is built.
 *
 * Read straight from `window.__APP_CONFIG` — the same global `@/infrastructure/runtime-config`
 * populates — rather than importing that module: this package is meant to be lifted out of the
 * app whole, and that module's other keys (`API_URL`, `FARO_*`, `UMAMI_*`, …) are none of this
 * file's business. Duplicating its two-line read is what keeps `src/i18n` from reaching into the
 * rest of the app for a dependency that only exists because it currently lives inside it.
 */
interface I18nRuntimeConfig {
    APP_DEFAULT_LOCALE?: string;
    APP_FALLBACK_LOCALE?: string;
}

/**
 * Reads one of {@link I18nRuntimeConfig}'s keys, trimmed, `undefined` when unset or blank — same
 * contract as `@/infrastructure/runtime-config`'s `runtimeValue`, kept local; see there.
 *
 * @param name - The config key to read.
 * @returns The trimmed value, or `undefined` when `config.js` never loaded or left it unset.
 */
function runtimeLocaleValue(name: keyof I18nRuntimeConfig): string | undefined {
    const value = (globalThis as { __APP_CONFIG?: I18nRuntimeConfig }).__APP_CONFIG?.[name];
    const trimmed = value?.trim();
    return trimmed || undefined;
}

/**
 * Shape of one locale's message tree: nested groups of strings, with array leaves for the static
 * pages' paragraph/FAQ lists (rendered via vue-i18n's `tm()`/`rt()`).
 */
export interface TranslationDictionaries {
    /*
     * Arrays are legitimate vue-i18n messages — `tm()` + `rt()` render them — and the static
     * pages use them for their paragraph and FAQ lists. Without the array arms, any dictionary
     * carrying one stops overlapping this type and every cast of a locale JSON fails to build.
     */
    [key: string]: string | string[] | TranslationDictionaries | TranslationDictionaries[];
}

/**
 * Minimal translate signature compatible with vue-i18n's `t` — the type `translate` below is
 * annotated with.
 *
 * `named` carries interpolation values, e.g. `t('image-upload-form.size-exceeded', { size: '5 MB' })`.
 */
type TranslateFunction = (key: string, named?: Record<string, unknown>) => string;

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
 * Languages this app offers, loaded or not.
 *
 * Starts as the folder — what this build can render with no network at all, which is the floor
 * every other tier sits on — and is EXTENDED AT BOOT by `mergeRemoteLocales`, which adds whatever
 * the API says it offers. A language added by a translator therefore appears in the switcher
 * without a frontend deploy.
 *
 * Deliberately no env list: naming a language in `.env` would claim it is supported without
 * supplying anything able to render it — the folder knows what shipped and the API knows what
 * has been translated, and a third list could only disagree with both.
 *
 * Mutable, because `mergeRemoteLocales` pushes onto it: a dozen modules import this binding by
 * value, and reassigning it would leave them all on the boot-time list.
 */
export const supportedLanguages = [...bundledLocales];

/**
 * [on build] Languages already fetched.
 */
export const loadedLanguages: string[] = [];

/**
 * Writing direction per language tag, as the API's manifest reports it.
 *
 * Filled by `mergeRemoteLocales` at boot; empty offline, and every bundled language is
 * left-to-right, so a tag missing here is `ltr`. Read by {@link _changeLanguage} to set
 * `<html dir>`: a right-to-left language laid out left-to-right is unreadable, and the attribute
 * is the one switch the whole page follows.
 */
export const localeDirections: Record<string, 'ltr' | 'rtl'> = {};

/**
 * A language's own name for itself, as the API's manifest reports it — "Español", not "Spanish".
 *
 * Filled by `mergeRemoteLocales` at boot, same as {@link localeDirections}; empty offline, and for
 * a language the manifest has not been fetched for yet. `AppLanguageSwitcher.vue` reads it so a
 * language this build has no translated `generic.*` entry for — one the API added at runtime —
 * shows its own name rather than the raw dictionary key.
 */
export const localeNativeNames: Record<string, string> = {};

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

/**
 * The app-wide vue-i18n instance every locale function below binds itself to.
 */
export const i18n = createI18n({
    // MUST be false to use the composition API.
    legacy: false,
    locale:
        runtimeLocaleValue('APP_DEFAULT_LOCALE') || import.meta.env.VITE_APP_DEFAULT_LOCALE || 'en',
    fallbackLocale:
        runtimeLocaleValue('APP_FALLBACK_LOCALE') ||
        import.meta.env.VITE_APP_FALLBACK_LOCALE ||
        'en',
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
 * Deep merge with the same rule vue-i18n's `mergeLocaleMessage` applies: nested groups combine,
 * anything else is a leaf the later dictionary replaces — arrays included, since a translated
 * list is edited whole or not at all and merging two arrays by index would produce a sentence
 * half in each language. `mergeWith`'s default behaviour already does the rest (deep-merge plain
 * objects, overwrite everything else) once arrays are excluded from it.
 *
 * Neither argument is mutated — `mergeWith` writes into its first argument, so that argument is a
 * clone.
 */
export const mergeDictionaries = (
    base: TranslationDictionaries,
    extra: TranslationDictionaries
): TranslationDictionaries =>
    mergeWith(structuredClone(base), extra, (_target, source) =>
        Array.isArray(source) ? source : undefined
    );

/**
 * One language's BUNDLED dictionary — the shared file plus every enabled module's slice — as a
 * plain object, without touching the running instance.
 *
 * What {@link _updateLocale} installs, read back as data: the translation admin needs the baseline
 * a stored override sits on top of, for a language the visitor is NOT reading, and switching the
 * whole app to Spanish to find out what `cart.title` says there is not an option.
 *
 * Resolves with an empty dictionary for a language this build does not ship: that is the normal
 * state of a language added through the admin, not an error.
 *
 * @param locale - Locale code, e.g. `it`.
 * @returns A promise resolving with the merged bundled dictionary. Never rejects.
 */
export function loadBundledDictionary(locale: string): Promise<TranslationDictionaries> {
    if (!supportedLanguages.includes(locale)) return Promise.resolve({});
    return Promise.all([
        // Stryker disable next-line StringLiteral: see `_loadLocale` for why this literal is exempt.
        import(/* webpackChunkName: "locale-[request]" */ `@/locales/${locale}.json`)
            .then((file: { default: TranslationDictionaries }) => file.default)
            .catch((): TranslationDictionaries => ({})),
        Promise.all((moduleLocaleLoaders[locale] ?? []).map((load) => load()))
    ]).then(([shared, moduleDictionaries]) => {
        let merged = structuredClone(shared);
        for (const dictionary of moduleDictionaries) merged = mergeDictionaries(merged, dictionary);
        return merged;
    });
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
 * `setLocaleMessage` REPLACES the locale wholesale, and every install path funnels through this
 * function (`_loadLocale` for a language switch, `localeChoice` → `updateLocale` for the router
 * guard, the translation admin's live refresh) — so the enabled modules' own dictionaries are
 * folded in here too, as the BASE `messages` sits on top of. A caller that forgot to include them
 * (an override fetch, a bare shared-file import) still gets a fully-populated locale rather than a
 * silently monolingual one.
 *
 * `messages` sits on top, not the modules, on purpose: an edited key — the shared file over a
 * module's own default, or a stored override over either — must win over the module's bundled
 * text. Merging modules in AFTER `messages` (the previous order) let a module key silently beat
 * whatever the caller had just registered for it, which is why an edited translation could lose to
 * bundled copy for most of this app's keys.
 *
 * @param i18n - The vue-i18n instance to register the messages on.
 * @param locale - Locale code the messages belong to.
 * @param messages - Nested translation dictionary for that locale, wins over the modules' own.
 * @returns A promise (`nextTick`) resolving once Vue has flushed the update.
 */
export function _updateLocale(i18n: I18n, locale: string, messages: TranslationDictionaries) {
    if (!loadedLanguages.includes(locale)) loadedLanguages.push(locale);

    // `mergeDictionaries` is a DEEP merge, which is what lets several modules each contribute a
    // slice of the shared `navigation` namespace, and what keeps an override from wiping the rest
    // of the group it edits one key of.
    return Promise.all((moduleLocaleLoaders[locale] ?? []).map((load) => load())).then(
        (moduleDictionaries) => {
            let merged: TranslationDictionaries = {};
            for (const dictionary of moduleDictionaries)
                merged = mergeDictionaries(merged, dictionary);
            merged = mergeDictionaries(merged, messages);

            // Cloned, not registered by reference: `_loadLocale` passes the imported `en.json`
            // module object straight through, and writing it by reference would translate the
            // bundle itself for every other consumer of that import, for the life of the process.
            i18n.global.setLocaleMessage(locale, structuredClone(merged));
            return nextTick();
        }
    );
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
            .catch(() => undefined)
    );
}

/**
 * Keeps `<html lang>` and `<html dir>` in sync with the active locale.
 *
 * A right-to-left language laid out left-to-right is unreadable, and `dir` is the one switch the
 * whole page follows.
 *
 * @param locale - Locale code now active, e.g. `en`.
 * @param direction - Writing direction for that locale.
 */
function applyHtmlLocaleAttributes(locale: string, direction: 'ltr' | 'rtl'): void {
    const html = document.querySelector('html');
    html?.setAttribute('lang', locale);
    html?.setAttribute('dir', direction);
}

/**
 * Switches the active language, loading its vocabulary first when missing, and keeps
 * `<html lang>` and `<html dir>` in sync.
 *
 * @param i18n - The vue-i18n instance to switch.
 * @param locale - Locale code to activate, e.g. `en`.
 * @returns A promise resolving once the locale is active and Vue has flushed.
 */
export function _changeLanguage(i18n: I18n, locale: string): Promise<unknown> {
    const setLocale = () => {
        (i18n.global.locale as WritableComputedRef<string>).value = locale;
        applyHtmlLocaleAttributes(locale, localeDirections[locale] ?? 'ltr');
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
 * @returns The browser language when supported, otherwise the configured default locale
 *  (`APP_DEFAULT_LOCALE` at runtime, `VITE_APP_DEFAULT_LOCALE` at build time — the same
 *  precedence {@link i18n}'s own `locale` option uses), the i18n instance's fallback locale, or
 *  `'en'`.
 */
export function getDefaultLocale() {
    const foundLocale = navigator.language.slice(0, 2);
    // Supported, not loaded: on a first visit nothing is loaded and detection would never match.
    if (supportedLanguages.includes(foundLocale)) return foundLocale;
    // The configured default is checked BEFORE the instance's fallback locale, not after: the
    // fallback is never empty (it defaults to 'en' too), so checking it first made the configured
    // default unreachable — `VITE_APP_DEFAULT_LOCALE` had no effect on a visitor with an
    // unsupported browser language, regardless of what a deployment set it to.
    return (
        runtimeLocaleValue('APP_DEFAULT_LOCALE') ||
        import.meta.env.VITE_APP_DEFAULT_LOCALE ||
        (i18n.global.fallbackLocale as WritableComputedRef<string>).value
    );
}

/**
 * Reads the locale currently active on the app-wide {@link i18n} instance.
 *
 * @returns The active locale code, e.g. `en`.
 */
export const getCurrentLocale = () => i18n.global.locale.value;

/*
 * There is no `api.*` namespace.
 *
 * The API resolves its own keys and puts finished text on the wire, so a response arrives already
 * translated and nothing here looks it up. The one case that needs this app's own words — no
 * response at all, a 401 with an empty body, a bare 502 — is answered by `api-errors.*` in the
 * dictionaries, translatable for EVERY language, including the ones this build does not bundle,
 * because `locale-overrides.ts` fetches them. Reserving a root for the backend's keyspace would
 * buy nothing over that, and would cost a namespace nobody here could author under.
 */
