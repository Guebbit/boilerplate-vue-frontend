/**
 * @module
 * Turns the product form's per-locale fields into the write body the contract accepts. A blank
 * form field is `''`, which the contract refuses everywhere (`minLength: 1`) — a cleared field is
 * `null`, on a PATCH only, and a create simply leaves an empty field out.
 */
import type { ProductTranslationsPatch, ProductTranslationsWrite } from '@types';

/**
 * Whether a description field holds nothing worth sending.
 *
 * @param description - The form field's value.
 * @returns `true` for an absent, empty or whitespace-only description.
 */
const isBlank = (description: string | undefined): boolean =>
    description === undefined || description.trim() === '';

/**
 * The `POST /products` body: a locale's blank description is left out, since there is nothing to
 * clear on a product that does not exist yet.
 *
 * @param translations - The form's per-locale entries.
 * @returns The same locales, each carrying a description only when it has one.
 */
export const toCreateTranslations = (
    translations: ProductTranslationsWrite
): ProductTranslationsWrite =>
    Object.fromEntries(
        Object.entries(translations).flatMap(([locale, entry]) =>
            entry === null
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
    );

/**
 * The `PATCH /products/{id}` body (RFC 7396 one level down): a locale's blank description becomes
 * `null` — the one way to clear it — and a locale marked `null` stays `null`, which deletes it.
 *
 * @param translations - The form's per-locale entries.
 * @returns The same locales, with every cleared description spelt `null`.
 */
export const toPatchTranslations = (
    translations: ProductTranslationsWrite
): ProductTranslationsPatch =>
    Object.fromEntries(
        Object.entries(translations).map(([locale, entry]) => [
            locale,
            entry === null
                ? null
                : {
                      title: entry.title,
                      description: isBlank(entry.description) ? null : entry.description
                  }
        ])
    );
