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
import { getLocales } from '@api';
import type { LocaleCapability } from '@types';

/**
 * Fetches and holds the locales a product's translations may target.
 */
export const useActiveLocales = () => {
    /**
     * Every active locale, tag/nativeName/direction — what
     * `ProductTranslationTabs`'s `locales` prop renders.
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
     * @returns A promise resolving once `locales`/`fallbackLocale` are populated. Never rejects —
     *  a form with no locale list yet simply shows no tabs, which the caller renders as loading.
     */
    const fetchActiveLocales = () => {
        loading.value = true;
        return getLocales()
            .then((response) => {
                locales.value = response.data.locales.filter((locale) => locale.active);
                fallbackLocale.value = response.data.fallback;
            })
            .catch(() => undefined)
            .finally(() => {
                loading.value = false;
            });
    };

    return { locales, fallbackLocale, loading, fetchActiveLocales };
};
