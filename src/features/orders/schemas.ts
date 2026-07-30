import { z } from 'zod';
import type { TranslateFunction } from '@/utils/i18n.ts';
import { OrderStatus } from '@types';

/**
 * Builds the validation schema for an order status.
 *
 * @param t - Translate function used to localize the error messages.
 * @returns A Zod enum accepting the `OrderStatus` values.
 */
export const createOrderStatusSchema = (t: TranslateFunction) =>
    z.enum(OrderStatus, {
        message: t('orders-form.status-invalid')
    });

/**
 * Builds the validation schema of a whole order form.
 *
 * @param t - Translate function used to localize the error messages.
 * @returns A Zod object schema where every field is optional/nullable, since
 *  forms are also used for partial updates.
 */
export const createOrderSchema = (t: TranslateFunction) =>
    z.object({
        id: z.string().nullish(),
        userId: z.string().nullish(),
        email: z.email(t('orders-form.email-invalid')).nullish(),
        status: createOrderStatusSchema(t).nullish(),
        total: z.number().nullish(),
        notes: z.string().nullish(),
        createdAt: z.string().nullish(),
        updatedAt: z.string().nullish()
    });
