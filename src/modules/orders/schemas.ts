import { z } from 'zod';
import { translate } from '@/infrastructure/i18n';
import { OrderStatus } from '@types';

/**
 * Validation schemas for the order forms.
 * Messages are thunks resolved at parse time — see {@link translate} for why.
 */

/**
 * Validation schema for an order status.
 */
export const ordersStatusSchema = z.enum(OrderStatus, {
    error: () => translate('orders-form.status-invalid')
});

/**
 * Validation schema of a whole order form. Every field is optional/nullable, since these forms
 * are also used for partial updates.
 */
export const ordersSchema = z.object({
    id: z.string().nullish(),
    userId: z.string().nullish(),
    email: z.email({ error: () => translate('orders-form.email-invalid') }).nullish(),
    status: ordersStatusSchema.nullish(),
    total: z.number().nullish(),
    notes: z.string().nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish()
});
