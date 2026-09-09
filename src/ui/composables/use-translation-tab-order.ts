/**
 * @module
 * The "which language tabs are open, fallback first" derivation every per-locale translation
 * screen needs — `ProductCreate.vue`, `ProductEdit.vue` and `EntityTranslations.vue` each read a
 * DIFFERENT record (`form.translations`, `drafts`) but want the same ordering: every present,
 * non-`null` key, with the fallback tag moved to the front IF it is already one of them. A
 * fallback with no entry yet is never manufactured here — a screen that wants an always-open
 * fallback tab seeds the record itself (see `ProductCreate.vue`'s `watch(fallbackLocale, ...)`),
 * which is what keeps an independent locale fetch racing ahead of the entity's own data from
 * ever producing a tab with nothing behind it.
 */
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';

/**
 * Open tab order for a per-locale record: present, non-`null` keys, fallback moved first when it
 * is already one of them.
 *
 * @param translations - The per-locale record (a `Ref`, a getter, or a plain value) — an entry
 *  maps a locale tag to its content, or to `null` for a tab marked for removal.
 * @param fallbackTag - The deployment's fallback locale tag, once known.
 * @returns A computed list of open locale tags, fallback first.
 */
export const useTranslationTabOrder = (
    translations: MaybeRefOrGetter<Record<string, unknown>>,
    fallbackTag: MaybeRefOrGetter<string | undefined>
): ComputedRef<string[]> =>
    computed(() => {
        const record = toValue(translations);
        const fallback = toValue(fallbackTag);
        const tags = Object.keys(record).filter((tag) => record[tag] !== null);
        return fallback && tags.includes(fallback)
            ? [fallback, ...tags.filter((tag) => tag !== fallback)]
            : tags;
    });
