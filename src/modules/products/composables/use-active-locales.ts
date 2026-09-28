/**
 * @module
 * The active-locale list a product form needs for its language tabs: every locale
 * `GET /locales` reports `active`, plus the deployment's fallback tag.
 *
 * Calls `getLocales` from `@api` directly rather than reaching `useLocalesStore` — the `locales`
 * module publishes no barrel (no `src/modules/locales/index.ts`), on purpose, mirroring the
 * paired backend's own rule that `products` never imports `locales`. `@api` is infrastructure,
 * not a sibling module, so this stays inside the boundary the module graph already draws rather
 * than needing a new `MODULE_EDGES` entry.
 */
import { ref } from 'vue';
import { getLocales, LocaleDirection, LocaleSource } from '@api';
import { runtimeValue } from '@/infrastructure/runtime-config';
import type { LocaleCapability } from '@types';

/**
 * `GET /locales` is 404 once `locales` is uninstalled (LOCALES_OPTIONAL_0925) — the same
 * fallback-locale-only resolution `@/i18n`'s own `i18n` instance falls back to,
 * so the one tab this offers names the language the UI is actually rendered in.
 */
const configuredFallbackLocale = (): string =>
    runtimeValue('APP_FALLBACK_LOCALE') ?? import.meta.env.VITE_APP_FALLBACK_LOCALE ?? 'en';

/**
 * A single-tab manifest good enough for `TranslationTabs` to render a form with — everything a
 * real manifest row carries, filled with the least assuming values: this deployment can only
 * confirm the language exists (`@/i18n` has it bundled), not what tenants or rows
 * the (unreachable) `locales` collection would otherwise report.
 */
const fallbackOnlyManifest = (tag: string): LocaleCapability => ({
    tag,
    name: tag,
    nativeName: tag,
    direction: LocaleDirection.ltr,
    active: true,
    tenants: ['frontend'],
    source: LocaleSource.static,
    entryCount: 0,
    revision: 0
});

/**
 * Fetches and holds the locales a product's translations may target.
 */
export const useActiveLocales = () => {
    /**
     * Every active locale, tag/nativeName/direction — what
     * `TranslationTabs`'s `locales` prop renders.
     */
    const locales = ref<LocaleCapability[]>([]);

    /**
     * The deployment's fallback locale — the tab that is always present and never removable.
     */
    const fallbackLocale = ref<string>();

    /**
     * Whether the manifest fetch is in flight.
     */
    const loading = ref(false);

    /**
     * Loads the manifest and narrows it to what this composable exposes.
     *
     * A failed fetch (`locales` uninstalled, or genuinely unreachable) still leaves a WORKING
     * form: one tab, for the deployment's configured fallback language, rather than an empty
     * `locales`/`fallbackLocale` that leaves the caller's skeleton showing forever
     * (LOCALES_OPTIONAL_0925 step 6b).
     *
     * @returns A promise resolving once `locales`/`fallbackLocale` are populated. Never rejects.
     */
    const fetchActiveLocales = () => {
        loading.value = true;
        return getLocales()
            .then((response) => {
                locales.value = response.data.locales.filter((locale) => locale.active);
                fallbackLocale.value = response.data.fallback;
            })
            .catch(() => {
                const fallback = configuredFallbackLocale();
                locales.value = [fallbackOnlyManifest(fallback)];
                fallbackLocale.value = fallback;
            })
            .finally(() => {
                loading.value = false;
            });
    };

    return { locales, fallbackLocale, loading, fetchActiveLocales };
};
