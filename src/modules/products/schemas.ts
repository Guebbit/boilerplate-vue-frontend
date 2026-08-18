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
export const productsTitleSchema = z
    .string()
    .min(1, { error: () => translate('products-form.title-required') });

/**
 * Validation schema for a product price, enforcing the minimum declared by the API contract.
 */
export const productsPriceSchema = z
    .number()
    .min(createProductBodyPriceMin, { error: () => translate('products-form.price-min') });

/**
 * Validation schema of a whole product form: title and price required, everything else
 * optional/nullable.
 */
export const productsSchema = z.object({
    id: z.string().nullish(),
    title: productsTitleSchema,
    price: productsPriceSchema,
    description: z.string().nullish(),
    active: z.boolean().nullish(),
    imageUrl: z.string().nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish()
});
