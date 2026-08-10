import { z } from 'zod';
import { i18n } from '@/utils/i18n.ts';
import { createProductBodyPriceMin } from '@api/schemas';

/**
 * Validation schemas for the product forms.
 * Messages are thunks resolved at parse time — see `@/features/users/schemas.ts` for why.
 */
const t = (key: string) => i18n.global.t(key);

/**
 * Validation schema for a product title, rejecting empty titles.
 */
export const productsTitleSchema = z
    .string()
    .min(1, { error: () => t('products-form.title-required') });

/**
 * Validation schema for a product price, enforcing the minimum declared by the API contract.
 */
export const productsPriceSchema = z
    .number()
    .min(createProductBodyPriceMin, { error: () => t('products-form.price-min') });

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
