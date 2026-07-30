import { z } from 'zod';
import type { TranslateFunction } from '@/utils/i18n.ts';
import { createProductBodyPriceMin } from '@api/schemas';

/**
 * Builds the validation schema for a product title.
 *
 * @param t - Translate function used to localize the error messages.
 * @returns A Zod string schema rejecting empty titles.
 */
export const createProductsTitleSchema = (t: TranslateFunction) =>
    z.string().min(1, t('products-form.title-required'));

/**
 * Builds the validation schema for a product price.
 *
 * @param t - Translate function used to localize the error messages.
 * @returns A Zod number schema enforcing the minimum price declared by the API
 *  contract.
 */
export const createProductsPriceSchema = (t: TranslateFunction) =>
    z.number().min(createProductBodyPriceMin, t('products-form.price-min'));

/**
 * Builds the validation schema of a whole product form.
 *
 * @param t - Translate function used to localize the error messages.
 * @returns A Zod object schema requiring title and price, everything else being
 *  optional/nullable.
 */
export const createProductsSchema = (t: TranslateFunction) =>
    z.object({
        id: z.string().nullish(),
        title: createProductsTitleSchema(t),
        price: createProductsPriceSchema(t),
        description: z.string().nullish(),
        active: z.boolean().nullish(),
        imageUrl: z.string().nullish(),
        createdAt: z.string().nullish(),
        updatedAt: z.string().nullish()
    });
