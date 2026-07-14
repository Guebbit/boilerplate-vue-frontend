import { z } from 'zod';
import type { TranslateFunction } from '@/utils/i18n.ts';
import { OrderStatus } from '@types';

/**
 * Zod schema for order status
 */
export const createOrderStatusSchema = (t: TranslateFunction) =>
    z.enum(OrderStatus, {
        message: t('orders-form.status-invalid')
    });

/**
 * Order schema
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
