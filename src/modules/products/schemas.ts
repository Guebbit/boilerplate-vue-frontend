/**
 * @module
 * Zod schemas for the product create/edit forms, built from the API contract's own constraints
 * (e.g. the price minimum) so the form cannot validate more loosely than the server.
 *
 * `title`/`description` stopped being flat fields once the write body moved to a `translations`
 * map, one slot per locale. `productTranslationsSchema` validates that map with `z.record`, so a
 * failing title's Zod issue path is `['translations', <locale>, 'title']` rather than the single
 * flat `'title'` the old schema produced. That locale-shaped path is deliberate:
 * `ProductCreate.vue`/`ProductEdit.vue` group `safeParse(...).error.issues` by `path[1]` to know
 * which language tab owes an error badge.
 */
import { z } from 'zod';
import { translate } from '@/infrastructure/i18n';
import { createProductBodyPriceMin } from '@api/schemas';

/**
 * Validation schemas for the product forms.
 * Messages are thunks resolved at parse time — see {@link translate} for why.
 */

/**
 * Validation schema for a product title, rejecting empty titles.
 */
const productsTitleSchema = z
    .string()
    .min(1, { error: () => translate('products-form.title-required') });

/**
 * Validation schema for a product price, enforcing the minimum declared by the API contract.
 */
const productsPriceSchema = z
    .number()
    .min(createProductBodyPriceMin, { error: () => translate('products-form.price-min') });

/**
 * One locale's product copy: a non-empty title and an optional description — the same shape
 * `POST /products`/`PATCH /products/{id}` calls `ProductTranslationFields`. Applied to every
 * locale the form has a tab open for, via {@link productTranslationsSchema} below.
 */
const productTranslationFieldsSchema = z.object({
    title: productsTitleSchema,
    // `.optional()`, not `.nullish()`: the write contract's `ProductTranslationFields.description`
    // has no `null` arm — omitting the key is how the field stays unset.
    description: z.string().optional()
});

/**
 * One locale slot in the write body: an object to upsert that language, or `null` to delete it —
 * one of three signals the API's write contract defines (a key absent from the map entirely is
 * the third meaning, "leave alone", and needs no schema arm of its own).
 *
 * `null` bypasses the title/description rules on purpose: a language being removed has nothing
 * left to validate.
 */
const productTranslationSlotSchema = productTranslationFieldsSchema.nullable();

/**
 * Every locale the form currently has a tab for, keyed by BCP 47 tag.
 *
 * `z.record` walks every key present in the parsed value — never more, never fewer — so a locale
 * the form never opened contributes no issues, and one it did contribute issues at
 * `['translations', <that locale>, ...]` exactly as the API's own error pointer would.
 */
export const productTranslationsSchema = z.record(z.string(), productTranslationSlotSchema);

/**
 * Validation schema of a whole product form: price required, `translations` validated per locale,
 * everything else optional/nullable.
 */
export const productsSchema = z.object({
    id: z.string().nullish(),
    price: productsPriceSchema,
    active: z.boolean().nullish(),
    requiresShipping: z.boolean().nullish(),
    onHand: z.number().nullish(),
    categories: z.array(z.string()).nullish(),
    tags: z.array(z.string()).nullish(),
    imageUrl: z.string().nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish(),
    translations: productTranslationsSchema
});
