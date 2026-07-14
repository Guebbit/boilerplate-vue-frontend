import { z } from 'zod';
import type { TranslateFunction } from '@/utils/i18n.ts';
import { createProductBodyPriceMin } from '@api/schemas';

/**
 * Zod schema for product title
 */
export const createProductsTitleSchema = (t: TranslateFunction) =>
    z.string().min(1, t('products-form.title-required'));

/**
 * Zod schema for product price
 */
export const createProductsPriceSchema = (t: TranslateFunction) =>
    z.number().min(createProductBodyPriceMin, t('products-form.price-min'));

/**
 * Product schema
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
