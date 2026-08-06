import { z } from 'zod';
import { i18n } from '@/utils/i18n.ts';
import { OrderStatus } from '@types';

/**
 * Validation schemas for the order forms.
 * Messages are thunks resolved at parse time — see `@/features/users/schemas.ts` for why.
 */
const t = (key: string) => i18n.global.t(key);

/**
 * Validation schema for an order status.
 */
export const orderStatusSchema = z.enum(OrderStatus, {
    error: () => t('orders-form.status-invalid')
});

/**
 * Validation schema of a whole order form. Every field is optional/nullable, since these forms
 * are also used for partial updates.
 */
export const orderSchema = z.object({
    id: z.string().nullish(),
    userId: z.string().nullish(),
    email: z.email({ error: () => t('orders-form.email-invalid') }).nullish(),
    status: orderStatusSchema.nullish(),
    total: z.number().nullish(),
    notes: z.string().nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish()
});
