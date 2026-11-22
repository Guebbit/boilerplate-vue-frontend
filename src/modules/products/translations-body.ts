/**
 * @module
 * The form ↔ wire step for a product's words. The form keeps ONE map, a tab per language with the
 * default language first; the API splits it: the default language is the product's own top-level
 * `title`/`description`, and `translations` holds the other languages only. The contract refuses
 * `''` everywhere, so what matters is the one place a blank field is spelt differently: left out on
 * a create, `null` on a PATCH (RFC 7396 — the only way to clear a field).
 */
import type {
    ProductTranslationFields,
    ProductTranslationsPatch,
    ProductTranslationsWrite
} from '@types';

/**
 * Whether a description field holds nothing worth sending.
 *
 * @param description - The form field's value.
 * @returns `true` for an absent, empty or whitespace-only description.
 */
const isBlank = (description: string | undefined): boolean =>
    description === undefined || description.trim() === '';

/**
 * The form's map for a loaded product: its stored default-language text under the default tag,
 * beside the other languages' rows.
 *
 * @param source - The product's `source`: the stored default-language text.
 * @param translations - The product's `translations`: the other languages.
 * @param fallbackLocale - The default language's tag.
 * @returns One slot per language, the shape the form's tabs bind to.
 */
export const toFormTranslations = (
    source: ProductTranslationFields | undefined,
    translations: Record<string, ProductTranslationFields> | undefined,
    fallbackLocale: string
): ProductTranslationsWrite => ({
    ...(source ? { [fallbackLocale]: source } : {}),
    ...translations
});

/**
 * The default language's slot, as the top-level fields the write body takes.
 *
 * @param translations - The form's per-locale entries.
 * @param fallbackLocale - The default language's tag.
 * @returns The default slot's title and description, the title `''` when the slot is missing.
 */
const defaultFields = (translations: ProductTranslationsWrite, fallbackLocale: string) => {
    const entry = translations[fallbackLocale];
    return { title: entry?.title ?? '', description: entry?.description };
};

/**
 * The `POST /products` words: the default language at the top level, the others as `translations`.
 * A blank description is left out, since there is nothing to clear on a product that does not exist
 * yet, and a `null` locale is dropped: a locale that does not exist yet has nothing to delete.
 *
 * @param translations - The form's per-locale entries.
 * @param fallbackLocale - The default language's tag.
 * @returns `title`, `description` when stated, and `translations` for the other languages.
 */
export const toCreateFields = (translations: ProductTranslationsWrite, fallbackLocale: string) => {
    const { title, description } = defaultFields(translations, fallbackLocale);
    return {
        title,
        ...(isBlank(description) ? {} : { description }),
        translations: Object.fromEntries(
            Object.entries(translations).flatMap(([locale, entry]) =>
                locale === fallbackLocale || entry === null
                    ? []
                    : [
                          [
                              locale,
                              {
                                  title: entry.title,
                                  ...(isBlank(entry.description)
                                      ? {}
                                      : { description: entry.description })
                              }
                          ]
                      ]
            )
        )
    };
};

/**
 * The `PATCH /products/{id}` words (RFC 7396 one level down): a blank description becomes `null` —
 * the one way to clear it — and a locale marked `null` stays `null`, which deletes it.
 *
 * @param translations - The form's per-locale entries.
 * @param fallbackLocale - The default language's tag.
 * @returns `title` and `description` for the default language, `translations` for the others.
 */
export const toPatchFields = (translations: ProductTranslationsWrite, fallbackLocale: string) => {
    const { title, description } = defaultFields(translations, fallbackLocale);
    const others: ProductTranslationsPatch = Object.fromEntries(
        Object.entries(translations)
            .filter(([locale]) => locale !== fallbackLocale)
            .map(([locale, entry]) => [
                locale,
                entry === null
                    ? null
                    : {
                          title: entry.title,
                          description: isBlank(entry.description) ? null : entry.description
                      }
            ])
    );
    return { title, description: isBlank(description) ? null : description, translations: others };
};
